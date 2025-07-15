/**
 * Servicio para envío de mensajes a WhatsApp Business API
 * Maneja la comunicación con la API de Meta for Business
 */

export interface WhatsAppMessage {
  to: string;
  text: string;
  type?: 'text' | 'template';
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode: number;
    fbtrace_id: string;
  };
}

export class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly baseUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
    
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp credentials no están configurados completamente');
    }
  }

  /**
   * Envía un mensaje de texto a WhatsApp
   */
  async enviarMensaje(params: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Credenciales de WhatsApp no configuradas');
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: params.type || 'text',
          text: params.type === 'text' ? {
            body: params.text
          } : undefined,
          template: params.template
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error enviando mensaje a WhatsApp:', data);
        return {
          messaging_product: 'whatsapp',
          error: data.error || {
            message: `HTTP ${response.status}`,
            type: 'api_error',
            code: response.status,
            error_subcode: 0,
            fbtrace_id: ''
          }
        };
      }

      return {
        messaging_product: 'whatsapp',
        contacts: data.contacts,
        messages: data.messages
      };
    } catch (error) {
      console.error('Error en WhatsAppService.enviarMensaje:', error);
      throw new Error(`Error enviando mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  async verificarConfiguracion(): Promise<boolean> {
    if (!this.accessToken || !this.phoneNumberId) {
      return false;
    }

    try {
      // Verificar que podemos acceder a la información del número de teléfono
      const response = await fetch(`${this.baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error verificando configuración de WhatsApp:', error);
      return false;
    }
  }

  /**
   * Obtiene información del número de teléfono de WhatsApp Business
   */
  async obtenerInfoNumero() {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Credenciales de WhatsApp no configuradas');
    }

    try {
      const response = await fetch(`${this.baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Error obteniendo info del número: ${data.error?.message || 'Error desconocido'}`);
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo info del número:', error);
      throw error;
    }
  }

  /**
   * Configura el webhook para recibir mensajes
   */
  async configurarWebhook(webhookUrl: string, verifyToken: string): Promise<boolean> {
    // Nota: La configuración del webhook se hace desde la consola de Meta for Developers
    // Esta función es principalmente para documentación
    console.log(`Para configurar el webhook de WhatsApp:
1. Ve a https://developers.facebook.com/apps
2. Selecciona tu app
3. Ve a WhatsApp > Configuration
4. Configura el webhook URL: ${webhookUrl}
5. Configura el verify token: ${verifyToken}
6. Suscríbete a los eventos: messages, message_deliveries, message_reads`);
    
    return true;
  }

  /**
   * Valida el formato de un número de WhatsApp
   */
  validarNumero(numero: string): boolean {
    // WhatsApp requiere números en formato internacional sin + ni espacios
    // Ejemplo: 5491123456789 (Argentina)
    const regex = /^\d{10,15}$/;
    return regex.test(numero);
  }

  /**
   * Formatea un número para WhatsApp
   */
  formatearNumero(numero: string): string {
    // Remover todos los caracteres no numéricos excepto el +
    let formatted = numero.replace(/[^\d+]/g, '');
    
    // Si empieza con +, removerlo
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    
    return formatted;
  }
}

// Instancia singleton del servicio
export const whatsappService = new WhatsAppService();