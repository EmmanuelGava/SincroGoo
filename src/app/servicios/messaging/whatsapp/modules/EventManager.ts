import { WASocket } from 'baileys';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DatabaseManager } from './DatabaseManager';
import QRCode from 'qrcode';

export type ConnectionCallback = (status: { connected: boolean; phoneNumber?: string }) => void;

export interface WhatsAppState {
  isConnected: boolean;
  currentQR: string | null;
  phoneNumber: string | null;
  lastActivity: Date | null;
  userId: string | null;
  sessionId: string | null;
  socket: WASocket | null;
  isReconnecting: boolean;
  lastError?: any;
}

export class EventManager {
  private databaseManager: DatabaseManager;
  private connectionCallbacks: ConnectionCallback[] = [];
  private lastSaveTime: number = 0;
  private saveDebounceMs: number = 2000; // Evitar guardados múltiples en 2 segundos
  private isProcessingAuth: boolean = false; // Evitar procesamiento múltiple de autenticación

  /**
   * Guardar estado de conexión con debounce para evitar duplicados
   */
  private async saveConnectionStateDebounced(state: WhatsAppState): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveTime < this.saveDebounceMs) {
      console.log('⏳ Guardado de estado omitido (debounce activo)');
      return;
    }

    this.lastSaveTime = now;
    try {
      await this.databaseManager.saveConnectionState(state);
      console.log('✅ Estado de conexión guardado en BD (debounced)');
    } catch (error) {
      console.error('❌ Error guardando estado de conexión:', error);
    }
  }

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Configurar event listeners de Baileys (versión optimizada)
   */
  setupEventListeners(
    socket: WASocket,
    saveCreds: () => Promise<void>,
    userId: string,
    state: WhatsAppState
  ): void {
    console.log('🔧 Configurando event listeners de Baileys (versión optimizada)...');

    // Event listener para credenciales
    socket.ev.on('creds.update', async () => {
      console.log('🔄 [EventManager] Credenciales actualizadas');
      console.log('🔄 [EventManager] Socket user después de creds.update:', socket.user);
      console.log('🔄 [EventManager] Estado del socket:', {
        hasUser: !!socket.user,
        userId: socket.user?.id,
        phoneNumber: socket.user?.id ? socket.user.id.replace('@s.whatsapp.net', '') : null
      });
      
      try {
        await saveCreds();
        console.log('✅ [EventManager] Credenciales guardadas en archivos');
        
        // ✅ SOLUCIÓN: Actualizar localStorage con credenciales completas
        if (socket.user && socket.user.id) {
          console.log('📱 [EventManager] Usuario detectado, actualizando localStorage...');
          
          // Importar WhatsAppStorage para actualizar número de teléfono
          const WhatsAppStorageModule = await import('@/lib/whatsapp-storage');
          const WhatsAppStorage = WhatsAppStorageModule.WhatsAppStorage;
          const phoneNumber = socket.user.id.split('@')[0] || socket.user.id.split(':')[0];
          WhatsAppStorage.updatePhoneNumber(userId, phoneNumber);
          
          console.log('✅ [EventManager] Usuario autenticado detectado inmediatamente en creds.update');
          await this.verifyRealAuthentication(socket, state, userId);
        } else {
          // Si no hay usuario inmediatamente, intentar varias veces con más frecuencia
          let attempts = 0;
          const maxAttempts = 30; // Aumentar intentos
          const checkInterval = setInterval(async () => {
            attempts++;
            console.log(`🔍 [EventManager] Verificando autenticación (intento ${attempts}/${maxAttempts})...`);
            
            if (socket.user && socket.user.id && !state.isConnected) {
              console.log('✅ [EventManager] Usuario autenticado encontrado en intento:', attempts);
              clearInterval(checkInterval);
              await this.verifyRealAuthentication(socket, state, userId);
            } else if (attempts >= maxAttempts) {
              console.log('⚠️ [EventManager] No se encontró usuario autenticado después de', maxAttempts, 'intentos');
              clearInterval(checkInterval);
              
              // Como último recurso, intentar reconexión
              if (!state.isReconnecting) {
                console.log('🔄 [EventManager] Intentando reconexión como último recurso...');
                await this.attemptReconnectionAfter515(userId, state);
              }
            }
          }, 500); // Verificar cada 500ms (más frecuente)
        }
        
        // ✅ SOLUCIÓN: Verificación adicional después de más tiempo
        setTimeout(async () => {
          console.log('🔍 [EventManager] Verificación adicional de autenticación...');
          console.log('🔍 [EventManager] Socket user en verificación adicional:', socket.user);
          
          if (socket.user && socket.user.id) {
            console.log('✅ [EventManager] Usuario encontrado en verificación adicional:', socket.user.id);
            await this.verifyRealAuthentication(socket, state, userId);
          } else {
            console.log('⚠️ [EventManager] Aún no hay usuario en verificación adicional');
          }
        }, 5000); // Esperar 5 segundos adicionales
        
      } catch (error) {
        console.error('❌ [EventManager] Error guardando credenciales:', error);
      }
    });

    // Event listener para actualizaciones de conexión
    socket.ev.on('connection.update', async (update) => {
      console.log('📡 [EventManager] Connection update:', {
        connection: update.connection,
        hasQR: !!update.qr,
        qrLength: update.qr ? update.qr.length : 0,
        hasError: !!update.lastDisconnect?.error,
        hasUser: !!socket.user,
        currentPhoneNumber: socket.user?.id || null,
        timestamp: new Date().toISOString()
      });

      // ✅ SOLUCIÓN: Logs detallados para debugging de conexión
      if (update.connection) {
        console.log('🔗 [EventManager] Estado de conexión:', update.connection);
        console.log('🔗 [EventManager] Socket user:', socket.user);
        console.log('🔗 [EventManager] Socket auth state:', {
          hasUser: !!socket.user,
          userId: socket.user?.id,
          phoneNumber: socket.user?.id ? socket.user.id.replace('@s.whatsapp.net', '') : null
        });
      }

      // ✅ SOLUCIÓN: Manejar error 515 específicamente
      if (update.lastDisconnect?.error) {
        const error = update.lastDisconnect.error as any;
        const statusCode = error.output?.statusCode;
        
        console.log('🔌 [EventManager] Conexión cerrada:', statusCode);
        console.log('🔌 [EventManager] Error completo:', error);
        
        // Guardar error para posible limpieza futura
        state.lastError = error;
        
        if (statusCode === 515) {
          console.log('🔄 [EventManager] Error 515 - Manejo inteligente (NO crear nueva sesión)...');
          
          // ✅ SOLUCIÓN: Error 515 es normal después del emparejamiento
          // NO crear nueva sesión, solo esperar a que el socket se reconecte
          state.isReconnecting = true;
          
          // ✅ SOLUCIÓN: Forzar reconexión completa después de error 515
          console.log('🔄 [EventManager] Iniciando reconexión completa después de error 515...');
          
          // Intentar reconexión inmediata
          this.attemptReconnectionAfter515(userId, state);
          
          return;
        }
      }

      // Procesar QR code
      if (update.qr) {
        console.log('📱 [EventManager] QR code recibido - Longitud:', update.qr.length);
        console.log('📱 [EventManager] QR code preview:', update.qr.substring(0, 50) + '...');
        console.log('📱 [EventManager] Timestamp QR:', new Date().toISOString());
        
        state.currentQR = update.qr;
        state.isConnected = false;
        state.phoneNumber = null;
        
        // Notificar al frontend
        await this.notifyQRCode(state, update.qr);
        
        console.log('📱 [EventManager] QR code procesado y notificado al frontend');
      }

      // ✅ SOLUCIÓN: Verificar conexión REAL
      if (update.connection === 'open') {
        console.log('🎉 [EventManager] Conexión abierta detectada!');
        console.log('🔍 [EventManager] Verificando conexión REAL...');
        console.log('👤 [EventManager] Socket user en conexión abierta:', socket.user?.id);
        
        // Cancelar cualquier reconexión en progreso
        state.isReconnecting = false;
        
        await this.verifyRealAuthentication(socket, state, userId);
      }
      
      // ✅ SOLUCIÓN: Detectar cuando la conexión se restablece después del error 515
      if (update.connection === 'connecting' && state.lastError?.output?.statusCode === 515) {
        console.log('🔄 [EventManager] Reconexión detectada después de error 515');
        console.log('👤 [EventManager] Socket user durante reconexión:', socket.user?.id);
      }

      // Procesar desconexión
      if (update.connection === 'close' && !update.lastDisconnect?.error) {
        console.log('🔌 Conexión cerrada normalmente');
        state.isConnected = false;
        state.phoneNumber = null;
        state.currentQR = null;
        
        // Guardar estado en BD
        await this.databaseManager.saveConnectionState(state);
        
        // Notificar al frontend
        this.notifyConnectionUpdate(state);
      }

      // ✅ SOLUCIÓN: Manejar reconexión
      if (update.connection === 'connecting') {
        console.log('🔄 Reconectando...');
        state.isConnected = false;
        // NO generar nuevo QR si ya tenemos uno válido
        if (!state.currentQR) {
          this.notifyConnectionUpdate(state);
        }
      }

      console.log('📡 Update directo:', {
        connection: update.connection,
        hasQR: !!update.qr,
        hasError: !!update.lastDisconnect?.error
      });
    });

    // Event listener para mensajes
    socket.ev.on('messages.upsert', async (m) => {
      console.log('📨 Mensaje recibido:', m.messages.length, 'mensajes');
      
      for (const message of m.messages) {
        if (message.key.fromMe) continue;
        
        console.log('📨 Procesando mensaje de:', message.key.remoteJid);
        
        // Procesar mensaje aquí
        // TODO: Implementar lógica de procesamiento de mensajes
      }
    });

    console.log('✅ Event listeners configurados (versión optimizada)');
  }

  /**
   * ✅ SOLUCIÓN: Verificar autenticación REAL
   */
  private async verifyRealAuthentication(socket: WASocket, state: WhatsAppState, userId: string): Promise<void> {
    try {
      console.log('🔍 [EventManager] Iniciando verificación de autenticación REAL...');
      console.log('🔍 [EventManager] Socket object:', {
        hasSocket: !!socket,
        hasUser: !!socket.user,
        userId: socket.user?.id,
        socketKeys: socket ? Object.keys(socket) : []
      });

      // Verificar que realmente hay un usuario autenticado
      if (!socket.user || !socket.user.id) {
        console.log('⚠️ [EventManager] Socket no tiene usuario autenticado');
        console.log('🔍 [EventManager] Socket user:', socket.user);
        return;
      }

      console.log('🔍 [EventManager] Verificando autenticación REAL...');
      console.log('📱 [EventManager] Usuario del socket:', socket.user.id);
      console.log('📱 [EventManager] Estado actual:', {
        isConnected: state.isConnected,
        phoneNumber: state.phoneNumber,
        hasUser: !!socket.user
      });

      // ✅ SOLUCIÓN: Extraer número de teléfono correctamente
      let phoneNumber = socket.user.id;
      
      // Limpiar el número de teléfono
      if (phoneNumber.includes('@')) {
        phoneNumber = phoneNumber.split('@')[0];
      }
      if (phoneNumber.includes(':')) {
        phoneNumber = phoneNumber.split(':')[0];
      }
      
      if (!phoneNumber || phoneNumber === 'undefined' || phoneNumber.length < 10) {
        console.log('❌ [EventManager] Número de teléfono inválido:', phoneNumber);
        return;
      }

      console.log('✅ [EventManager] Autenticación REAL verificada:', phoneNumber);
      
      // Actualizar estado solo si realmente está autenticado
      state.isConnected = true;
      state.phoneNumber = phoneNumber;
      state.currentQR = null;
      state.lastActivity = new Date();
      state.isReconnecting = false;
      
      console.log('✅ [EventManager] Estado actualizado después de autenticación:', {
        isConnected: state.isConnected,
        phoneNumber: state.phoneNumber,
        hasQR: !!state.currentQR
      });
      
      // Guardar estado en BD
      await this.databaseManager.saveConnectionState(state);
      console.log('💾 [EventManager] Estado de conexión guardado en BD');
      
      // Notificar al frontend
      this.notifyConnectionUpdate(state);
      console.log('📡 [EventManager] Frontend notificado de conexión exitosa');
      
      // Emitir evento de conexión exitosa
      if (typeof global !== 'undefined' && (global as any).emitToUser && state.userId) {
        (global as any).emitToUser(state.userId, 'whatsapp-connected', { phoneNumber });
        console.log('🎉 [EventManager] Evento whatsapp-connected emitido:', { phoneNumber });
        
        // También emitir estado actualizado
        (global as any).emitToUser(state.userId, 'whatsapp-status', {
          connected: true,
          phoneNumber: phoneNumber,
          lastActivity: new Date()
        });
        console.log('📡 [EventManager] Estado actualizado emitido después de conexión exitosa');
      } else {
        console.log('⚠️ [EventManager] No se pudo emitir evento whatsapp-connected:', {
          hasGlobal: typeof global !== 'undefined',
          hasEmitToUser: typeof global !== 'undefined' && !!(global as any).emitToUser,
          userId: state.userId
        });
      }
      
    } catch (error) {
      console.error('❌ [EventManager] Error verificando autenticación REAL:', error);
    }
  }

  /**
   * Manejar desconexión
   */
  private handleDisconnection(statusCode: number, userId: string, state: WhatsAppState): void {
    console.log(`🔌 Desconexión detectada, código: ${statusCode}`);
    
    state.isConnected = false;
    
    // Solo guardar en BD si previamente estaba conectado
    if (state.phoneNumber) {
      this.databaseManager.saveConnectionState(state);
    }

    // Para error 515, intentar reconexión rápida
    if (statusCode === 515 && !state.isReconnecting) {
      console.log('🔄 Error 515 - Intentando reconexión...');
      this.attemptQuickReconnection(userId, state);
    }
    
    this.notifyConnectionCallbacks(state);
  }

  /**
   * Reconexión específica para error 515
   */
  private async attemptReconnectionAfter515(userId: string, state: WhatsAppState): Promise<void> {
    console.log('🔄 [EventManager] Iniciando reconexión inteligente después de error 515...');
    
    try {
      state.isReconnecting = true;
      
      // ✅ SOLUCIÓN: Esperar más tiempo para que las credenciales se procesen
      console.log('⏳ [EventManager] Esperando procesamiento de credenciales...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar si el socket ahora tiene usuario después del procesamiento
      if (state.socket && state.socket.user && state.socket.user.id) {
        console.log('✅ [EventManager] Usuario encontrado después de espera:', state.socket.user.id);
        await this.verifyRealAuthentication(state.socket, state, userId);
        return;
      }
      
      // Si aún no hay usuario, intentar recargar credenciales
      console.log('🔄 [EventManager] Recargando credenciales en socket existente...');
      
      // Verificar si hay credenciales guardadas
      if (!state.sessionId) return;
      const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
      const authDir = path.join(tempDir, 'whatsapp_auth', state.sessionId);
      
      console.log('🔍 [EventManager] Verificando directorio de credenciales:', authDir);
      
      if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir);
        console.log('📁 [EventManager] Credenciales encontradas:', files.length, 'archivos');
        console.log('📄 [EventManager] Archivos:', files.join(', '));
        console.log('📁 [EventManager] Esperando reconexión automática...');
        
        // ✅ SOLUCIÓN: Esperar reconexión automática del socket original
        console.log('⏳ [EventManager] Esperando reconexión automática después de error 515...');
        
        // El error 515 es temporal, Baileys debería reconectarse automáticamente
        // Esperar más tiempo para que el socket se estabilice
        let attempts = 0;
        const maxAttempts = 60; // Esperar hasta 60 segundos
        
        const checkReconnection = setInterval(async () => {
          attempts++;
          console.log(`🔍 [EventManager] Esperando reconexión automática (${attempts}/${maxAttempts})...`);
          
          // Verificar si el socket original ahora tiene usuario
          if (state.socket && state.socket.user && state.socket.user.id) {
            console.log('✅ [EventManager] Reconexión automática exitosa:', state.socket.user.id);
            clearInterval(checkReconnection);
            state.isReconnecting = false;
            await this.verifyRealAuthentication(state.socket, state, userId);
          } else if (attempts >= maxAttempts) {
            console.log('⚠️ [EventManager] Timeout esperando reconexión automática');
            clearInterval(checkReconnection);
            state.isReconnecting = false;
            
            // Mantener QR activo para intento manual
            state.isConnected = false;
            state.phoneNumber = null;
            this.notifyConnectionUpdate(state);
          }
        }, 1000); // Verificar cada segundo
        
      } else {
        console.log('❌ [EventManager] No se encontraron credenciales guardadas en:', authDir);
        
        // Verificar si existe el directorio padre
        const parentDir = path.dirname(authDir);
        if (fs.existsSync(parentDir)) {
          const parentFiles = fs.readdirSync(parentDir);
          console.log('📂 [EventManager] Directorio padre existe con:', parentFiles.length, 'elementos');
          console.log('📄 [EventManager] Elementos:', parentFiles.join(', '));
        } else {
          console.log('📂 [EventManager] Directorio padre no existe:', parentDir);
        }
        
        state.isReconnecting = false;
      }
      
    } catch (error) {
      console.error('❌ [EventManager] Error en reconexión después de error 515:', error);
      state.isReconnecting = false;
    }
  }

  /**
   * Reconexión rápida para error 515
   */
  private async attemptQuickReconnection(userId: string, state: WhatsAppState): Promise<void> {
    if (state.isReconnecting) return;
    
    state.isReconnecting = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
      await whatsappLiteService.connect(userId);
      
      console.log('✅ Reconexión exitosa');
    } catch (error) {
      console.error('❌ Error en reconexión:', error);
    } finally {
      state.isReconnecting = false;
    }
  }

  /**
   * Extraer texto del mensaje
   */
  private extractMessageText(message: any): string {
    return message.conversation || 
           message.extendedTextMessage?.text || 
           message.imageMessage?.caption || 
           '';
  }

  /**
   * Agregar callback de conexión
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Notificar cambios de conexión
   */
  notifyConnectionCallbacks(state: WhatsAppState): void {
    const isConnected = !!state.phoneNumber;
    
    const status = {
      connected: isConnected,
      phoneNumber: state.phoneNumber || undefined
    };
    
    this.connectionCallbacks.forEach(callback => callback(status));
    
    // Emitir evento de Socket.IO
    if (state.userId) {
      this.emitSocketIOEvent('whatsapp-status', status, state.userId);
    }
  }

  /**
   * Notificar actualización de conexión al frontend
   */
  private notifyConnectionUpdate(state: WhatsAppState): void {
    try {
      const status = {
        connected: state.isConnected,
        phoneNumber: state.phoneNumber,
        lastActivity: state.lastActivity
      };
      
      console.log('📡 [EventManager] Evento whatsapp-status enviado a usuario', state.userId, ':', status);
      
      // ✅ SOLUCIÓN: Usar las funciones globales correctas de Socket.IO
      if (typeof global !== 'undefined' && (global as any).emitToUser && state.userId) {
        (global as any).emitToUser(state.userId, 'whatsapp-status', status);
        console.log('📡 [EventManager] Evento whatsapp-status emitido:', status);
      } else {
        console.log('⚠️ [EventManager] Socket.IO no está disponible o userId es null:', {
          hasGlobal: typeof global !== 'undefined',
          hasEmitToUser: typeof global !== 'undefined' && !!(global as any).emitToUser,
          userId: state.userId
        });
      }
      
      // Notificar callbacks locales
      this.notifyConnectionCallbacks(state);
    } catch (error) {
      console.error('❌ [EventManager] Error notificando actualización de conexión:', error);
    }
  }

  /**
   * Notificar QR code al frontend
   */
  private async notifyQRCode(state: WhatsAppState, qrCode: string): Promise<void> {
    try {
      console.log('📱 [EventManager] QR recibido directamente del socket!');
      console.log('📱 [EventManager] Longitud del QR code:', qrCode.length);
      console.log('📱 [EventManager] Preview del QR (primeros 100 chars):', qrCode.substring(0, 100));
      console.log('📱 [EventManager] Usuario ID:', state.userId);
      console.log('📱 [EventManager] Session ID:', state.sessionId);
      
      // ✅ SOLUCIÓN: Generar una imagen QR válida
      const qrImage = await QRCode.toDataURL(qrCode);
      console.log('📱 [EventManager] QR generado como imagen base64, longitud:', qrImage.length);
      console.log('📱 [EventManager] Preview de imagen QR:', qrImage.substring(0, 100) + '...');
      
      const qrData = {
        qrCode: qrImage,
        sessionId: state.sessionId,
        expiresAt: new Date(Date.now() + 60 * 1000) // 1 minuto
      };
      
      console.log('📡 [EventManager] Evento whatsapp-qr enviado a usuario', state.userId, ':', {
        sessionId: qrData.sessionId,
        expiresAt: qrData.expiresAt,
        qrCodeLength: qrData.qrCode.length
      });
      
      // ✅ SOLUCIÓN: Usar las funciones globales correctas de Socket.IO
      if (typeof global !== 'undefined' && (global as any).emitToUser && state.userId) {
        (global as any).emitToUser(state.userId, 'whatsapp-qr', qrData);
        console.log('📡 [EventManager] [Socket.IO] Evento whatsapp-qr emitido a usuario', state.userId);
      } else {
        console.log('⚠️ [EventManager] Socket.IO no está disponible o userId es null:', {
          hasGlobal: typeof global !== 'undefined',
          hasEmitToUser: typeof global !== 'undefined' && !!(global as any).emitToUser,
          userId: state.userId
        });
      }
      
      console.log('📱 [EventManager] QR enviado al cliente, esperando conexión móvil...');
      console.log('📱 [EventManager] Timestamp de envío:', new Date().toISOString());
    } catch (error) {
      console.error('❌ [EventManager] Error notificando QR code:', error);
    }
  }

  /**
   * Emitir evento de Socket.IO
   */
  private emitSocketIOEvent(event: string, data: any, userId: string): void {
    try {
      if (typeof global !== 'undefined' && (global as any).emitToUser) {
        (global as any).emitToUser(userId, event, data);
        console.log(`📡 Evento ${event} emitido:`, data);
      }
    } catch (error) {
      console.error('❌ Error emitiendo evento:', error);
    }
  }
}