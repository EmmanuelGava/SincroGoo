/**
 * Servicio principal de mensajería
 * Centraliza el envío de mensajes a diferentes plataformas
 */

import { telegramService } from './telegram/TelegramService';
import { whatsappService } from './whatsapp/WhatsAppService';

export type PlataformaMensajeria = 'telegram' | 'whatsapp' | 'email' | 'sms';

export interface MensajeEnvio {
  plataforma: PlataformaMensajeria;
  destinatario: string;
  contenido: string;
  archivo?: {
    url: string;
    nombre: string;
    tipo: string;
  };
  metadata?: Record<string, any>;
}

export interface ResultadoEnvio {
  exito: boolean;
  mensaje?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class MessagingService {
  /**
   * Envía un mensaje a la plataforma especificada usando configuración del usuario
   */
  async enviarMensaje(params: MensajeEnvio & { usuarioId?: string; configuracionId?: string }): Promise<ResultadoEnvio> {
    try {
      // Si se proporciona usuarioId, obtener configuración del usuario
      let configuracion = null;
      if (params.usuarioId) {
        configuracion = await this.obtenerConfiguracionUsuario(params.usuarioId, params.plataforma, params.configuracionId);
        if (!configuracion) {
          return {
            exito: false,
            error: `No se encontró configuración activa para ${params.plataforma}`
          };
        }
      }

      switch (params.plataforma) {
        case 'telegram':
          return await this.enviarTelegram(params.destinatario, params.contenido, params.archivo, configuracion);

        case 'whatsapp':
          return await this.enviarWhatsApp(params.destinatario, params.contenido, params.archivo, configuracion);

        case 'email':
          return await this.enviarEmail(params.destinatario, params.contenido, params.archivo);

        case 'sms':
          return await this.enviarSMS(params.destinatario, params.contenido);

        default:
          return {
            exito: false,
            error: `Plataforma no soportada: ${params.plataforma}`
          };
      }
    } catch (error) {
      console.error(`Error enviando mensaje a ${params.plataforma}:`, error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene la configuración del usuario para una plataforma específica
   */
  private async obtenerConfiguracionUsuario(usuarioId: string, plataforma: PlataformaMensajeria, configuracionId?: string) {
    try {
      const url = configuracionId
        ? `/api/configuracion/mensajeria/${configuracionId}`
        : `/api/configuracion/mensajeria?plataforma=${plataforma}&activa=true`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${usuarioId}` // Simplificado para el ejemplo
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return configuracionId ? data.configuracion : data.configuraciones?.[0];
    } catch (error) {
      console.error('Error obteniendo configuración del usuario:', error);
      return null;
    }
  }

  /**
   * Envía mensaje a Telegram
   */
  private async enviarTelegram(chatId: string, texto: string, archivo?: { url: string; nombre: string; tipo: string }, configuracion?: any): Promise<ResultadoEnvio> {
    try {
      const resultado = await telegramService.enviarMensaje({
        chatId,
        text: texto
      });

      if (resultado.ok) {
        return {
          exito: true,
          mensaje: 'Mensaje enviado a Telegram correctamente',
          metadata: resultado.result
        };
      } else {
        return {
          exito: false,
          error: resultado.description || 'Error enviando a Telegram'
        };
      }
    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error enviando a Telegram'
      };
    }
  }

  /**
   * Envía mensaje a WhatsApp
   */
  private async enviarWhatsApp(numero: string, texto: string, archivo?: { url: string; nombre: string; tipo: string }, configuracion?: any): Promise<ResultadoEnvio> {
    try {
      // Formatear el número para WhatsApp
      const numeroFormateado = whatsappService.formatearNumero(numero);

      if (!whatsappService.validarNumero(numeroFormateado)) {
        return {
          exito: false,
          error: `Número de WhatsApp inválido: ${numero}`
        };
      }

      const resultado = await whatsappService.enviarMensaje({
        to: numeroFormateado,
        text: texto,
        type: 'text'
      });

      if (resultado.error) {
        return {
          exito: false,
          error: resultado.error.message || 'Error enviando a WhatsApp'
        };
      }

      return {
        exito: true,
        mensaje: 'Mensaje enviado a WhatsApp correctamente',
        metadata: {
          contacts: resultado.contacts,
          messages: resultado.messages
        }
      };
    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error enviando a WhatsApp'
      };
    }
  }

  /**
   * Envía email (placeholder)
   */
  private async enviarEmail(email: string, texto: string, archivo?: { url: string; nombre: string; tipo: string }): Promise<ResultadoEnvio> {
    // TODO: Implementar envío de email con SendGrid/Mailgun
    console.log(`[Email] Enviando a ${email}: ${texto}`, archivo ? `con archivo: ${archivo.nombre}` : '');
    return {
      exito: false,
      error: 'Email no implementado aún'
    };
  }

  /**
   * Envía SMS (placeholder)
   */
  private async enviarSMS(numero: string, texto: string): Promise<ResultadoEnvio> {
    // TODO: Implementar envío de SMS
    console.log(`[SMS] Enviando a ${numero}: ${texto}`);
    return {
      exito: false,
      error: 'SMS no implementado aún'
    };
  }

  /**
   * Verifica si una plataforma está disponible
   */
  async verificarPlataforma(plataforma: PlataformaMensajeria): Promise<boolean> {
    switch (plataforma) {
      case 'telegram':
        return await telegramService.verificarBot();

      case 'whatsapp':
        return await whatsappService.verificarConfiguracion();

      case 'email':
        // TODO: Verificar configuración de email
        return false;

      case 'sms':
        // TODO: Verificar configuración de SMS
        return false;

      default:
        return false;
    }
  }

  /**
   * Obtiene el estado de todas las plataformas
   */
  async obtenerEstadoPlataformas() {
    const plataformas: PlataformaMensajeria[] = ['telegram', 'whatsapp', 'email', 'sms'];
    const estado: Record<PlataformaMensajeria, boolean> = {} as any;

    for (const plataforma of plataformas) {
      estado[plataforma] = await this.verificarPlataforma(plataforma);
    }

    return estado;
  }
}

// Instancia singleton del servicio
export const messagingService = new MessagingService();