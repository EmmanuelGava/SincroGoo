import { WASocket, makeWASocket } from 'baileys';
import { isJidBroadcast } from 'baileys';
import type { BaileysAuthState } from './AuthManager';
import { BAILEYS_CONFIG } from './BaileysConfig';
import { EventManager } from './EventManager';

export interface QRCodeData {
  qrCode: string;
  sessionId: string;
  expiresAt: Date;
}

// Clase de utilidades para WhatsApp
class WhatsAppUtils {
  static async generateQRCode(qrData: string, sessionId: string): Promise<QRCodeData> {
    try {
      // Generar QR como imagen base64 usando qrcode
      const QRCode = require('qrcode');
      
      const qrImageDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log('📱 QR generado como imagen base64, longitud:', qrImageDataUrl.length);
      
      return {
        qrCode: qrImageDataUrl,
        sessionId,
        expiresAt: new Date(Date.now() + 60 * 1000)
      };
    } catch (error) {
      console.error('❌ Error generando QR como imagen:', error);
      // Fallback: devolver el QR como texto
      return {
        qrCode: qrData,
        sessionId,
        expiresAt: new Date(Date.now() + 60 * 1000)
      };
    }
  }
}

export class ConnectionManager {
  private existingSocket: WASocket | null = null;
  private eventManager: EventManager | null = null;

  constructor(eventManager?: EventManager) {
    this.eventManager = eventManager || null;
  }

  /**
   * Limpiar socket existente
   */
  clearExistingSocket(): void {
    if (this.existingSocket) {
      try {
        this.existingSocket.end(new Error('Socket cleanup'));
        console.log('✅ Socket existente limpiado');
      } catch (error) {
        console.error('❌ Error limpiando socket existente:', error);
      }
      this.existingSocket = null;
    }
  }

  /**
   * Obtener socket existente
   */
  getExistingSocket(): WASocket | null {
    return this.existingSocket;
  }

