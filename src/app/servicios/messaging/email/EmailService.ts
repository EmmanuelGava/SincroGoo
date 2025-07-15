/**
 * Servicio para envío de emails usando SendGrid
 * Maneja la comunicación con la API de SendGrid
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export class EmailService {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
    this.baseUrl = 'https://api.sendgrid.com/v3';
    
    if (!this.apiKey || !this.fromEmail) {
      console.warn('SendGrid credentials no están configurados completamente');
    }
  }

  /**
   * Envía un email usando SendGrid
   */
  async enviarEmail(params: EmailMessage): Promise<EmailResponse> {
    if (!this.apiKey || !this.fromEmail) {
      throw new Error('Credenciales de SendGrid no configuradas');
    }

    try {
      const emailData = {
        personalizations: [
          {
            to: [{ email: params.to }],
            subject: params.subject
          }
        ],
        from: { 
          email: params.from || this.fromEmail,
          name: 'SincroGoo CRM'
        },
        content: [
          {
            type: 'text/plain',
            value: params.text || ''
          }
        ]
      };

      // Añadir contenido HTML si está disponible
      if (params.html) {
        emailData.content.push({
          type: 'text/html',
          value: params.html
        });
      }

      // Configurar reply-to si está especificado
      if (params.replyTo) {
        (emailData as any).reply_to = { email: params.replyTo };
      }

      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error enviando email:', errorData);
        return {
          success: false,
          error: errorData.errors?.[0]?.message || `HTTP ${response.status}`,
          statusCode: response.status
        };
      }

      // SendGrid devuelve 202 para éxito, sin body
      const messageId = response.headers.get('x-message-id') || 'unknown';

      return {
        success: true,
        messageId
      };
    } catch (error) {
      console.error('Error en EmailService.enviarEmail:', error);
      throw new Error(`Error enviando email: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  async verificarConfiguracion(): Promise<boolean> {
    if (!this.apiKey || !this.fromEmail) {
      return false;
    }

    try {
      // Verificar que la API key es válida haciendo una petición a la API
      const response = await fetch(`${this.baseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error verificando configuración de SendGrid:', error);
      return false;
    }
  }

  /**
   * Obtiene información del perfil de SendGrid
   */
  async obtenerPerfilSendGrid() {
    if (!this.apiKey) {
      throw new Error('API key de SendGrid no configurada');
    }

    try {
      const response = await fetch(`${this.baseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Error obteniendo perfil: ${data.errors?.[0]?.message || 'Error desconocido'}`);
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo perfil de SendGrid:', error);
      throw error;
    }
  }

  /**
   * Valida el formato de un email
   */
  validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Genera un subject automático para respuestas
   */
  generarSubjectRespuesta(subjectOriginal: string): string {
    if (subjectOriginal.toLowerCase().startsWith('re:')) {
      return subjectOriginal;
    }
    return `Re: ${subjectOriginal}`;
  }

  /**
   * Extrae el email de un string que puede contener nombre
   * Ejemplo: "Juan Pérez <juan@example.com>" -> "juan@example.com"
   */
  extraerEmail(emailString: string): string {
    const match = emailString.match(/<([^>]+)>/);
    return match ? match[1] : emailString.trim();
  }

  /**
   * Convierte texto plano a HTML básico
   */
  textoAHtml(texto: string): string {
    return texto
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
}

// Instancia singleton del servicio
export const emailService = new EmailService();