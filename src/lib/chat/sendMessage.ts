import { getSupabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface SendMessageData {
  platform: 'whatsapp' | 'telegram' | 'email';
  to: string;
  message: string;
  messageType?: 'text' | 'image' | 'audio' | 'video' | 'file';
  filePath?: string;
  userId?: string;
  metadata?: Record<string, any>;
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

    // Enviar según la plataforma
    switch (data.platform) {
      case 'whatsapp': {
        console.log('📱 Procesando WhatsApp...');
        const whatsappResult = await sendViaWhatsApp(data);
        success = whatsappResult.success;
        platformDetails = whatsappResult.platformDetails;
        error = whatsappResult.error;
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

    if (success) {
      // Guardar mensaje saliente en la base de datos
      await saveOutgoingMessage(data, platformDetails);
      console.log(`✅ Mensaje enviado exitosamente via ${data.platform}`);
    }

    return { success, platformDetails, error };
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
      const result = await liteSend(data.userId || '', sendJid, data.message);
      return {
        success: Boolean(result.body.success),
        platformDetails: 'whatsapp-lite-baileys',
        error: result.body.success
          ? undefined
          : String(result.body.error || 'WhatsApp Lite no está conectado'),
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
    
    const success = await whatsappLiteService.sendMessage(
      sendJid,
      data.message,
      {
        type: data.messageType || 'text',
        filePath: data.filePath
      }
    );

    console.log('📱 Resultado del envío:', success);

    return {
      success,
      platformDetails: 'whatsapp-lite-baileys'
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
async function saveOutgoingMessage(data: SendMessageData, platformDetails: string) {
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
          estado_envio: 'enviado',
        },
        usuario_id: data.userId || null
      });

    if (error) {
      console.error('❌ Error guardando mensaje:', error);
      throw error;
    }
    
    console.log('✅ Mensaje saliente guardado exitosamente');
    const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
    await notifyInboxRealtime(data.userId, { conversacionId, platform: data.platform });
  } catch (error) {
    console.error('❌ Error guardando mensaje saliente:', error);
    // No lanzar error para no interrumpir el envío
  }
} 