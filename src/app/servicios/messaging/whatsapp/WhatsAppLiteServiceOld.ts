import {
  makeWASocket,
  useMultiFileAuthState,
  WASocket,
  DisconnectReason,
  isJidBroadcast
} from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';

// Módulos refactorizados
import { SessionManager } from './modules/SessionManager';
import { DatabaseManager } from './modules/DatabaseManager';
import { WhatsAppUtils } from './modules/Utils';
import { BAILEYS_CONFIG, DISCONNECT_HANDLERS, RECONNECT_DELAYS } from './modules/BaileysConfig';
import { 
  WhatsAppLiteState, 
  QRCodeData, 
  ConnectionStatus, 
  ConnectionCallback, 
  MessageOptions 
} from './modules/types';

export class WhatsAppLiteService {
  private static instance: WhatsAppLiteService | null = null;

  // Estado del servicio
  private state: WhatsAppLiteState = {
    socket: null,
    isConnected: false,
    phoneNumber: null,
    sessionId: null,
    lastActivity: null,
    currentQR: null,
    userId: null,
    isReconnecting: false
  };

  // Módulos
  private sessionManager: SessionManager;
  private databaseManager: DatabaseManager;
  private connectionCallbacks: ConnectionCallback[] = [];

  // Configuración
  private authDir: string;

  private constructor() {
    // Usar directorio temporal para archivos de sesión
    this.authDir = path.join(process.cwd(), 'temp_auth_sessions');
    this.sessionManager = new SessionManager(this.authDir);
    this.databaseManager = new DatabaseManager();
    
    this.ensureAuthDir();
    // this.startConnectionHealthCheck(); // DESHABILITADO - solo se iniciará cuando se conecte
    
    console.log('🎯 WhatsApp Lite Service inicializado con módulos refactorizados');
    console.log('📁 Usando directorio temporal para sesiones:', this.authDir);
  }

  public static getInstance(): WhatsAppLiteService {
    if (!WhatsAppLiteService.instance) {
      WhatsAppLiteService.instance = new WhatsAppLiteService();
      console.log('🎯 Nueva instancia de WhatsAppLiteService creada');
    } else {
      console.log('🎯 Reutilizando instancia existente de WhatsAppLiteService');
    }
    return WhatsAppLiteService.instance;
  }

