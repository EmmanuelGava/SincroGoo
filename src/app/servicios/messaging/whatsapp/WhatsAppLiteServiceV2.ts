/**
 * WhatsApp Lite Service V2 - Versión simplificada y robusta
 * Enfoque en simplicidad y manejo correcto del error 515
 */

import { WASocket, makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

export interface WhatsAppState {
  isConnected: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
  userId: string | null;
  sessionId: string | null;
  socket: WASocket | null;
  isReconnecting: boolean;
  lastActivity: Date | null;
}

export class WhatsAppLiteServiceV2 {
  private state: WhatsAppState = {
    isConnected: false,
    phoneNumber: null,
    qrCode: null,
    userId: null,
    sessionId: null,
    socket: null,
    isReconnecting: false,
    lastActivity: null
  };

  private authDir: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  /**
   * Conectar WhatsApp Lite
   */
  async connect(userId: string): Promise<{ success: boolean; data: any }> {
    try {
      console.log('🚀 [WhatsAppLiteV2] Iniciando conexión para usuario:', userId);

      // Limpiar estado anterior
      await this.cleanup();

      // Configurar nuevo estado
      this.state.userId = userId;
      this.state.sessionId = uuidv4();
      this.state.isReconnecting = false;
      this.reconnectAttempts = 0;

      // Crear directorio de autenticación
      await this.setupAuthDirectory();

      // Crear socket
      await this.createSocket();

      return {
        success: true,
        data: {
          connected: this.state.isConnected,
          message: this.state.isConnected ? 'Conectado exitosamente' : 'Esperando QR...',
          sessionId: this.state.sessionId,
          qrCode: this.state.qrCode
        }
      };

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error en conexión:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Error desconocido' }
      };
    }
  }

  /**
   * Configurar directorio de autenticación
   */
  private async setupAuthDirectory(): Promise<void> {
    const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
    this.authDir = path.join(tempDir, 'whatsapp_v2', this.state.sessionId!);

    // Limpiar directorio si existe
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }

    // Crear directorio
    fs.mkdirSync(this.authDir, { recursive: true });
    console.log('📁 [WhatsAppLiteV2] Directorio creado:', this.authDir);
  }

  /**
   * Crear socket de Baileys
   */
  private async createSocket(): Promise<void> {
    try {
      console.log('🔧 [WhatsAppLiteV2] Creando socket...');

      // useMultiFileAuthState es de Baileys, no un React Hook
      // eslint-disable-next-line react-hooks/rules-of-hooks -- Baileys
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // Configuración del socket
      const socket = makeWASocket({
        auth: state,
        browser: ['WhatsApp Web', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        qrTimeout: 120000,
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 1000,
        maxMsgRetryCount: 3,
        markOnlineOnConnect: false,
        printQRInTerminal: false,
        logger: this.createLogger(),
        getMessage: async () => ({ conversation: 'Mensaje no disponible' })
      });

      this.state.socket = socket;

      // Configurar event listeners
      this.setupEventListeners(socket, saveCreds);

      console.log('✅ [WhatsAppLiteV2] Socket creado exitosamente');

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error creando socket:', error);
      throw error;
    }
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(socket: WASocket, saveCreds: () => Promise<void>): void {
    console.log('🔧 [WhatsAppLiteV2] Configurando event listeners...');

    // Actualización de credenciales
    socket.ev.on('creds.update', async () => {
      console.log('🔄 [WhatsAppLiteV2] Credenciales actualizadas');
      await saveCreds();
    });

    // Actualización de conexión
    socket.ev.on('connection.update', async (update) => {
      console.log('📡 [WhatsAppLiteV2] Connection update:', {
        connection: update.connection,
        hasQR: !!update.qr,
        hasError: !!update.lastDisconnect?.error,
        hasUser: !!socket.user
      });

      // Manejar QR
      if (update.qr) {
        await this.handleQR(update.qr);
      }

      // Manejar conexión abierta
      if (update.connection === 'open') {
        await this.handleConnectionOpen(socket);
      }

      // Manejar desconexión
      if (update.connection === 'close') {
        await this.handleDisconnection(update.lastDisconnect);
      }
    });

    console.log('✅ [WhatsAppLiteV2] Event listeners configurados');
  }

  /**
   * Manejar QR code
   */
  private async handleQR(qr: string): Promise<void> {
    try {
      console.log('📱 [WhatsAppLiteV2] QR recibido, generando imagen...');

      // Generar imagen QR (opciones compatibles con @types/qrcode para image/png)
      const qrImage = await QRCode.toDataURL(qr, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      this.state.qrCode = qrImage;
      this.state.isConnected = false;

      // Emitir QR al frontend
      this.emitToUser('whatsapp-qr', {
        qrCode: qrImage,
        sessionId: this.state.sessionId,
        expiresAt: new Date(Date.now() + 60 * 1000)
      });

      console.log('✅ [WhatsAppLiteV2] QR enviado al frontend');

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error manejando QR:', error);
    }
  }

  /**
   * Manejar conexión abierta
   */
  private async handleConnectionOpen(socket: WASocket): Promise<void> {
    try {
      console.log('🎉 [WhatsAppLiteV2] Conexión abierta!');

      // Verificar usuario autenticado
      if (!socket.user || !socket.user.id) {
        console.log('⚠️ [WhatsAppLiteV2] No hay usuario autenticado');
        return;
      }

      // Extraer número de teléfono
      const phoneNumber = socket.user.id.split('@')[0] || socket.user.id.split(':')[0];

      if (!phoneNumber || phoneNumber.length < 10) {
        console.log('❌ [WhatsAppLiteV2] Número de teléfono inválido:', phoneNumber);
        return;
      }

      // Actualizar estado
      this.state.isConnected = true;
      this.state.phoneNumber = phoneNumber;
      this.state.qrCode = null;
      this.state.lastActivity = new Date();
      this.state.isReconnecting = false;
      this.reconnectAttempts = 0;

      console.log('✅ [WhatsAppLiteV2] Autenticación exitosa:', phoneNumber);

      // Emitir estado al frontend
      this.emitToUser('whatsapp-connected', { phoneNumber });
      this.emitToUser('whatsapp-status', {
        connected: true,
        phoneNumber: phoneNumber,
        lastActivity: this.state.lastActivity
      });

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error manejando conexión abierta:', error);
    }
  }

  /**
   * Manejar desconexión
   */
  private async handleDisconnection(lastDisconnect: any): Promise<void> {
    try {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      console.log('🔌 [WhatsAppLiteV2] Desconexión:', {
        statusCode,
        message: error?.message,
        shouldReconnect: this.shouldReconnect(statusCode)
      });

      // Actualizar estado
      this.state.isConnected = false;

      // Manejar error 515 (normal después de escanear QR)
      if (statusCode === 515) {
        console.log('🔄 [WhatsAppLiteV2] Error 515 - Reconectando automáticamente...');
        await this.handleError515();
        return;
      }

      // Otros errores que requieren reconexión
      if (this.shouldReconnect(statusCode)) {
        await this.attemptReconnection();
      } else {
        // Errores que no requieren reconexión
        this.state.phoneNumber = null;
        this.state.qrCode = null;
        
        this.emitToUser('whatsapp-status', {
          connected: false,
          phoneNumber: null,
          error: error?.message
        });
      }

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error manejando desconexión:', error);
    }
  }

  /**
   * Manejar error 515 específicamente
   */
  private async handleError515(): Promise<void> {
    try {
      console.log('🔄 [WhatsAppLiteV2] Manejando error 515...');

      this.state.isReconnecting = true;

      // Esperar un poco para que las credenciales se procesen
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Crear nuevo socket con las credenciales guardadas
      await this.createSocket();

      console.log('✅ [WhatsAppLiteV2] Reconexión después de error 515 completada');

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error en reconexión 515:', error);
      this.state.isReconnecting = false;
    }
  }

  /**
   * Intentar reconexión
   */
  private async attemptReconnection(): Promise<void> {
    if (this.state.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    try {
      this.state.isReconnecting = true;
      this.reconnectAttempts++;

      console.log(`🔄 [WhatsAppLiteV2] Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      // Esperar antes de reconectar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Crear nuevo socket
      await this.createSocket();

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error en reconexión:', error);
      this.state.isReconnecting = false;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ [WhatsAppLiteV2] Máximo de intentos de reconexión alcanzado');
        this.emitToUser('whatsapp-status', {
          connected: false,
          phoneNumber: null,
          error: 'Máximo de intentos de reconexión alcanzado'
        });
      }
    }
  }

  /**
   * Determinar si debe reconectar basado en el código de error
   */
  private shouldReconnect(statusCode: number): boolean {
    const reconnectCodes = [
      DisconnectReason.connectionClosed,
      DisconnectReason.connectionLost,
      DisconnectReason.restartRequired,
      515 // Error específico de WhatsApp
    ];

    return reconnectCodes.includes(statusCode);
  }

  /**
   * Emitir evento al usuario
   */
  private emitToUser(event: string, data: any): void {
    try {
      if (typeof global !== 'undefined' && (global as any).emitToUser && this.state.userId) {
        (global as any).emitToUser(this.state.userId, event, data);
        console.log(`📡 [WhatsAppLiteV2] Evento ${event} emitido:`, data);
      }
    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error emitiendo evento:', error);
    }
  }

  /**
   * Crear logger silencioso
   */
  private createLogger() {
    return {
      level: 'silent',
      child: () => this.createLogger(),
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {}
    };
  }

  /**
   * Limpiar recursos
   */
  private async cleanup(): Promise<void> {
    try {
      // Cerrar socket existente
      if (this.state.socket) {
        this.state.socket.end(undefined);
        this.state.socket = null;
      }

      // Limpiar directorio de autenticación anterior
      if (this.authDir && fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }

      // Resetear estado
      this.state.isConnected = false;
      this.state.phoneNumber = null;
      this.state.qrCode = null;
      this.state.isReconnecting = false;
      this.reconnectAttempts = 0;

      console.log('🧹 [WhatsAppLiteV2] Limpieza completada');

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error en limpieza:', error);
    }
  }

  /**
   * Desconectar WhatsApp
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 [WhatsAppLiteV2] Desconectando...');

      await this.cleanup();

      this.emitToUser('whatsapp-status', {
        connected: false,
        phoneNumber: null
      });

      console.log('✅ [WhatsAppLiteV2] Desconectado exitosamente');

    } catch (error) {
      console.error('❌ [WhatsAppLiteV2] Error desconectando:', error);
    }
  }

  /**
   * Obtener estado actual
   */
  getState(): WhatsAppState {
    return { ...this.state };
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.state.isConnected && !!this.state.phoneNumber;
  }
}

// Instancia singleton
export const whatsappLiteServiceV2 = new WhatsAppLiteServiceV2();