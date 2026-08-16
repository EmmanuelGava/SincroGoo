import { getSupabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

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
}

/**
 * Función central para manejar todos los mensajes entrantes
 * Normaliza el formato y guarda en la base de datos
 */
export async function handleIncomingMessage(data: IncomingMessageData) {
  try {
    console.log(`📥 Mensaje entrante de ${data.platform}:`, {
      contact: data.contact.id,
      message: data.message.substring(0, 100) + '...',
      timestamp: data.timestamp
    });

    const supabase = getSupabaseAdmin();
    
    // Normalizar el remitente según la plataforma
    const remitente = normalizeContactId(data.platform, data.contact);
    
    // 1. Buscar o crear conversación
    const conversacionId = await findOrCreateConversation(supabase, {
      remitente,
      platform: data.platform,
      timestamp: data.timestamp || new Date(),
      usuarioId: data.metadata?.userId,
      remoteJid: data.metadata?.remote_jid,
      phoneNumber: data.metadata?.phone_number || (data.platform === 'whatsapp' ? remitente : undefined),
    });

    // 2. Guardar el mensaje
    await saveMessage(supabase, {
      conversacionId,
      content: data.message,
      sender: remitente,
      platform: data.platform,
      timestamp: data.timestamp || new Date(),
      messageType: data.messageType || 'text',
      metadata: {
        ...data.metadata,
        source: data.platform,
        contact_name: data.contact.name,
        contact_phone: data.contact.phone,
        contact_email: data.contact.email
      }
    });

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
}) {
  const remitente = data.phoneNumber || data.remitente;

  let existingConversation: { id: string; metadata?: Record<string, unknown> } | null = null;

  const byPhone = await supabase
    .from('conversaciones')
    .select('id, metadata')
    .eq('remitente', remitente)
    .eq('servicio_origen', data.platform)
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .maybeSingle();

  existingConversation = byPhone.data;

  if (!existingConversation && data.remoteJid) {
    const byJid = await supabase
      .from('conversaciones')
      .select('id, metadata')
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
      .select('id, metadata')
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
    };
    await supabase
      .from('conversaciones')
      .update({
        remitente,
        fecha_mensaje: data.timestamp.toISOString(),
        metadata: nextMetadata,
      })
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
}) {
  const { error } = await supabase
    .from('mensajes_conversacion')
    .insert({
      id: uuidv4(), // Generar UUID válido
      conversacion_id: data.conversacionId,
      tipo: data.messageType,
      contenido: data.content,
      remitente: data.sender,
      fecha_mensaje: data.timestamp.toISOString(),
      canal: data.platform,
      metadata: data.metadata,
      usuario_id: null
    });

  if (error) {
    console.error('Error guardando mensaje:', error);
    throw error;
  }
}

/**
 * Emitir actualización en tiempo real
 */
async function emitRealtimeUpdate(conversacionId: string, platform: string, userId?: string) {
  const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
  await notifyInboxRealtime(userId, { conversacionId, platform });
} 