  /**
   * Crear socket de Baileys con AuthState personalizado
   */
  createSocket(authState: BaileysAuthState): WASocket {
    console.log('🔧 Creando socket de Baileys...');
    
    // ✅ SOLUCIÓN: Verificar si ya hay un socket activo
    if (this.existingSocket && this.existingSocket.user) {
      console.log('✅ Reutilizando socket existente');
      return this.existingSocket;
    }
    
    console.log('🔧 AuthState recibido:', {
      hasState: !!authState.state,
      hasSaveCreds: !!authState.saveCreds,
      stateCreds: !!authState.state?.creds,
      stateKeys: !!authState.state?.keys,
      stateMe: authState.state?.creds?.me,
      stateRegistrationId: authState.state?.creds?.registrationId
    });
    
    try {
      // Validar que el authState tenga la estructura correcta
      if (!authState.state) {
        throw new Error('AuthState.state es requerido');
      }

      // Validar estructura mínima del auth state para evitar errores de noise handler
      if (!authState.state.creds) {
        console.log('⚠️ [ConnectionManager] Auth state sin credenciales, inicializando estructura básica...');
        authState.state.creds = {};
      }
      
      if (!authState.state.keys) {
        console.log('⚠️ [ConnectionManager] Auth state sin keys, inicializando estructura básica...');
        authState.state.keys = {};
      }

      // Verificar si hay credenciales válidas para evitar errores de noise handler
      const hasValidCreds = authState.state.creds && 
                           Object.keys(authState.state.creds).length > 0 &&
                           authState.state.creds.noiseKey;
      
      console.log('🔍 [ConnectionManager] Validación de credenciales:', {
        hasCreds: !!authState.state.creds,
        hasKeys: !!authState.state.keys,
        credsCount: authState.state.creds ? Object.keys(authState.state.creds).length : 0,
        hasNoiseKey: !!authState.state.creds?.noiseKey,
        hasValidCreds
      });

      // Configuración mínima para evitar problemas de compatibilidad
      const socketConfig = {
        auth: authState.state,
        browser: BAILEYS_CONFIG.browser,
        // ✅ SOLUCIÓN: Configuración para manejar errores 515
        connectTimeoutMs: 120000, // 2 minutos
        qrTimeout: 180000, // 3 minutos
        defaultQueryTimeoutMs: 120000, // 2 minutos
        retryRequestDelayMs: 2000, // 2 segundos entre reintentos
        maxMsgRetryCount: 5, // Más reintentos
        markOnlineOnConnect: BAILEYS_CONFIG.markOnlineOnConnect,
        keepAliveIntervalMs: 30000, // Keep-alive cada 30 segundos
        emitOwnEvents: BAILEYS_CONFIG.emitOwnEvents,
        shouldSyncFullHistory: BAILEYS_CONFIG.shouldSyncFullHistory,
        printQRInTerminal: BAILEYS_CONFIG.printQRInTerminal,
        syncFullHistory: BAILEYS_CONFIG.syncFullHistory,
        generateHighQualityLinkPreview: BAILEYS_CONFIG.generateHighQualityLinkPreview,
        logger: BAILEYS_CONFIG.logger,
        shouldIgnoreJid: (jid: string) => isJidBroadcast(jid),
        getMessage: async () => ({ conversation: 'Mensaje no disponible' }),
        patchMessageBeforeSending: (msg: any) => {
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
      };

      console.log('🔧 Configuración del socket:', {
        hasBrowser: !!socketConfig.browser,
        hasAuth: !!socketConfig.auth,
        timeouts: {
          connect: socketConfig.connectTimeoutMs,
          qr: socketConfig.qrTimeout,
          query: socketConfig.defaultQueryTimeoutMs
        }
      });

      // ✅ SOLUCIÓN: Guardar referencia al socket creado
      this.existingSocket = makeWASocket(socketConfig);
      
      // ✅ SOLUCIÓN: Agregar manejo de errores del socket
      this.existingSocket.ev.on('connection.update', (update) => {
        if (update.lastDisconnect?.error) {
          const error = update.lastDisconnect.error as any;
          console.log('🔍 Error de conexión detectado:', {
            code: error.output?.statusCode,
            message: error.message,
            type: error.type
          });
          
          // ✅ SOLUCIÓN: Manejar error 515 específicamente
          if (error.output?.statusCode === 515) {
            console.log('⚠️ Error 515 detectado - NO cerrar socket, permitir reconexión...');
            // ✅ SOLUCIÓN: Notificar al EventManager para manejar reconexión
            if (this.eventManager) {
              console.log('🔄 [ConnectionManager] Notificando error 515 al EventManager...');
              // El EventManager manejará la reconexión automáticamente
            }
            // NO cerrar el socket, permitir que se reconecte automáticamente
            // El error 515 es temporal y se resuelve solo
          }
        }
      });
      
      console.log('✅ Socket de Baileys creado exitosamente');
      
      return this.existingSocket;
      
    } catch (error) {
      console.error('❌ Error creando socket:', error);
      throw error;
    }
  }

  /**
   * Crear socket de Baileys con AuthState oficial de useMultiFileAuthState
   */
  createSocketWithAuthState(authState: any): WASocket {
    console.log('🔧 Creando socket de Baileys con AuthState oficial...');
    
    const socket = makeWASocket({
      auth: authState,
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

    console.log('✅ Socket de Baileys creado exitosamente con AuthState oficial');
    return socket;
  }

  /**
   * Esperar QR code o autenticación con manejo robusto de error 515
   */
  async waitForQRCodeOrAuth(
    socket: WASocket, 
    state: any,
    sessionId: string
  ): Promise<QRCodeData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando QR code o autenticación'));
      }, 180000); // 3 minutos para dar tiempo a la conexión móvil

      let qrReceived = false;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;

      // Escuchar QR directamente del socket
      const qrListener = (qr: string) => {
        console.log('📱 QR recibido directamente del socket!');
        qrReceived = true;
        
        WhatsAppUtils.generateQRCode(qr, sessionId)
          .then((qrData) => {
            // Emitir evento de Socket.IO para el QR
            this.emitSocketIOEvent('whatsapp-qr', qrData, state.userId);
            
            // NO resolver inmediatamente - esperar conexión móvil
            console.log('📱 QR enviado al cliente, esperando conexión móvil...');
            
            // Solo resolver si no hay conexión móvil después de un tiempo
            setTimeout(() => {
              if (!qrReceived || !socket?.user) {
                console.log('⏰ Resolviendo con QR después de timeout de espera móvil');
                clearTimeout(timeout);
                resolve(qrData);
              }
            }, 30000); // 30 segundos para conexión móvil
          })
          .catch(reject);
      };

      // Escuchar conexión exitosa
      const connectionListener = (update: any) => {
        console.log('🔍 Verificando conexión:', { 
          connection: update.connection, 
          hasUser: !!socket?.user,
          hasError: !!update.lastDisconnect?.error 
        });
        
        // Conexión exitosa
        if (update.connection === 'open' && socket?.user) {
          console.log('🎉 ¡Conexión móvil exitosa!');
          clearTimeout(timeout);
          socket.ev.off('connection.update', connectionListener);
          resolve({
            qrCode: '',
            sessionId,
            expiresAt: new Date(Date.now() + 60 * 1000)
          });
          return;
        }
        
        // Manejar error 515 específicamente
        if (update.connection === 'close') {
          const error = update.lastDisconnect?.error;
          const statusCode = error?.output?.statusCode;
          
          if (statusCode === 515 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Error 515 detectado - Reintento ${reconnectAttempts}/${maxReconnectAttempts}`);
            
            // NO rechazar, mantener esperando para reconexión
            setTimeout(() => {
              console.log('🔄 Manteniendo QR activo después de error 515...');
            }, 3000);
            
          } else if (statusCode !== 515) {
            console.log(`❌ Error de conexión no recuperable: ${statusCode}`);
            clearTimeout(timeout);
            reject(new Error(`Error de conexión: ${statusCode}`));
          }
        }
        
        // Verificar autenticación sin conexión 'open'
        if (socket?.user && !qrReceived) {
          console.log('✅ Usuario autenticado detectado (sin conexión open)!');
          clearTimeout(timeout);
          socket.ev.off('connection.update', connectionListener);
          resolve({
            qrCode: '',
            sessionId,
            expiresAt: new Date(Date.now() + 60 * 1000)
          });
        }
      };

      // Agregar listeners
      socket.ev.on('connection.update', (update) => {
        console.log('📡 Update directo:', { 
          connection: update.connection, 
          hasQR: !!update.qr,
          hasError: !!update.lastDisconnect?.error 
        });
        
        if (update.qr && !qrReceived) {
          qrListener(update.qr);
        } else {
          connectionListener(update);
        }
      });

      // Agregar listener para creds.update (autenticación exitosa)
      socket.ev.on('creds.update', () => {
        console.log('🔄 Creds actualizadas, verificando autenticación móvil...');
        
        setTimeout(() => {
          if (socket?.user && qrReceived) {
            console.log('🎉 ¡Autenticación móvil exitosa detectada!');
            clearTimeout(timeout);
            socket.ev.off('connection.update', connectionListener);
            resolve({
              qrCode: '',
              sessionId,
              expiresAt: new Date(Date.now() + 60 * 1000)
            });
          }
        }, 2000);
      });

      // Limpiar listeners en caso de timeout
      setTimeout(() => {
        socket.ev.off('connection.update', connectionListener);
      }, 179000);
    });
  }

  /**
   * Esperar autenticación específica
   */
  async waitForAuthentication(socket: WASocket, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando autenticación de Baileys'));
      }, timeoutMs);

      const checkAuth = () => {
        if (socket?.user) {
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

  /**
   * Emitir evento de Socket.IO
   */
  private emitSocketIOEvent(event: string, data: any, userId: string): void {
    try {
      // Verificar si las funciones globales de Socket.IO están disponibles
      if (typeof global !== 'undefined' && (global as any).emitToUser) {
        (global as any).emitToUser(userId, event, data);
        console.log(`📡 [Socket.IO] Evento ${event} emitido a usuario ${userId}:`, data);
      } else {
        console.log('⚠️ [Socket.IO] Funciones globales no disponibles');
      }
    } catch (error) {
      console.error('❌ [Socket.IO] Error emitiendo evento:', error);
    }
  }
} 