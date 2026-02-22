import { WASocket } from 'baileys';
import { DatabaseManager } from './DatabaseManager';
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
}

export class EventManager {
  private databaseManager: DatabaseManager;
  private connectionCallbacks: ConnectionCallback[] = [];

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Configurar event listeners de Baileys
   */
  setupEventListeners(
    socket: WASocket, 
    saveCreds: () => Promise<void>, 
    userId: string,
    state: WhatsAppState
  ): void {
    console.log('🔧 Configurando event listeners de Baileys...');

    // Guardar credenciales cuando cambien
    socket.ev.on('creds.update', async () => {
      console.log('🔄 Credenciales actualizadas, verificando estado de autenticación...');
      
      // Guardar credenciales inmediatamente
      await saveCreds();
      console.log('💾 Credenciales guardadas en BD');
      
      // Verificar autenticación inmediatamente
      if (socket?.user && !state.phoneNumber) {
        console.log('🟢 Usuario autenticado detectado inmediatamente en creds.update!');
        state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
        state.isConnected = true; // Marcar como conectado
        console.log('📱 Número de teléfono detectado:', state.phoneNumber);
        
        // Guardar estado de conexión
        await this.databaseManager.saveConnectionState(state);
        console.log('✅ Estado guardado después de autenticación exitosa');
        
        // Notificar cambio de conexión
        this.notifyConnectionCallbacks(state);
        return;
      }
      
      // Si no está disponible inmediatamente, intentar con delays
      const checkAuth = async (attempt: number = 1) => {
        if (socket?.user && !state.phoneNumber) {
          console.log(`🟢 Usuario autenticado detectado en creds.update (intento ${attempt})!`);
          state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
          state.isConnected = true; // Marcar como conectado
          console.log('📱 Número de teléfono detectado:', state.phoneNumber);
          
          // Guardar estado de conexión
          await this.databaseManager.saveConnectionState(state);
          console.log('✅ Estado guardado después de autenticación exitosa');
          
          // Notificar cambio de conexión
          this.notifyConnectionCallbacks(state);
        } else if (attempt < 5) {
          console.log(`⏳ Intento ${attempt}: Usuario aún no autenticado, reintentando en 1 segundo...`);
          setTimeout(() => checkAuth(attempt + 1), 1000);
        } else {
          console.log('⚠️ No se pudo detectar autenticación después de 5 intentos');
        }
      };
      
      // Iniciar verificación con delay
      setTimeout(() => checkAuth(), 1000);
    });

    // Manejar QR code y conexión
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log('📡 Evento connection.update recibido:', { 
        connection, 
        hasQR: !!qr, 
        hasLastDisconnect: !!lastDisconnect 
      });

      if (qr) {
        console.log('📱 Nuevo QR code recibido, longitud:', qr.length);
        state.currentQR = qr;
        this.notifyConnectionCallbacks(state);
      }

      // Detectar autenticación exitosa (incluso si la conexión se cierra después)
      if (socket?.user && !state.phoneNumber) {
        console.log('🟢 Usuario autenticado detectado en connection.update!');
        state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
        console.log('📱 Número de teléfono detectado:', state.phoneNumber);
        
        // Guardar credenciales y estado inmediatamente
        await saveCreds();
        await this.databaseManager.saveConnectionState(state);
        console.log('✅ Credenciales y estado guardados después de autenticación');
        
        // Notificar cambio de conexión
        this.notifyConnectionCallbacks(state);
      }

      // Detectar autenticación exitosa después de un delay
      if (!state.phoneNumber && !qr && connection !== 'close') {
        setTimeout(async () => {
          if (socket?.user && !state.phoneNumber) {
            console.log('🟢 Usuario autenticado detectado después de delay!');
            state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
            console.log('📱 Número de teléfono detectado:', state.phoneNumber);
            
            // Guardar credenciales y estado inmediatamente
            await saveCreds();
            await this.databaseManager.saveConnectionState(state);
            console.log('✅ Credenciales y estado guardados después de autenticación (delay)');
            
            // Notificar cambio de conexión
            this.notifyConnectionCallbacks(state);
          }
        }, 2000); // Esperar 2 segundos
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log('🔌 Conexión cerrada:', this.getDisconnectReason(statusCode));
        this.handleDisconnection(statusCode, userId, state);
      }

      if (connection === 'open') {
        console.log('🟢 WhatsApp conectado exitosamente!');
        state.isConnected = true;
        state.currentQR = null;
        
        // Actualizar información del usuario autenticado
        if (socket?.user) {
          state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
          console.log('📱 Número de teléfono detectado:', state.phoneNumber);
        }
        
        this.notifyConnectionCallbacks(state);
        
        // AHORA sí guardamos el estado de conexión Y las credenciales
        await this.databaseManager.saveConnectionState(state);
        console.log('✅ Estado de conexión actualizado después de autenticación exitosa');
      }
    });

    // Manejar mensajes entrantes
    socket.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && msg.message) {
        const messageText = this.extractMessageText(msg.message);
        const contactId = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
        
        await this.databaseManager.saveIncomingMessage({
          from: contactId,
          message: messageText,
          type: 'text',
          platform: 'whatsapp-lite',
          timestamp: new Date().toISOString()
        }, userId);
      }
    });

    console.log('✅ Event listeners de Baileys configurados');
  }

  /**
   * Manejar desconexión
   */
  private handleDisconnection(statusCode: number, userId: string, state: WhatsAppState): void {
    console.log(`🔌 Desconexión detectada, código: ${statusCode}`);
    
    // Manejar error 515 de forma especial - mantener QR activo
    if (statusCode === 515) {
      console.log('🔄 Error 515 - Manteniendo QR activo para conexión móvil...');
      
      // NO limpiar el QR ni marcar como desconectado completamente
      // Solo marcar socket como desconectado pero mantener estado de QR
      state.isConnected = false;
      
      // Intentar reconexión inmediata para mantener QR disponible
      if (!state.isReconnecting) {
        console.log('🔄 Iniciando reconexión inmediata para error 515...');
        this.attemptReconnectionFor515(userId, state);
      }
      return;
    }
    
    // Manejar otros tipos de errores normalmente
    const shouldReconnect = this.shouldAttemptReconnection(statusCode);
    state.isConnected = false;
    
    // Solo guardar en BD si previamente estaba conectado exitosamente
    if (state.phoneNumber) {
      console.log('💾 Guardando estado de desconexión en BD (conexión previa exitosa)');
      this.databaseManager.saveConnectionState(state);
    } else {
      console.log('❌ No guardando estado en BD - conexión nunca fue exitosa');
    }

    // Manejar reconexión basada en el tipo de error
    if (shouldReconnect) {
      if (state.phoneNumber && !state.isReconnecting) {
        console.log('🔄 Usuario autenticado detectado, iniciando reconexión automática...');
        this.attemptReconnection(userId, state, statusCode);
      } else if (!state.phoneNumber) {
        console.log('⚠️ Usuario no autenticado, verificando si hay credenciales guardadas...');
        this.checkForSavedCredentials(userId, state);
      }
    } else {
      console.log(`⚠️ Error ${statusCode} no permite reconexión automática`);
      state.phoneNumber = null;
      state.currentQR = null;
      this.notifyConnectionCallbacks(state);
    }
  }

  /**
   * Determinar si se debe intentar reconexión basado en el código de error
   */
  private shouldAttemptReconnection(statusCode: number): boolean {
    const noReconnectCodes = [
      401, // Usuario deslogueado
      403, // Acceso denegado
      // 515 removido - sí intentar reconexión para stream errors
    ];
    
    return !noReconnectCodes.includes(statusCode);
  }

  /**
   * Verificar si hay credenciales guardadas en BD
   */
  private async checkForSavedCredentials(userId: string, state: WhatsAppState): Promise<void> {
    try {
      console.log('🔍 Verificando credenciales guardadas en BD...');
      const savedCredentials = await this.databaseManager.loadBaileysCredentials(userId);
      
      if (savedCredentials && savedCredentials.me) {
        console.log('✅ Credenciales válidas encontradas en BD, marcando como autenticado');
        state.phoneNumber = savedCredentials.me.id?.replace('@s.whatsapp.net', '') || 'Conectado';
        state.isConnected = true; // Marcar como conectado
        
        // Guardar estado de conexión
        await this.databaseManager.saveConnectionState(state);
        console.log('✅ Estado guardado con credenciales existentes');
        
        // Notificar cambio de conexión
        this.notifyConnectionCallbacks(state);
      } else {
        console.log('❌ No se encontraron credenciales válidas en BD');
      }
    } catch (error) {
      console.error('❌ Error verificando credenciales guardadas:', error);
    }
  }

  /**
   * Intentar reconexión automática
   */
  private async attemptReconnection(userId: string, state: WhatsAppState, statusCode?: number): Promise<void> {
    if (state.isReconnecting) {
      console.log('⚠️ Ya hay una reconexión en progreso');
      return;
    }

    // Verificar si ya tenemos credenciales válidas
    if (!state.phoneNumber) {
      console.log('⚠️ No hay credenciales válidas para reconectar');
      return;
    }

    state.isReconnecting = true;
    console.log('🔄 Iniciando reconexión automática...');

    try {
      // Determinar delay basado en el código de error
      const delay = this.getReconnectionDelay(statusCode);
      console.log(`⏳ Esperando ${delay/1000} segundos antes de reconectar...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Importar el servicio de WhatsApp
      const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
      
      // Intentar reconectar con reintentos
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔄 Intento de reconexión ${attempts}/${maxAttempts}...`);
          
          await whatsappLiteService.connect(userId);
          console.log('✅ Reconexión automática exitosa');
          return;
          
        } catch (reconnectError) {
          console.error(`❌ Error en intento ${attempts}:`, reconnectError);
          
          if (attempts < maxAttempts) {
            const retryDelay = 5000 * attempts; // Delay incremental
            console.log(`⏳ Esperando ${retryDelay/1000}s antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      console.log('❌ Todos los intentos de reconexión fallaron');
      
    } catch (error) {
      console.error('❌ Error en reconexión automática:', error);
      console.log('⚠️ La reconexión falló, pero las credenciales están guardadas para el próximo intento');
    } finally {
      state.isReconnecting = false;
    }
  }

  /**
   * Reconexión específica para error 515 - más rápida y agresiva
   */
  private async attemptReconnectionFor515(userId: string, state: WhatsAppState): Promise<void> {
    if (state.isReconnecting) {
      console.log('⚠️ Ya hay una reconexión en progreso para 515');
      return;
    }

    state.isReconnecting = true;
    console.log('🔄 Iniciando reconexión específica para error 515...');

    try {
      // Delay más corto para error 515
      console.log('⏳ Esperando 3 segundos antes de reconectar (error 515)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Importar el servicio de WhatsApp
      const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
      
      // Intentar reconectar manteniendo el QR
      console.log('🔄 Reconectando para mantener QR disponible...');
      const result = await whatsappLiteService.connect(userId);
      
      if (result.qrCode) {
        console.log('✅ Reconexión exitosa - QR mantenido para móvil');
        state.currentQR = result.qrCode;
        this.notifyConnectionCallbacks(state);
      }
      
    } catch (error) {
      console.error('❌ Error en reconexión 515:', error);
      
      // Si falla, intentar una vez más después de un delay mayor
      setTimeout(async () => {
        try {
          const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
          const result = await whatsappLiteService.connect(userId);
          
          if (result.qrCode) {
            console.log('✅ Segunda reconexión exitosa - QR restaurado');
            state.currentQR = result.qrCode;
            this.notifyConnectionCallbacks(state);
          }
        } catch (secondError) {
          console.error('❌ Segunda reconexión también falló:', secondError);
        }
      }, 10000); // 10 segundos para segundo intento
      
    } finally {
      state.isReconnecting = false;
    }
  }

  /**
   * Obtener delay de reconexión basado en el código de error
   */
  private getReconnectionDelay(statusCode?: number): number {
    const delays: Record<number, number> = {
      408: 3000,  // Timeout
      500: 5000,  // Error interno
      502: 10000, // Bad Gateway
      503: 15000, // Servicio no disponible
      504: 10000, // Gateway Timeout
      515: 3000   // Stream error - reconexión rápida
    };
    
    return delays[statusCode || 0] || 5000; // Default 5 segundos
  }



  /**
   * Obtener razón de desconexión
   */
  private getDisconnectReason(statusCode: number): string {
    const reasons: Record<number, string> = {
      401: 'Usuario deslogueado',
      403: 'Acceso denegado',
      404: 'No encontrado',
      408: 'Timeout',
      500: 'Error interno del servidor',
      502: 'Bad Gateway',
      503: 'Servicio no disponible',
      504: 'Gateway Timeout'
    };
    
    return reasons[statusCode] || 'Razón desconocida';
  }

  /**
   * Extraer texto del mensaje
   */
  private extractMessageText(message: any): string {
    if (!message) return '';
    
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
   * Notificar cambios de conexión a todos los callbacks
   */
  notifyConnectionCallbacks(state: WhatsAppState): void {
    // Determinar si está conectado basado en si tiene número de teléfono
    const isConnected = !!state.phoneNumber;
    
    const status = {
      connected: isConnected,
      phoneNumber: state.phoneNumber || undefined
    };
    
    this.connectionCallbacks.forEach(callback => callback(status));
    
    // Emitir evento de Socket.IO si está disponible
    if (state.userId) {
      this.emitSocketIOEvent('whatsapp-status', status, state.userId);
    }
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