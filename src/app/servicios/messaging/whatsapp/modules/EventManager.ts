import { WASocket } from 'baileys';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { DatabaseManager } from './DatabaseManager';
import QRCode from 'qrcode';
import {
  getDisconnectStatusCode,
  isPermanentDisconnect,
  isWaSocketOpen,
} from './socketHealth';
import { RECONNECT_DELAYS } from './BaileysConfig';
import {
  CATCHUP_OPEN_DELAY_MS,
  catchupKnownChats,
  extractHistoryBody,
  isCatchupJid,
  isWithinCatchupWindow,
  markDisconnectAt,
} from './historyCatchup';

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
  /** Cuando es true, el próximo connect() preserva el directorio temporal (reconexión tras 515). */
  preserve515?: boolean;
}

export class EventManager {
  private databaseManager: DatabaseManager;
  private attachedSockets = new WeakSet<WASocket>();
  private connectionCallbacks: ConnectionCallback[] = [];
  private lastSaveTime: number = 0;
  private saveDebounceMs: number = 2000; // Evitar guardados múltiples en 2 segundos
  private isProcessingAuth: boolean = false; // Evitar procesamiento múltiple de autenticación
  private reconnectHandler: ((userId: string) => Promise<void>) | null = null;
  private contactBook = new Map<string, { name?: string; notify?: string }>();
  private catchupSockets = new WeakSet<WASocket>();

  setReconnectHandler(handler: (userId: string) => Promise<void>): void {
    this.reconnectHandler = handler;
  }

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

  private rememberContacts(contacts: Array<{ id?: string; name?: string; notify?: string; verifiedName?: string }> | undefined) {
    if (!Array.isArray(contacts)) return;
    for (const contact of contacts) {
      if (!contact?.id) continue;
      const previous = this.contactBook.get(contact.id) || {};
      this.contactBook.set(contact.id, {
        name: contact.name || previous.name,
        notify: contact.notify || contact.verifiedName || previous.notify,
      });
      const digits = contact.id.split('@')[0];
      if (digits && digits !== contact.id) {
        this.contactBook.set(digits, this.contactBook.get(contact.id)!);
      }
    }
  }

