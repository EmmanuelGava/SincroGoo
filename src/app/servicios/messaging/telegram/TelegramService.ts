/**
 * Servicio para envío de mensajes a Telegram
 * Maneja la comunicación con la API de Telegram Bot
 */

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  error_code?: number;
  description?: string;
}

export class TelegramService {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN no está configurado');
    }
  }

  /**
   * Envía un mensaje de texto a un chat de Telegram
   */
  async enviarMensaje(params: TelegramMessage): Promise<TelegramResponse> {
    if (!this.botToken) {
      throw new Error('Token de Telegram no configurado');
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: params.chatId,
          text: params.text,
          parse_mode: params.parseMode,
          disable_web_page_preview: params.disableWebPagePreview,
          disable_notification: params.disableNotification,
          reply_to_message_id: params.replyToMessageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error enviando mensaje a Telegram:', data);
        return {
          ok: false,
          error_code: data.error_code,
          description: data.description,
        };
      }

      return {
        ok: true,
        result: data.result,
      };
    } catch (error) {
      console.error('Error en TelegramService.enviarMensaje:', error);
      throw new Error(`Error enviando mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si el bot está configurado correctamente
   */
  async verificarBot(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error verificando bot de Telegram:', error);
      return false;
    }
  }

  /**
   * Obtiene información del bot
   */
  async obtenerInfoBot() {
    if (!this.botToken) {
      throw new Error('Token de Telegram no configurado');
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Error obteniendo info del bot: ${data.description}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error obteniendo info del bot:', error);
      throw error;
    }
  }

  /**
   * Configura el webhook para recibir mensajes
   */
  async configurarWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.botToken) {
      throw new Error('Token de Telegram no configurado');
    }

    try {
      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message'],
        }),
      });

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error configurando webhook:', error);
      return false;
    }
  }
}

// Instancia singleton del servicio
export const telegramService = new TelegramService();