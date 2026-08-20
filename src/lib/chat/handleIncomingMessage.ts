import { getSupabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { looksLikePhoneNumber, onlyDigits } from '@/lib/chat/conversationIdentity';

export interface IncomingMessageData {
  platform: 'whatsapp' | 'telegram' | 'email';
  message: string;
  contact: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  timestamp?: Date;
  metadata?: Record<string, any>;
  messageType?: 'text' | 'image' | 'audio' | 'video' | 'file';
  waMessageId?: string;
}

/**
 * Función central para manejar todos los mensajes entrantes
 * Normaliza el formato y guarda en la base de datos
 */
export async function handleIncomingMessage(data: IncomingMessageData) {
  try {
    console.log(`📥 Mensaje entrante de ${data.platform}:`, {
      contact: data.contact.id,
      message: String(data.message || '').substring(0, 100) + '...',
      timestamp: data.timestamp
    });

    const supabase = getSupabaseAdmin();
    const waMessageId = data.waMessageId ? String(data.waMessageId) : undefined;

    if (waMessageId) {
      const existing = await supabase
        .from('mensajes_conversacion')
        .select('id, conversacion_id')
        .eq('wa_message_id', waMessageId)
        .maybeSingle();
      if (existing.data?.id) {
        console.log('↩️ Mensaje duplicado (wa_message_id), se omite:', waMessageId);
        return { success: true, conversacionId: existing.data.conversacion_id, duplicate: true };
      }
    }

    // Normalizar el remitente según la plataforma
    const remitente = normalizeContactId(data.platform, data.contact);
    
    // 1. Buscar o crear conversación
    const remoteJid = String(data.metadata?.remote_jid || '');
    const rawPhone = data.metadata?.phone_number ? String(data.metadata.phone_number) : '';
    const lidDigits = remoteJid.includes('@lid') ? onlyDigits(remoteJid) : '';
    const phoneNumber = looksLikePhoneNumber(rawPhone) && (!lidDigits || onlyDigits(rawPhone) !== lidDigits)
      ? rawPhone
      : (data.platform === 'whatsapp' && looksLikePhoneNumber(remitente) && !remoteJid.includes('@lid')
        ? remitente
        : undefined);

    const conversacionId = await findOrCreateConversation(supabase, {
      remitente,
      platform: data.platform,
      timestamp: data.timestamp || new Date(),
      usuarioId: data.metadata?.userId,
      remoteJid: data.metadata?.remote_jid,
      phoneNumber,
      contactName: data.contact.name,
    });

    // 2. Guardar el mensaje
    const saved = await saveMessage(supabase, {
      conversacionId,
      content: data.message,
      sender: remitente,
      platform: data.platform,
      timestamp: data.timestamp || new Date(),
      messageType: data.messageType || 'text',
      waMessageId,
      metadata: {
        ...data.metadata,
        source: data.platform,
        contact_name: data.contact.name,
        contact_phone: data.contact.phone,
        contact_email: data.contact.email
      }
    });

    if (!saved) {
      console.log('↩️ Mensaje duplicado al insertar, se omite');
      return { success: true, conversacionId, duplicate: true };
    }

    await incrementUnread(supabase, conversacionId);

    console.log(`✅ Mensaje de ${data.platform} procesado correctamente`);
    
    // 3. Emitir evento para actualización en tiempo real
    await emitRealtimeUpdate(conversacionId, data.platform, data.metadata?.userId);

    return { success: true, conversacionId };
  } catch (error) {
    console.error(`❌ Error procesando mensaje de ${data.platform}:`, error);
    throw error;
  }
}

/**
 * Normalizar ID de contacto según la plataforma
 */
function normalizeContactId(platform: string, contact: any): string {
  switch (platform) {
    case 'whatsapp':
      // Para WhatsApp, usar el número de teléfono como ID
      return contact.phone || contact.id;
    case 'telegram':
      // Para Telegram, usar el ID de usuario
      return `telegram_${contact.id}`;
    case 'email':
      // Para email, usar la dirección de email
      return contact.email || contact.id;
    default:
      return contact.id;
  }
}

/**
 * Buscar o crear conversación
 */
async function findOrCreateConversation(supabase: any, data: {
  remitente: string;
  platform: string;
  timestamp: Date;
  usuarioId?: string;
  remoteJid?: string;
  phoneNumber?: string;
  contactName?: string;
}) {
  const remitente = data.phoneNumber || data.remitente;

  let existingConversation: { id: string; metadata?: Record<string, unknown>; fecha_mensaje?: string } | null = null;

  const byPhone = await supabase
    .from('conversaciones')
    .select('id, metadata, fecha_mensaje')
    .eq('remitente', remitente)
    .eq('servicio_origen', data.platform)
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .maybeSingle();

  existingConversation = byPhone.data;

  if (!existingConversation && data.remoteJid) {
    const byJid = await supabase
      .from('conversaciones')
      .select('id, metadata, fecha_mensaje')
      .eq('servicio_origen', data.platform)
      .filter('metadata->>remote_jid', 'eq', data.remoteJid)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();
    existingConversation = byJid.data;
  }

  if (!existingConversation && data.remoteJid && data.remoteJid.includes('@lid')) {
    const lidDigits = data.remoteJid.split('@')[0].split(':')[0];
    const byLid = await supabase
      .from('conversaciones')
      .select('id, metadata, fecha_mensaje')
      .eq('remitente', lidDigits)
      .eq('servicio_origen', data.platform)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();
    existingConversation = byLid.data;
  }

  if (existingConversation) {
    const nextMetadata = {
      ...(existingConversation.metadata || {}),
      ...(data.remoteJid ? { remote_jid: data.remoteJid } : {}),
      ...(data.phoneNumber ? { phone_number: data.phoneNumber } : {}),
      ...(data.contactName ? { contact_name: data.contactName } : {}),
    };
    const incomingTs = data.timestamp.toISOString();
    const existingTs = existingConversation.fecha_mensaje
      ? new Date(existingConversation.fecha_mensaje).getTime()
      : 0;
    const patch: Record<string, unknown> = {
      remitente,
      metadata: nextMetadata,
    };
    if (data.timestamp.getTime() >= existingTs) {
      patch.fecha_mensaje = incomingTs;
    }
    await supabase
      .from('conversaciones')
      .update(patch)
      .eq('id', existingConversation.id);
    
    return existingConversation.id;
  }

  // Crear nueva conversación
  const { data: newConversation, error } = await supabase
    .from('conversaciones')
    .insert({
      id: uuidv4(), // Generar UUID válido
      lead_id: null,
      servicio_origen: data.platform,
      tipo: 'entrante',
      remitente: data.phoneNumber || data.remitente,
      fecha_mensaje: data.timestamp.toISOString(),
      usuario_id: data.usuarioId || null,
      metadata: {
        platform: data.platform,
        created_at: new Date().toISOString(),
        ...(data.remoteJid ? { remote_jid: data.remoteJid } : {}),
        ...(data.phoneNumber ? { phone_number: data.phoneNumber } : {}),
        ...(data.contactName ? { contact_name: data.contactName } : {}),
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creando conversación:', error);
    throw error;
  }

  return newConversation.id;
}

/**
 * Guardar mensaje en la base de datos
 */
async function saveMessage(supabase: any, data: {
  conversacionId: string;
  content: string;
  sender: string;
  platform: string;
  timestamp: Date;
  messageType: string;
  metadata: Record<string, any>;
  waMessageId?: string;
}): Promise<boolean> {
  const from = new Date(data.timestamp.getTime() - 2000).toISOString();
  const to = new Date(data.timestamp.getTime() + 2000).toISOString();
  const similar = await supabase
    .from('mensajes_conversacion')
    .select('id')
    .eq('conversacion_id', data.conversacionId)
    .eq('contenido', data.content)
    .gte('fecha_mensaje', from)
    .lte('fecha_mensaje', to)
    .limit(1)
    .maybeSingle();
  if (similar.data?.id) {
    return false;
  }

  const { error } = await supabase
    .from('mensajes_conversacion')
    .insert({
      id: uuidv4(),
      conversacion_id: data.conversacionId,
      tipo: data.messageType,
      contenido: data.content,
      remitente: data.sender,
      fecha_mensaje: data.timestamp.toISOString(),
      canal: data.platform,
      metadata: data.metadata,
      usuario_id: null,
      ...(data.waMessageId ? { wa_message_id: data.waMessageId } : {}),
    });

  if (error) {
    if (error.code === '23505') {
      return false;
    }
    console.error('Error guardando mensaje:', error);
    throw error;
  }
  return true;
}

async function incrementUnread(supabase: any, conversacionId: string) {
  const current = await supabase
    .from('conversaciones')
    .select('unread_count')
    .eq('id', conversacionId)
    .maybeSingle();
  const next = (current.data?.unread_count ?? 0) + 1;
  const { error } = await supabase
    .from('conversaciones')
    .update({ unread_count: next })
    .eq('id', conversacionId);
  if (error) {
    console.warn('⚠️ No se pudo incrementar unread_count:', error);
  }
}

/**
 * Emitir actualización en tiempo real
 */
async function emitRealtimeUpdate(conversacionId: string, platform: string, userId?: string) {
  const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
  await notifyInboxRealtime(userId, { conversacionId, platform });
} 