  private contactLabel(jid: string, sendJid?: string, pushName?: string | null): string | undefined {
    const fromBook =
      this.contactBook.get(jid)
      || this.contactBook.get(jid.split('@')[0])
      || (sendJid ? this.contactBook.get(sendJid) : undefined)
      || (sendJid ? this.contactBook.get(sendJid.split('@')[0]) : undefined);
    const label = (fromBook?.name || fromBook?.notify || pushName || '').trim();
    return label || undefined;
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
    if (this.attachedSockets.has(socket)) {
      console.log('⏭️ Listeners ya estaban en este socket, no se duplican');
      return;
    }
    this.attachedSockets.add(socket);

    socket.ev.on('contacts.upsert', (contacts) => {
      this.rememberContacts(contacts);
    });
    socket.ev.on('contacts.update', (contacts) => {
      this.rememberContacts(contacts);
    });

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
              // No reconectar acá: si fue un 515, attemptReconnectionAfter515 ya se ocupó.
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

      if (update.connection === 'close') {
        const error = update.lastDisconnect?.error;
        const statusCode = getDisconnectStatusCode(error);
        console.log('🔌 [EventManager] Conexión cerrada:', statusCode, error instanceof Error ? error.message : error);

        markDisconnectAt();
        state.lastError = error;
        state.isConnected = false;
        state.socket = null;
        state.currentQR = null;

        if (isPermanentDisconnect(statusCode)) {
          console.log('❌ [EventManager] Desconexión permanente, hay que escanear el QR de nuevo');
          state.phoneNumber = null;
          await this.databaseManager.saveConnectionState(state);
          if (state.sessionId) {
            await this.databaseManager.invalidateSessionCredentials(state.sessionId);
          }
          this.notifyConnectionUpdate(state);
          return;
        }

        // 428 Connection Closed, 408 lost, 440 replaced, 515 restart, etc.
        console.log('🔄 [EventManager] Cierre transitorio, se recreará el socket. código:', statusCode);
        state.lastError = undefined;
        this.scheduleReconnect(userId, state, statusCode);
        this.notifyConnectionUpdate(state);
        return;
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
        this.scheduleKnownChatsCatchup(socket);
      }
      
      // ✅ SOLUCIÓN: Detectar cuando la conexión se restablece después del error 515
      if (update.connection === 'connecting' && state.lastError?.output?.statusCode === 515) {
        console.log('🔄 [EventManager] Reconexión detectada después de error 515');
        console.log('👤 [EventManager] Socket user durante reconexión:', socket.user?.id);
      }

      // Reconexiones internas de Baileys: no marcar desconectado si ya hay sesión viva.
      if (update.connection === 'connecting') {
        console.log('🔄 Reconectando...');
        if (!state.phoneNumber) {
          state.isConnected = false;
          if (!state.currentQR) {
            this.notifyConnectionUpdate(state);
          }
        }
      }

      console.log('📡 Update directo:', {
        connection: update.connection,
        hasQR: !!update.qr,
        hasError: !!update.lastDisconnect?.error
      });
    });

    socket.ev.on('messages.upsert', async (m) => {
      console.log('📨 Mensaje recibido:', m.messages.length, 'mensajes');
      for (const message of m.messages) {
        await this.ingestIncomingWaMessage(socket, userId, message, { allowMediaPlaceholder: false, applyCatchupWindow: false });
      }
    });

    socket.ev.on('messaging-history.set', async (payload) => {
      const messages = payload?.messages || [];
      this.rememberContacts(payload?.contacts);
      console.log('📚 [EventManager] messaging-history.set:', messages.length, 'msgs, syncType=', payload?.syncType);
      for (const message of messages) {
        await this.ingestIncomingWaMessage(socket, userId, message, { allowMediaPlaceholder: true, applyCatchupWindow: true });
      }
    });

    console.log('✅ Event listeners configurados (versión optimizada)');
  }

  private async ingestIncomingWaMessage(
    socket: WASocket,
    userId: string,
    message: any,
    options: { allowMediaPlaceholder: boolean; applyCatchupWindow: boolean }
  ): Promise<void> {
    if (message?.key?.fromMe) return;
    const jid = message?.key?.remoteJid || '';
    if (!isCatchupJid(jid)) return;

    const timestampMs = toWhatsAppTimestampMs(message.messageTimestamp);
    if (options.applyCatchupWindow && !isWithinCatchupWindow(timestampMs)) {
      return;
    }

    const text = extractIncomingText(message.message);
    const historyBody = options.allowMediaPlaceholder ? extractHistoryBody(message.message) : null;
    const body = text
      ? { text, type: 'text' as const }
      : historyBody;

    if (!body) {
      if (!options.allowMediaPlaceholder) {
        console.log('📨 Mensaje sin texto usable, se omite:', jid, Object.keys(message.message || {}));
      }
      return;
    }

    const { resolveWhatsAppPeer } = await import('@/lib/whatsapp/peerIdentity');
    const key = message.key as { remoteJid?: string | null; remoteJidAlt?: string | null };
    const peer = await resolveWhatsAppPeer(socket, jid, { remoteJidAlt: key.remoteJidAlt });
    const contactName = this.contactLabel(jid, peer.sendJid, message.pushName);
    const waMessageId = message.key?.id ? String(message.key.id) : undefined;
    console.log('📨 Procesando mensaje de:', peer.phone, jid, peer.resolved ? 'teléfono' : 'sin resolver', contactName, waMessageId);
    await forwardIncomingToApp({
      from: peer.resolved ? peer.phone : (jid.split('@')[0] || peer.phone),
      fromJid: peer.sendJid,
      phone: peer.resolved ? peer.phone : undefined,
      message: body.text,
      type: 'text',
      contactName,
      userId,
      timestamp: timestampMs,
      waMessageId,
    });
    if (typeof global !== 'undefined' && (global as any).emitToUser) {
      (global as any).emitToUser(userId, 'whatsapp-message', {
        from: peer.phone,
        fromJid: peer.sendJid,
        message: body.text,
      });
    }
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

      try {
        await socket.sendPresenceUpdate('available');
        console.log('🟢 [EventManager] Presencia available enviada');
      } catch (error) {
        console.warn('⚠️ [EventManager] No se pudo marcar presencia online:', error);
      }
      
      console.log('✅ [EventManager] Estado actualizado después de autenticación:', {
        isConnected: state.isConnected,
        phoneNumber: state.phoneNumber,
        hasQR: !!state.currentQR
      });
      
      // Guardar estado en BD
      await this.databaseManager.saveConnectionState(state);
      console.log('💾 [EventManager] Estado de conexión guardado en BD');

      if (state.userId) {
        await this.databaseManager.saveLiteMessagingConfig(state.userId, phoneNumber);
      }
      
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

  private scheduleKnownChatsCatchup(socket: WASocket): void {
    if (this.catchupSockets.has(socket)) return;
    this.catchupSockets.add(socket);
    setTimeout(() => {
      catchupKnownChats(socket).catch((error) => {
        console.warn('⚠️ [EventManager] Catch-up de chats conocidos falló:', error);
      });
    }, CATCHUP_OPEN_DELAY_MS);
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
   * Recrear el socket tras un cierre transitorio (428, 408, 440, 515...).
   */
  private scheduleReconnect(userId: string, state: WhatsAppState, statusCode?: number): void {
    if (state.isReconnecting) {
      console.log('⏳ [EventManager] Reconexión ya en curso, se omite duplicado');
      return;
    }
    const delay =
      (statusCode != null ? RECONNECT_DELAYS[statusCode as keyof typeof RECONNECT_DELAYS] : undefined) ?? 3000;
    if (delay === 0) {
      console.log('⛔ [EventManager] Delay 0: no se reconecta. código:', statusCode);
      return;
    }
    state.isReconnecting = true;
    setTimeout(() => {
      this.attemptReconnectionAfter515(userId, state).catch((error) => {
        console.error('❌ [EventManager] Error programando reconexión:', error);
        state.isReconnecting = false;
      });
    }, delay);
  }

  /**
   * Reconexión específica para error 515
   */
  private async attemptReconnectionAfter515(userId: string, state: WhatsAppState): Promise<void> {
    console.log('🔄 [EventManager] Iniciando reconexión de socket...');

    try {
      state.isReconnecting = true;

      // El error 515 ("restart required") es NORMAL tras escanear el QR: WhatsApp corta el
      // stream y exige recrear el socket. Baileys NO se reconecta solo; hay que crear un
      // socket nuevo reutilizando las credenciales ya guardadas (que ahora incluyen `me`).
      //
      // Las credenciales se persistieron vía useMultiFileAuthState en el directorio temporal
      // de la sesión, así que reconectamos con el MISMO sessionId para reutilizarlas.

      // Dar tiempo a que saveCreds termine de escribir en disco.
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (isWaSocketOpen(state.socket)) {
        console.log('✅ [EventManager] Socket ya está abierto, no se recrea');
        return;
      }

      if (!state.sessionId) {
        console.log('⚠️ [EventManager] Sin sessionId; no se puede reconectar tras 515');
        state.isReconnecting = false;
        return;
      }

      state.lastError = undefined;
      state.isConnected = false;
      state.socket = null;

      const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
      const authDir = path.join(tempDir, 'whatsapp_auth', state.sessionId);
      const hasAuthDir = fs.existsSync(authDir);
      state.preserve515 = hasAuthDir;
      if (hasAuthDir) {
        console.log('📁 [EventManager] Reutilizando credenciales de:', authDir, '→', fs.readdirSync(authDir).length, 'archivos');
      } else {
        console.log('⚠️ [EventManager] No hay directorio temporal; se cargarán credenciales de BD');
      }

      console.log('🔄 [EventManager] Recreando socket con credenciales de la sesión', state.sessionId);
      if (!this.reconnectHandler) {
        throw new Error('No hay handler de reconexión: no se puede recrear el socket tras 515');
      }
      await this.reconnectHandler(userId);
      console.log('✅ [EventManager] Reconexión tras 515 lanzada (esperando connection: open)');

    } catch (error) {
      console.error('❌ [EventManager] Error en reconexión después de error 515:', error);
    } finally {
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

      if (this.reconnectHandler) {
        await this.reconnectHandler(userId);
      }
      
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

function extractIncomingText(message: any): string | null {
  if (!message) return null;
  const nested =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.editedMessage?.message;
  if (nested) {
    return extractIncomingText(nested);
  }
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    null
  );
}

async function forwardIncomingToApp(payload: {
  from: string;
  fromJid?: string;
  phone?: string;
  message: string;
  type?: string;
  contactName?: string | null;
  userId: string;
  timestamp?: unknown;
  waMessageId?: string;
}) {
  const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (!appUrl) {
    console.warn('⚠️ APP_URL/NEXTAUTH_URL no definida: no se reenvía el mensaje al inbox');
    return;
  }

  try {
    const response = await fetch(`${appUrl}/api/integrations/incoming/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.WORKER_SECRET || '',
      },
      body: JSON.stringify({
        from: payload.from,
        fromJid: payload.fromJid,
        phone: payload.phone,
        message: payload.message,
        type: payload.type || 'text',
        platform: 'whatsapp-lite-baileys',
        contact_name: payload.contactName,
        timestamp: payload.timestamp,
        userId: payload.userId,
        wa_message_id: payload.waMessageId,
      }),
    });
    if (!response.ok) {
      console.error('❌ Error reenviando mensaje al inbox:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error reenviando mensaje al inbox:', error);
  }
}

function toWhatsAppTimestampMs(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Date.now();
  return n > 1e12 ? n : n * 1000;
}