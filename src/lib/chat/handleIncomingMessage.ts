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
      timestamp: data.timestamp || new Date()
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
    await emitRealtimeUpdate(conversacionId, data.platform);

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
}) {
  // Buscar conversación existente
  const { data: existingConversation } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('remitente', data.remitente)
    .eq('servicio_origen', data.platform)
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .single();

  if (existingConversation) {
    // Actualizar fecha del último mensaje
    await supabase
      .from('conversaciones')
      .update({ fecha_mensaje: data.timestamp.toISOString() })
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
      remitente: data.remitente,
      fecha_mensaje: data.timestamp.toISOString(),
      metadata: {
        platform: data.platform,
        created_at: new Date().toISOString()
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
async function emitRealtimeUpdate(conversacionId: string, platform: string) {
  try {
    // Aquí puedes implementar la lógica para emitir eventos en tiempo real
    // Por ejemplo, usando Supabase Realtime o WebSockets
    console.log(`🔄 Emitiendo actualización para conversación ${conversacionId} en ${platform}`);
  } catch (error) {
    console.error('Error emitiendo actualización en tiempo real:', error);
  }
} 