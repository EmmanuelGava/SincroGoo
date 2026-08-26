import { getSupabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { enqueueWhatsAppOutbox } from '@/lib/chat/outbox';

export interface SendMessageData {
  platform: 'whatsapp' | 'telegram' | 'email';
  to: string;
  message: string;
  messageType?: 'text' | 'image' | 'audio' | 'video' | 'file';
  filePath?: string;
  userId?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string | Date | null;
}

/**
 * Función central para enviar mensajes a cualquier plataforma
 * Detecta automáticamente si usar Lite o Business para WhatsApp
 */
export async function sendMessage(data: SendMessageData) {
  try {
    console.log(`📤 Enviando mensaje via ${data.platform}:`, {
      to: data.to,
      message: data.message.substring(0, 100) + '...',
      type: data.messageType
    });

    let success = false;
    let platformDetails = '';
    let error = null;
    let alreadySaved = false;
    let outboxId: string | undefined;
    let scheduled = false;

    // Enviar según la plataforma
    switch (data.platform) {
      case 'whatsapp': {
        console.log('📱 Procesando WhatsApp...');
        const queued = await enqueueWhatsAppOutgoing(data);
        success = queued.success;
        platformDetails = queued.platformDetails;
        error = queued.error;
        alreadySaved = queued.alreadySaved;
        outboxId = queued.outboxId;
        scheduled = Boolean(queued.scheduled);
        break;
      }
      
      case 'telegram': {
        console.log('📨 Procesando Telegram...');
        const telegramResult = await sendViaTelegram(data);
        success = telegramResult.success;
        platformDetails = telegramResult.platformDetails;
        error = telegramResult.error;
        break;
      }
      
      case 'email': {
        console.log('📧 Procesando Email...');
        const emailResult = await sendViaEmail(data);
        success = emailResult.success;
        platformDetails = emailResult.platformDetails;
        error = emailResult.error;
        break;
      }
      
      default:
        throw new Error(`Plataforma no soportada: ${data.platform}`);
    }

    if (success && !alreadySaved) {
      // Guardar mensaje saliente en la base de datos
      await saveOutgoingMessage(data, platformDetails);
      console.log(`✅ Mensaje enviado exitosamente via ${data.platform}`);
    } else if (success) {
      console.log(`✅ Mensaje enviado exitosamente via ${data.platform}`);
    }

    return { success, platformDetails, error, outboxId, scheduled };
  } catch (error) {
    console.error(`❌ Error enviando mensaje via ${data.platform}:`, error);
    throw error;
  }
}

async function resolveWhatsAppSendJid(data: SendMessageData): Promise<string> {
  const conversacionId = data.metadata?.conversacion_id;
  if (conversacionId) {
    const supabase = getSupabaseAdmin();
    const { data: conv } = await supabase
      .from('conversaciones')
      .select('remitente, metadata')
      .eq('id', conversacionId)
      .maybeSingle();
    const remote = conv?.metadata && typeof conv.metadata === 'object'
      ? (conv.metadata as { remote_jid?: string; phone_number?: string }).remote_jid
      : undefined;
    if (remote && remote.includes('@')) return remote;
    const phone = conv?.metadata && typeof conv.metadata === 'object'
      ? (conv.metadata as { phone_number?: string }).phone_number
      : undefined;
    if (phone) return `${String(phone).replace(/[^\d]/g, '')}@s.whatsapp.net`;
  }
  const trimmed = String(data.to || '').trim();
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed.replace(/[^\d]/g, '')}@s.whatsapp.net`;
}

async function enqueueWhatsAppOutgoing(data: SendMessageData): Promise<{
  success: boolean;
  platformDetails: string;
  error?: string;
  alreadySaved: boolean;
  outboxId?: string;
  scheduled?: boolean;
}> {
  const platformDetails = 'whatsapp-lite-baileys';
  if (!data.userId) {
    return { success: false, platformDetails, error: 'usuario_id requerido', alreadySaved: false };
  }

  const sendJid = await resolveWhatsAppSendJid(data);
  const scheduledMs = data.scheduledFor ? new Date(data.scheduledFor).getTime() : NaN;
  const isScheduled = Number.isFinite(scheduledMs) && scheduledMs > Date.now() + 1000;

  const pending = isScheduled
    ? null
    : await saveOutgoingMessage(data, platformDetails, 'enviando');
  if (!isScheduled && !pending?.messageId) {
    return { success: false, platformDetails, error: 'No se pudo guardar el mensaje', alreadySaved: false };
  }

  const isAudio = data.messageType === 'audio' || data.metadata?.file_type === 'audio';
  try {
    const { id } = await enqueueWhatsAppOutbox(getSupabaseAdmin(), {
      usuario_id: data.userId,
      conversacion_id: pending?.conversacionId || data.metadata?.conversacion_id || null,
      to_jid: sendJid,
      message_type: data.messageType || 'text',
      contenido: data.message,
      file_url: data.filePath || (typeof data.metadata?.file_url === 'string' ? data.metadata.file_url : null),
      mimetype: typeof data.metadata?.mime_type === 'string'
        ? data.metadata.mime_type
        : isAudio
          ? 'audio/webm'
          : null,
      file_name: typeof data.metadata?.file_name === 'string' ? data.metadata.file_name : null,
      metadata: {
        ...(data.metadata || {}),
        ...(pending?.messageId ? { inbox_message_id: pending.messageId } : {}),
      },
      sendAt: isScheduled ? new Date(scheduledMs) : null,
    });
    if (pending?.messageId) {
      await attachOutboxId(pending.messageId, id);
    }
    console.log('📥 WhatsApp encolado en outbox:', id, 'jid:', sendJid, isScheduled ? '(programado)' : '');
    return { success: true, platformDetails, alreadySaved: Boolean(pending), outboxId: id, scheduled: isScheduled };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo encolar';
    if (pending?.messageId) {
      await updateOutgoingStatus(pending.messageId, 'error', message);
    }
    return { success: false, platformDetails, error: message, alreadySaved: Boolean(pending) };
  }
}

async function attachOutboxId(messageId: string, outboxId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase
      .from('mensajes_conversacion')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();
    const metadata = {
      ...(current?.metadata && typeof current.metadata === 'object' ? current.metadata : {}),
      outbox_id: outboxId,
      estado_envio: 'enviando',
    };
    await supabase.from('mensajes_conversacion').update({ metadata, estado_envio: 'enviando' }).eq('id', messageId);
  } catch (error) {
    console.warn('⚠️ No se pudo guardar outbox_id en el mensaje:', error);
  }
}

/**
 * Enviar mensaje via WhatsApp (detecta automáticamente Lite o Business)
 */
async function sendViaWhatsApp(data: SendMessageData) {
  try {
    console.log('📱 Iniciando envío via WhatsApp Lite:', {
      to: data.to,
      message: data.message.substring(0, 50) + '...',
      messageType: data.messageType
    });

    // Por ahora, usar WhatsApp Lite como predeterminado
    // En el futuro, aquí puedes implementar lógica para detectar
    // si usar Lite o Business basado en configuración del usuario
    
    const sendJid = await resolveWhatsAppSendJid(data);
    console.log('📱 JID de envío WhatsApp:', sendJid, 'to original:', data.to);

    const { liteSend, isWhatsAppWorkerConfigured, shouldUseLocalLite } = await import(
      '@/lib/whatsapp/workerClient'
    );

    if (isWhatsAppWorkerConfigured() || !shouldUseLocalLite()) {
      const result = await liteSend(data.userId || '', sendJid, data.message, {
        type: data.messageType || 'text',
        filePath: data.filePath,
        mimetype: data.metadata?.file_type === 'audio' || data.messageType === 'audio'
          ? (data.metadata?.mime_type || 'audio/webm')
          : data.metadata?.mime_type,
        fileName: data.metadata?.file_name,
      });
      return {
        success: Boolean(result.body.success),
        platformDetails: 'whatsapp-lite-baileys',
        error: result.body.success
          ? undefined
          : String(result.body.error || 'WhatsApp Lite no está conectado'),
        waMessageId: result.body.waMessageId ? String(result.body.waMessageId) : undefined,
      };
    }

    const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
    
    console.log('📱 WhatsApp Lite Service importado correctamente');
    
    // Restaurar estado desde la base de datos si hay userId
    if (data.userId) {
      await whatsappLiteService.restoreStateFromDatabase(data.userId);
    }
    
    // Verificar estado de conexión
    const connectionStatus = whatsappLiteService.getConnectionStatus();
    console.log('📱 Estado de conexión WhatsApp:', connectionStatus);
    
    if (!connectionStatus.connected) {
      console.log('❌ WhatsApp Lite no está conectado');
      return { 
        success: false, 
        platformDetails: 'whatsapp-lite-baileys',
        error: 'WhatsApp Lite no está conectado. Conectalo desde el onboarding o Mensajería.'
      };
    }
    
    const sent = await whatsappLiteService.sendMessage(
      sendJid,
      data.message,
      {
        type: data.messageType || 'text',
        filePath: data.filePath
      }
    );

    console.log('📱 Resultado del envío:', sent);

    return {
      success: typeof sent === 'object' ? sent.success : Boolean(sent),
      platformDetails: 'whatsapp-lite-baileys',
      waMessageId: typeof sent === 'object' ? sent.waMessageId : undefined,
    };
  } catch (error) {
    console.error('❌ Error enviando via WhatsApp:', error);
    return { 
      success: false, 
      platformDetails: 'whatsapp-lite-baileys',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Enviar mensaje via Telegram
 */
async function sendViaTelegram(data: SendMessageData) {
  try {
    // TODO: Implementar envío via Telegram Bot API
    console.log('📱 Enviando via Telegram (no implementado aún)');
    
    return {
      success: false,
      platformDetails: 'telegram-bot-api',
      error: 'Telegram no está implementado aún'
    };
  } catch (error) {
    console.error('Error enviando via Telegram:', error);
    return { 
      success: false, 
      platformDetails: 'telegram-bot-api',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Enviar mensaje via Email
 */
async function sendViaEmail(data: SendMessageData) {
  try {
    // TODO: Implementar envío via Email (SMTP, SendGrid, etc.)
    console.log('📧 Enviando via Email (no implementado aún)');
    
    return {
      success: false,
      platformDetails: 'email-smtp',
      error: 'Email no está implementado aún'
    };
  } catch (error) {
    console.error('Error enviando via Email:', error);
    return { 
      success: false, 
      platformDetails: 'email-smtp',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Guardar mensaje saliente en la base de datos
 */
async function saveOutgoingMessage(
  data: SendMessageData,
  platformDetails: string,
  estadoEnvio: 'enviando' | 'enviado' = 'enviado'
): Promise<{ conversacionId: string; messageId: string } | null> {
  try {
    console.log('💾 Guardando mensaje saliente en BD:', {
      platform: data.platform,
      to: data.to,
      messageType: data.messageType
    });

    const conversacionIdMeta = data.metadata?.conversacion_id;
    const supabase = getSupabaseAdmin();

    let existingConversation: { id: string } | null = null;
    if (conversacionIdMeta) {
      const byId = await supabase
        .from('conversaciones')
        .select('id')
        .eq('id', conversacionIdMeta)
        .maybeSingle();
      existingConversation = byId.data;
    }

    if (!existingConversation) {
      const { data: found, error: searchError } = await supabase
        .from('conversaciones')
        .select('id')
        .eq('remitente', data.to)
        .eq('servicio_origen', data.platform)
        .order('fecha_mensaje', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('❌ Error buscando conversación:', searchError);
        throw searchError;
      }
      existingConversation = found;
    }

    let conversacionId;
    if (existingConversation) {
      conversacionId = existingConversation.id;
      console.log('📝 Usando conversación existente:', conversacionId);
      
      // Actualizar fecha del último mensaje
      const { error: updateError } = await supabase
        .from('conversaciones')
        .update({ fecha_mensaje: new Date().toISOString() })
        .eq('id', conversacionId);

      if (updateError) {
        console.error('❌ Error actualizando conversación:', updateError);
      }
    } else {
      // Crear nueva conversación
      const newConversationId = uuidv4();
      console.log('🆕 Creando nueva conversación:', newConversationId);
      
      const { data: newConversation, error } = await supabase
        .from('conversaciones')
        .insert({
          id: newConversationId,
          lead_id: null,
          servicio_origen: data.platform,
          tipo: 'saliente',
          remitente: data.to,
          fecha_mensaje: new Date().toISOString(),
          metadata: {
            platform: data.platform,
            platform_details: platformDetails,
            created_at: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creando conversación:', error);
        throw error;
      }
      conversacionId = newConversation.id;
    }

    // Guardar el mensaje
    const messageId = uuidv4();
    console.log('💾 Guardando mensaje con ID:', messageId);
    
    const { error } = await supabase
      .from('mensajes_conversacion')
      .insert({
        id: messageId,
        conversacion_id: conversacionId,
        tipo: data.messageType || 'texto',
        contenido: data.message,
        remitente: data.to,
        fecha_mensaje: new Date().toISOString(),
        canal: data.platform,
        metadata: {
          ...data.metadata,
          platform: data.platform,
          platform_details: platformDetails,
          direction: 'outgoing',
          user_id: data.userId,
          estado_envio: estadoEnvio,
        },
        usuario_id: data.userId || null,
        estado_envio: estadoEnvio,
      });

    if (error) {
      console.error('❌ Error guardando mensaje:', error);
      throw error;
    }
    
    console.log('✅ Mensaje saliente guardado exitosamente');
    const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
    await notifyInboxRealtime(data.userId, {
      conversacionId,
      platform: data.platform,
      preview: String(data.message || '').slice(0, 120),
      direction: 'outgoing',
    });
    return { conversacionId, messageId };
  } catch (error) {
    console.error('❌ Error guardando mensaje saliente:', error);
    return null;
  }
}

async function updateOutgoingStatus(
  messageId: string,
  estado: 'enviado' | 'error',
  errorText?: string | null,
  waMessageId?: string
) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase
      .from('mensajes_conversacion')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();
    const metadata = {
      ...(current?.metadata && typeof current.metadata === 'object' ? current.metadata : {}),
      estado_envio: estado,
      ...(errorText ? { error_envio: errorText } : {}),
    };
    const patch: Record<string, unknown> = { metadata, estado_envio: estado };
    if (waMessageId) patch.wa_message_id = waMessageId;
    const { error } = await supabase
      .from('mensajes_conversacion')
      .update(patch)
      .eq('id', messageId);
    if (error) {
      console.warn('⚠️ No se pudo actualizar estado del mensaje saliente:', error);
    }
  } catch (error) {
    console.warn('⚠️ Error actualizando estado saliente:', error);
  }
} 