/**
 * Exportaciones principales del sistema de mensajería
 */

export { MessagingService, messagingService } from './MessagingService';
export { TelegramService, telegramService } from './telegram/TelegramService';
export { WhatsAppService, whatsappService } from './whatsapp/WhatsAppService';
export * from './types';

// Re-exportar para facilitar importaciones
export type {
  PlataformaMensajeria,
  MensajeNormalizado,
  ConversacionNormalizada,
  ConfiguracionPlataforma,
  EstadoMensaje,
  RespuestaEnvio
} from './types';