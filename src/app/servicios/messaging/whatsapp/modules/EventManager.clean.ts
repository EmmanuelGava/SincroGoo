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
   * Configurar event listeners de Baileys - VERSIÓN LIMPIA
   */
  setupEventListeners(
    socket: WASocket, 
    saveCreds: () => Promise<void>, 
    userId: string,
    state: WhatsAppState
  ): void {
    console.log('🔧 Configurando event listeners de Baileys...');

    // Guardar credenciales cuando cambien - SIMPLIFICADO
    socket.ev.on('creds.update', async () => {
      console.log('🔄 Credenciales actualizadas');
      
      try {
        await saveCreds();
        console.log('✅ Credenciales guardadas');
        
        // Solo verificar autenticación si no está ya autenticado
        if (socket?.user && !state.phoneNumber) {
          console.log('🟢 Usuario autenticado detectado!');
          state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
          state.isConnected = true;
          
          // Guardar estado y notificar
          await this.databaseManager.saveConnectionState(state);
          this.notifyConnectionCallbacks(state);
          console.log('✅ Autenticación procesada exitosamente');
        }
      } catch (error) {
        console.error('❌ Error en creds.update:', error);
      }
    });

    // Manejar QR code y conexión - SIMPLIFICADO
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log('📡 Connection update:', { 
        connection, 
        hasQR: !!qr, 
        hasError: !!lastDisconnect?.error 
      });

      // Mostrar QR
      if (qr) {
        console.log('📱 QR code recibido');
        state.currentQR = qr;
        this.notifyConnectionCallbacks(state);
      }

      // Detectar autenticación exitosa
      if (socket?.user && !state.phoneNumber) {
        console.log('🟢 Usuario autenticado en connection.update!');
        const phoneNumber = socket.user.id;
        
        // Validar unicidad del número de teléfono
        console.log('🔍 Validando unicidad del número:', phoneNumber);
        const validation = await this.databaseManager.validatePhoneNumberUniqueness(
          phoneNumber, 
          state.sessionId || undefined
        );
        
        if (!validation.isValid) {
          console.log('⚠️ Número ya conectado:', validation.existingConnection);
          console.log('🔌 Desconectando sesiones existentes...');
          await this.databaseManager.disconnectExistingPhoneConnections(
            phoneNumber, 
            state.sessionId || undefined
          );
        }
        
        state.phoneNumber = phoneNumber?.replace('@s.whatsapp.net', '') || 'Conectado';
        state.isConnected = true;
        
        await this.databaseManager.saveConnectionState(state);
        this.notifyConnectionCallbacks(state);
      }

      // Conexión abierta exitosamente
      if (connection === 'open') {
        console.log('🎉 WhatsApp conectado exitosamente!');
        state.isConnected = true;
        state.currentQR = null;
        
        if (socket?.user) {
          const phoneNumber = socket.user.id;
          
          // Validar unicidad del número automáticamente
          console.log('🔍 Validando unicidad del número:', phoneNumber);
          try {
            const validation = await this.databaseManager.validatePhoneNumberUniqueness(
              phoneNumber, 
              state.sessionId || undefined
            );
            
            if (!validation.isValid) {
              console.log('⚠️ Número ya conectado en otra sesión:', validation.existingConnection);
              console.log('🔌 Desconectando sesiones existentes automáticamente...');
              await this.databaseManager.disconnectExistingPhoneConnections(
                phoneNumber, 
                state.sessionId || undefined
              );
              console.log('✅ Sesiones duplicadas desconectadas');
            } else {
              console.log('✅ Número único, continuando...');
            }
          } catch (validationError) {
            console.error('❌ Error en validación de unicidad:', validationError);
            // Continuar sin validación en caso de error
          }
          
          state.phoneNumber = phoneNumber?.replace('@s.whatsapp.net', '') || 'Conectado';
        }
        
        await this.databaseManager.saveConnectionState(state);
        this.notifyConnectionCallbacks(state);
      }

      // Manejar desconexión
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log('🔌 Conexión cerrada:', statusCode);
        this.handleDisconnection(statusCode, userId, state);
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

    console.log('✅ Event listeners configurados');
  }

  /**
   * Manejar desconexión - SIMPLIFICADO
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