  /**
   * Conectar WhatsApp Lite
   */
  async connect(userId?: string): Promise<QRCodeData> {
    try {
      this.state.userId = userId || null;
      this.state.sessionId = userId || this.sessionManager.generateSessionId();
      
      console.log('🚀 Iniciando conexión WhatsApp Lite con Baileys...');

      // Verificar sesión existente
      if (userId) {
        await this.loadConnectionState(userId);
        await this.sessionManager.cleanDuplicateSessions(userId);
        
        // Si ya está conectado, retornar estado actual
        if (this.state.isConnected && this.state.phoneNumber) {
          console.log('✅ Reutilizando sesión existente conectada');
          return {
            qrCode: '',
            sessionId: this.state.sessionId!,
            expiresAt: new Date(Date.now() + 60 * 1000)
          };
        }
      }

      // Crear nueva sesión usando SOLO la base de datos
      console.log('🆕 Creando nueva sesión de WhatsApp Lite usando SOLO BD...');
      
      // Intentar cargar credenciales existentes desde BD
      let existingCredentials = null;
      if (userId) {
        existingCredentials = await this.databaseManager.loadBaileysCredentials(userId);
        if (existingCredentials) {
          console.log('📥 Credenciales existentes encontradas en BD');
        } else {
          console.log('📭 No hay credenciales existentes en BD');
        }
      }

      // Crear auth state en memoria (sin archivos locales)
      const authState = await this.createInMemoryAuthState(existingCredentials);
      
      // Configurar Baileys con auth state en memoria
      console.log('🔧 Configurando Baileys con auth state en memoria...');
      
      console.log('🔧 Creando socket de Baileys...');
      this.state.socket = makeWASocket({
        auth: authState.state,
        printQRInTerminal: false,
        ...BAILEYS_CONFIG,
        shouldIgnoreJid: jid => isJidBroadcast(jid),
        getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
        patchMessageBeforeSending: (msg) => {
          const requiresPatch = !!(msg.buttonsMessage || msg.templateMessage || msg.listMessage);
          if (requiresPatch) {
            msg = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                  ...msg,
                },
              },
            };
          }
          return msg;
        },
      });

      console.log('✅ Socket de Baileys creado exitosamente');

      // Configurar event listeners
      console.log('🔧 Configurando event listeners...');
      this.setupEventListeners(authState.saveCreds, userId || '');

      // Esperar QR code o autenticación
      console.log('⏳ Esperando QR code o autenticación...');
      const qrData = await this.waitForQRCodeOrAuth();
      console.log('✅ QR code o autenticación recibida:', qrData.qrCode ? 'QR generado' : 'Autenticado');
      
      return qrData;

    } catch (error) {
      console.error('❌ Error en connect:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(phoneNumber: string, message: string, options: MessageOptions = {}): Promise<boolean> {
    try {
      // Verificar conexión
      if (!this.state.socket?.user) {
        console.log('❌ Baileys no está autenticado (socket.user no existe)');
        throw new Error('WhatsApp Lite no está conectado');
      }

      if (!this.state.isConnected) {
        console.log('❌ WhatsApp no está marcado como conectado en nuestro estado');
        throw new Error('WhatsApp Lite no está conectado');
      }

      console.log('✅ Baileys está autenticado y conectado:', {
        userId: this.state.socket.user.id,
        phoneNumber: this.state.phoneNumber,
        isConnected: this.state.isConnected
      });

      // Formatear número y enviar
      const formattedNumber = WhatsAppUtils.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      if (options.type === 'file' && options.filePath) {
        const media = fs.readFileSync(options.filePath);
        await this.state.socket.sendMessage(jid, {
          document: media,
          mimetype: 'application/octet-stream',
          fileName: options.fileName || 'archivo',
          caption: message
        });
      } else {
        await this.state.socket.sendMessage(jid, { text: message });
      }

      console.log('✅ Mensaje enviado exitosamente');
      this.state.lastActivity = new Date();
      await this.databaseManager.saveConnectionState(this.state);
      
      return true;

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      return false;
    }
  }

  /**
   * Obtener estado de conexión
   */
  getConnectionStatus(): ConnectionStatus {
    const actuallyConnected = this.state.isConnected && 
                             !!this.state.socket && 
                             !!this.state.socket.user && 
                             !!this.state.phoneNumber;
    
    console.log('🔍 [Status Check] Estado interno:', {
      isConnected: this.state.isConnected,
      hasSocket: !!this.state.socket,
      hasSocketUser: !!(this.state.socket && this.state.socket.user),
      phoneNumber: this.state.phoneNumber,
      lastActivity: this.state.lastActivity,
      actuallyConnected,
      baileysUserId: this.state.socket?.user?.id
    });
    
    // Auto-reconexión si es necesario
    if (!actuallyConnected && this.state.sessionId && !this.state.isReconnecting) {
      console.log('🔄 Intentando reconexión automática...');
      this.autoReconnect();
    }
    
    return {
      connected: actuallyConnected,
      phoneNumber: this.state.phoneNumber || undefined,
      lastActivity: this.state.lastActivity || undefined,
      error: actuallyConnected ? undefined : 'WhatsApp Lite no está conectado'
    };
  }

  /**
   * Limpiar sesiones duplicadas y expiradas
   */
  async cleanSessions(): Promise<void> {
    try {
      console.log('🧹 Limpiando sesiones duplicadas y expiradas...');
      
      // Limpiar credenciales expiradas en la base de datos
      await this.databaseManager.cleanExpiredCredentials();
      
      // Limpiar sesiones duplicadas
      if (this.state.userId) {
        await this.sessionManager.cleanDuplicateSessions(this.state.userId);
      }
      
      console.log('✅ Limpieza de sesiones completada');
    } catch (error) {
      console.error('❌ Error limpiando sesiones:', error);
    }
  }

  /**
   * Obtener estadísticas de sesiones
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    if (!this.state.userId) {
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }
    
    return await this.databaseManager.getSessionStats(this.state.userId);
  }

  /**
   * Desconectar
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Desconectando WhatsApp Lite...');
      
      if (this.state.socket) {
        await this.state.socket.logout();
        this.state.socket = null;
      }
      
      this.state.isConnected = false;
      this.state.phoneNumber = null;
      this.state.currentQR = null;
      
      await this.databaseManager.saveConnectionState(this.state);
      
      // Limpiar archivos temporales
      this.cleanupTempFiles();
      
      console.log('✅ WhatsApp Lite desconectado');
      
    } catch (error) {
      console.error('❌ Error desconectando:', error);
    }
  }

  /**
   * Limpiar archivos temporales de sesión
   */
  private cleanupTempFiles(): void {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log('🧹 Archivos temporales de sesión limpiados');
      }
    } catch (error) {
      console.error('❌ Error limpiando archivos temporales:', error);
    }
  }

  /**
   * Restaurar estado desde base de datos
   */
  async restoreStateFromDatabase(userId: string): Promise<void> {
    try {
      console.log('🔄 Restaurando estado desde BD para usuario:', userId);
      
      const savedState = await this.databaseManager.loadConnectionState(userId);
      
      if (savedState.isConnected && savedState.sessionId) {
        Object.assign(this.state, savedState);
        
        console.log('✅ Estado restaurado desde BD:', {
          isConnected: this.state.isConnected,
          phoneNumber: this.state.phoneNumber,
          sessionId: this.state.sessionId
        });
        
        // Restaurar conexión de Baileys
        await this.restoreBaileysConnection(userId);
        
        // Verificar si la restauración fue exitosa
        if (this.state.socket?.user) {
          console.log('✅ Conexión de Baileys restaurada exitosamente');
        } else {
          console.log('⚠️ Estado en BD pero Baileys no se pudo restaurar, marcando como desconectado');
          this.state.isConnected = false;
        }
      } else {
        console.log('📥 No hay estado conectado para restaurar');
      }
      
    } catch (error) {
      console.error('❌ Error restaurando estado desde BD:', error);
      this.state.isConnected = false;
      this.state.socket = null;
    }
  }

  /**
   * Suscribirse a cambios de conexión
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback);
  }

  // ===== MÉTODOS PRIVADOS =====

  private ensureAuthDir(): void {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  /**
   * Crear auth state en memoria sin archivos locales
   */
  private async createInMemoryAuthState(existingCredentials?: any): Promise<{
    state: any;
    saveCreds: () => Promise<void>;
  }> {
    console.log('🧠 Creando auth state en memoria...');
    
    // Si hay credenciales existentes, usarlas
    if (existingCredentials) {
      console.log('📥 Usando credenciales existentes de BD');
      return {
        state: existingCredentials,
        saveCreds: async () => {
          // Guardar en BD cuando cambien las credenciales
          if (this.state.userId) {
            await this.databaseManager.saveBaileysCredentials(
              this.state.userId, 
              this.state.sessionId!, 
              existingCredentials
            );
          }
        }
      };
    }
    
    // Si no hay credenciales, crear nuevas
    console.log('🆕 Creando nuevas credenciales en memoria');
    const newCredentials = {
      registrationId: 0,
      noiseKey: { private: new Uint8Array(32), public: new Uint8Array(32) },
      signedIdentityKey: { private: new Uint8Array(32), public: new Uint8Array(32) },
      signedPreKey: { 
        keyPair: { private: new Uint8Array(32), public: new Uint8Array(32) },
        signature: new Uint8Array(64),
        keyId: 1
      },
      advSignedIdentityKey: { private: new Uint8Array(32), public: new Uint8Array(32) },
      processedHistoryMessages: [],
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      account: {
        details: null,
        accountSignatureKey: new Uint8Array(32),
        accountSignature: new Uint8Array(64),
        deviceSignature: new Uint8Array(64),
        deviceSignatureKey: new Uint8Array(32)
      },
      me: null,
      signalIdentities: [],
      appStateSyncKeys: {},
      appStateVersions: {},
      wallet: null,
      lastAccountSignedKeyId: 0,
      myAppStateKeyId: null,
      protocol: 0
    };
    
    return {
      state: newCredentials,
      saveCreds: async () => {
        // Guardar en BD cuando cambien las credenciales
        if (this.state.userId) {
          await this.databaseManager.saveBaileysCredentials(
            this.state.userId, 
            this.state.sessionId!, 
            newCredentials
          );
        }
      }
    };
  }

  private async loadConnectionState(userId: string): Promise<void> {
    const savedState = await this.databaseManager.loadConnectionState(userId);
    Object.assign(this.state, savedState);
  }

  /**
   * Restaurar sesión desde credenciales de la base de datos
   */
  private async restoreSessionFromDatabase(userId: string, credentials: any): Promise<QRCodeData> {
    try {
      console.log('🔄 Restaurando sesión desde credenciales de BD...');
      
      const userAuthDir = this.sessionManager.getUserAuthDir(this.state.sessionId!);
      
      // Crear directorio si no existe
      if (!fs.existsSync(userAuthDir)) {
        fs.mkdirSync(userAuthDir, { recursive: true });
      }
      
      // Guardar credenciales en archivo temporal
      const credsPath = path.join(userAuthDir, 'creds.json');
      fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));
      
      console.log('✅ Credenciales restauradas desde BD');
      
      // Configurar Baileys con las credenciales restauradas
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { state, saveCreds } = await useMultiFileAuthState(userAuthDir);
      
      this.state.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        ...BAILEYS_CONFIG,
        shouldIgnoreJid: jid => isJidBroadcast(jid),
        getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
        patchMessageBeforeSending: (msg) => {
          const requiresPatch = !!(msg.buttonsMessage || msg.templateMessage || msg.listMessage);
          if (requiresPatch) {
            msg = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                  ...msg,
                },
              },
            };
          }
          return msg;
        },
      });

      this.setupEventListeners(saveCreds, userAuthDir, userId);
      
      // Esperar autenticación
      console.log('⏳ Esperando autenticación de Baileys...');
      await this.waitForAuthentication(30000);
      
      if (this.state.isConnected) {
        console.log('✅ Sesión restaurada exitosamente desde BD');
        return {
          qrCode: '',
          sessionId: this.state.sessionId!,
          expiresAt: new Date(Date.now() + 60 * 1000)
        };
      } else {
        console.log('⚠️ Restauración fallida, generando nuevo QR...');
        return await this.waitForQRCodeOrAuth();
      }
      
    } catch (error) {
      console.error('❌ Error restaurando sesión desde BD:', error);
      // Si falla la restauración, continuar con nueva sesión
      return await this.waitForQRCodeOrAuth();
    }
  }

  private async restoreBaileysConnection(userId: string): Promise<void> {
    try {
      console.log('🔄 Restaurando conexión de Baileys...');
      
      if (this.state.socket?.user) {
        console.log('✅ Socket de Baileys ya está activo y autenticado');
        return;
      }
      
      // Intentar cargar credenciales desde la base de datos
      const savedCredentials = await this.databaseManager.loadBaileysCredentials(userId);
      
      const userAuthDir = this.sessionManager.getUserAuthDir(this.state.sessionId!);
      
      if (savedCredentials) {
        console.log('📥 Credenciales encontradas en BD, restaurando archivos...');
        
        // Crear directorio si no existe
        if (!fs.existsSync(userAuthDir)) {
          fs.mkdirSync(userAuthDir, { recursive: true });
        }
        
        // Restaurar credenciales a archivos desde BD
        const credsPath = path.join(userAuthDir, 'creds.json');
        fs.writeFileSync(credsPath, JSON.stringify(savedCredentials, null, 2));
        
        console.log('✅ Credenciales restauradas desde BD');
        
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { state, saveCreds } = await useMultiFileAuthState(userAuthDir);
        
        this.state.socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          ...BAILEYS_CONFIG,
          shouldIgnoreJid: jid => isJidBroadcast(jid),
          getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
          patchMessageBeforeSending: (msg) => {
            const requiresPatch = !!(msg.buttonsMessage || msg.templateMessage || msg.listMessage);
            if (requiresPatch) {
              msg = {
                viewOnceMessage: {
                  message: {
                    messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                    ...msg,
                  },
                },
              };
            }
            return msg;
          },
        });

        this.setupEventListeners(saveCreds, userAuthDir, userId);
        
        console.log('⏳ Esperando autenticación de Baileys...');
        await this.waitForAuthentication(30000);
        
        console.log('✅ Conexión de Baileys restaurada exitosamente desde BD');
        
      } else {
        console.log('📥 No hay credenciales guardadas en BD, verificando archivos locales...');
        
        const authFileInfo = await this.sessionManager.checkForValidAuthFiles(userAuthDir);
        
        // Solo limpiar si realmente no hay archivos de autenticación
        if (!authFileInfo.hasValidFiles && !fs.existsSync(userAuthDir)) {
          console.log('🧹 No hay directorio de autenticación, creando uno nuevo...');
          fs.mkdirSync(userAuthDir, { recursive: true });
        } else if (!authFileInfo.hasValidFiles) {
          console.log('⚠️ Archivos de autenticación incompletos, pero intentando restaurar...');
        }
        
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { state, saveCreds } = await useMultiFileAuthState(userAuthDir);
        
        this.state.socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          ...BAILEYS_CONFIG,
          shouldIgnoreJid: jid => isJidBroadcast(jid),
          getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
          patchMessageBeforeSending: (msg) => {
            const requiresPatch = !!(msg.buttonsMessage || msg.templateMessage || msg.listMessage);
            if (requiresPatch) {
              msg = {
                viewOnceMessage: {
                  message: {
                    messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                    ...msg,
                  },
                },
              };
            }
            return msg;
          },
        });

        this.setupEventListeners(saveCreds, userAuthDir, userId);
        
        console.log('⏳ Esperando autenticación de Baileys...');
        await this.waitForAuthentication(30000);
        
        console.log('✅ Conexión de Baileys restaurada exitosamente desde archivos');
      }
      
    } catch (error) {
      console.error('❌ Error restaurando conexión de Baileys:', error);
      this.state.isConnected = false;
      this.state.socket = null;
    }
  }

  private setupEventListeners(saveCreds: () => Promise<void>, userId: string): void {
    if (!this.state.socket) return;

    console.log('🔧 Configurando event listeners de Baileys...');

    // Guardar credenciales cuando cambien
    this.state.socket.ev.on('creds.update', async () => {
      await saveCreds();
      console.log('💾 Credenciales de Baileys actualizadas en BD');
    });

    // Manejar QR code
    this.state.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log('📡 Evento connection.update recibido:', { connection, hasQR: !!qr, hasLastDisconnect: !!lastDisconnect });

      if (qr) {
        console.log('📱 Nuevo QR code recibido, longitud:', qr.length);
        this.state.currentQR = qr;
        this.notifyConnectionCallbacks();
      }

             if (connection === 'close') {
         const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
         console.log('🔌 Conexión cerrada:', DISCONNECT_HANDLERS[statusCode as keyof typeof DISCONNECT_HANDLERS] || 'Razón desconocida');
         
         this.handleDisconnection(statusCode, userId);
       }

      if (connection === 'open') {
        console.log('🟢 WhatsApp conectado exitosamente!');
        this.state.isConnected = true;
        this.state.currentQR = null;
        this.notifyConnectionCallbacks();
        await this.databaseManager.saveConnectionState(this.state);
        
        // Iniciar health check solo cuando se conecte
        this.startConnectionHealthCheck();
      }
    });

    // Manejar mensajes entrantes
    this.state.socket.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && msg.message) {
        const messageText = WhatsAppUtils.extractMessageText(msg.message);
        const contactId = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
        
        await this.databaseManager.saveIncomingMessage({
          from: contactId,
          message: messageText,
          type: 'text',
          platform: 'whatsapp-lite',
          timestamp: new Date().toISOString()
        }, this.state.userId!);
      }
    });

    console.log('✅ Event listeners de Baileys configurados');
  }

  private async waitForQRCodeOrAuth(): Promise<QRCodeData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando QR code o autenticación'));
      }, 60000);

      const checkState = () => {
        console.log('🔍 Verificando estado:', {
          hasSocket: !!this.state.socket,
          hasUser: !!this.state.socket?.user,
          hasQR: !!this.state.currentQR,
          qrLength: this.state.currentQR?.length
        });
        
        if (this.state.socket?.user) {
          console.log('✅ Usuario autenticado, resolviendo sin QR');
          clearTimeout(timeout);
          resolve({
            qrCode: '',
            sessionId: this.state.sessionId!,
            expiresAt: new Date(Date.now() + 60 * 1000)
          });
        } else if (this.state.currentQR) {
          console.log('📱 QR encontrado, generando código QR...');
          clearTimeout(timeout);
          WhatsAppUtils.generateQRCode(this.state.currentQR, this.state.sessionId!)
            .then(resolve)
            .catch(reject);
        } else {
          console.log('⏳ Esperando QR o autenticación...');
          setTimeout(checkState, 1000);
        }
      };

      checkState();
    });
  }

  private async waitForAuthentication(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando autenticación de Baileys'));
      }, timeoutMs);

      const checkAuth = () => {
        if (this.state.socket?.user) {
          clearTimeout(timeout);
          console.log('✅ Baileys autenticado exitosamente');
          resolve();
        } else {
          setTimeout(checkAuth, 1000);
        }
      };

      checkAuth();
    });
  }

  private handleDisconnection(statusCode: number, userId?: string): void {
    console.log(`🔌 Desconexión detectada, código: ${statusCode}`);
    console.log(`⚠️ Reconexión automática DESHABILITADA temporalmente para debugging`);
    
    // TEMPORALMENTE DESHABILITADO
    this.state.isConnected = false;
    this.databaseManager.saveConnectionState(this.state);
    return;
    
    const delay = RECONNECT_DELAYS[statusCode as keyof typeof RECONNECT_DELAYS] || 0;
    
    if (delay > 0) {
      console.log(`🔄 Reconectando en ${delay}ms...`);
      setTimeout(() => this.autoReconnect(), delay);
    } else {
      console.log('❌ No se reconectará automáticamente');
      this.state.isConnected = false;
      this.databaseManager.saveConnectionState(this.state);
    }
  }

  private async autoReconnect(): Promise<void> {
    if (this.state.isReconnecting) {
      console.log('🔄 Ya hay una reconexión en progreso...');
      return;
    }

    this.state.isReconnecting = true;
    console.log('🔄 Iniciando reconexión automática...');

    try {
      if (!this.state.userId || !this.state.sessionId) {
        console.log('❌ No hay userId o sessionId para reconectar');
        return;
      }

      await this.restoreBaileysConnection(this.state.userId);
      console.log('✅ Reconexión automática completada');

    } catch (error) {
      console.error('❌ Error en reconexión automática:', error);
      this.state.isConnected = false;
      await this.databaseManager.saveConnectionState(this.state);
    } finally {
      this.state.isReconnecting = false;
    }
  }

  private startConnectionHealthCheck(): void {
    console.log('⚠️ Health check DESHABILITADO temporalmente para debugging');
    return;
    
    setInterval(async () => {
      try {
        if (this.state.socket && this.state.isConnected) {
          if (!this.state.socket.user) {
            console.log('⚠️ Socket perdió autenticación, marcando como desconectado');
            this.state.isConnected = false;
            await this.databaseManager.saveConnectionState(this.state);

            if (this.state.userId && !this.state.isReconnecting) {
              console.log('🔄 Iniciando reconexión por pérdida de autenticación...');
              await this.autoReconnect();
            }
          } else {
            this.state.lastActivity = new Date();
            
            // Guardar estado cada 5 minutos
            const now = new Date();
            const lastSave = this.state.lastActivity || new Date(0);
            const timeDiff = now.getTime() - lastSave.getTime();

            if (timeDiff > 5 * 60 * 1000) {
              await this.databaseManager.saveConnectionState(this.state);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error en health check:', error);
      }
    }, 30000);
  }

  private notifyConnectionCallbacks(): void {
    const status = {
      connected: this.state.isConnected,
      phoneNumber: this.state.phoneNumber || undefined
    };
    
    this.connectionCallbacks.forEach(callback => callback(status));
  }
}

// Exportar instancia singleton
export const whatsappLiteService = WhatsAppLiteService.getInstance(); 