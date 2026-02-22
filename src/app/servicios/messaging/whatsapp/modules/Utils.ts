import qrcode from 'qrcode';
import { QRCodeData } from './types';

export class WhatsAppUtils {
  /**
   * Formatear número de teléfono para Baileys
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remover caracteres no numéricos
    let formatted = phoneNumber.replace(/\D/g, '');

    // Si no empieza con código de país, asumir Argentina (+54)
    if (!formatted.startsWith('54') && !formatted.startsWith('1')) {
      formatted = '54' + formatted;
    }

    // Remover el 9 después del código de país para Argentina
    if (formatted.startsWith('549')) {
      formatted = '54' + formatted.substring(3);
    }

    return formatted;
  }

  /**
   * Generar QR code como Data URL
   */
  static async generateQRCode(qrString: string, sessionId: string): Promise<QRCodeData> {
    try {
      const qrCodeDataURL = await qrcode.toDataURL(qrString);
      return {
        qrCode: qrCodeDataURL,
        sessionId,
        expiresAt: new Date(Date.now() + 60 * 1000)
      };
    } catch (error) {
      console.error('❌ Error generando QR code:', error);
      throw error;
    }
  }

  /**
   * Verificar si un string es un Google ID (numérico)
   */
  static isGoogleId(id: string): boolean {
    return typeof id === 'string' && /^\d+$/.test(id);
  }

  /**
   * Crear directorio si no existe
   */
  static ensureDir(dirPath: string): void {
    import('fs').then(fs => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Esperar un tiempo específico
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validar estructura de mensaje
   */
  static validateMessage(message: any): boolean {
    return message && 
           typeof message === 'object' && 
           (message.conversation || 
            message.extendedTextMessage?.text || 
            message.imageMessage?.caption);
  }

  /**
   * Extraer texto del mensaje
   */
  static extractMessageText(message: any): string {
    if (!this.validateMessage(message)) {
      return '';
    }

    return message.conversation || 
           message.extendedTextMessage?.text || 
           message.imageMessage?.caption || 
           '';
  }
} 