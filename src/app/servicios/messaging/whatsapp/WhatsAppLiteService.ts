import { WASocket } from 'baileys';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { DatabaseManager } from './modules/DatabaseManager';
import { AuthManager, type BaileysAuthState } from './modules/AuthManager';
import { EventManager, WhatsAppState, ConnectionCallback } from './modules/EventManager';
import { ConnectionManager, QRCodeData } from './modules/ConnectionManager';
import { CleanupManager } from './modules/CleanupManager';
import fs from 'fs';
import path from 'path';

export interface ConnectionStatus {
  connected: boolean;
  phoneNumber?: string;
  lastActivity?: Date;
}

export interface MessageOptions {
  quoted?: any;
  mentions?: string[];
  linkPreview?: boolean;
  type?: string;
  filePath?: string;
  fileName?: string;
}

export class WhatsAppLiteService {
  private static instance: WhatsAppLiteService | null = null;
  
  private state: WhatsAppState = {
    isConnected: false,
    currentQR: null,
    phoneNumber: null,
    lastActivity: null,
    userId: null,
    sessionId: null,
    socket: null,
    isReconnecting: false
  };

  private databaseManager: DatabaseManager;
  private authManager: AuthManager;
  private eventManager: EventManager;
  private connectionManager: ConnectionManager;
  private cleanupManager: CleanupManager;

  private constructor() {
    this.databaseManager = new DatabaseManager();
    this.authManager = new AuthManager(this.databaseManager);
    this.eventManager = new EventManager(this.databaseManager);
    this.connectionManager = new ConnectionManager(this.eventManager);
    this.cleanupManager = CleanupManager.getInstance();
    
    console.log('🎯 WhatsApp Lite Service Refactorizado inicializado');
  }

  public static getInstance(): WhatsAppLiteService {
    if (!WhatsAppLiteService.instance) {
      WhatsAppLiteService.instance = new WhatsAppLiteService();
    }
    return WhatsAppLiteService.instance;
  }

  /**
   * Conectar WhatsApp Lite
   */
  async connect(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🚀 [WhatsAppLiteService] Iniciando conexión para usuario:', userId);
      
      // Verificar si ya hay una conexión activa
      if (this.state.socket && this.state.isConnected) {
        console.log('⚠️ [WhatsAppLiteService] Ya hay una conexión activa');
        return { success: true, data: { connected: true, message: 'Ya conectado' } };
      }

      // Solo limpiar si hay una sesión corrupta o error previo
      // NO limpiar automáticamente para preservar autenticación
      if (this.state.sessionId && this.state.lastError) {
        console.log('🧹 Limpiando sesión corrupta anterior:', this.state.sessionId);
        await this.cleanupSessionFiles(this.state.sessionId);
      }
      
      console.log('🔄 [WhatsAppLiteService] Preparando conexión (preservando auth si existe)');

      // ✅ SOLUCIÓN: Establecer userId y sessionId ANTES de crear el socket
      const sessionId = uuidv4();
      this.state.userId = userId;
      this.state.sessionId = sessionId;
      
      console.log('👤 [WhatsAppLiteService] Estado actualizado:', {
        userId: this.state.userId,
        sessionId: this.state.sessionId
      });

      // Crear auth state apropiado según el entorno
      let authState;
      if (typeof window !== 'undefined') {
        // Cliente: usar localStorage
        const { BrowserAuthManager } = await import('./modules/BrowserAuthManager');
        const browserAuthManager = new BrowserAuthManager(userId, sessionId);
        authState = await browserAuthManager.createBrowserAuthState();
        console.log('🌐 [WhatsAppLiteService] Auth state con localStorage creado');
      } else {
        // Servidor: usar archivos
        const { AuthManager } = await import('./modules/AuthManager');
        const authManager = new AuthManager(this.databaseManager);
        authState = await authManager.createInMemoryAuthState(undefined, userId, sessionId);
        console.log('🌐 [WhatsAppLiteService] Auth state con archivos creado');
      }

      // Validar auth state antes de crear socket
      if (!authState || !authState.state || !authState.saveCreds) {
        throw new Error('Auth state inválido: falta state o saveCreds');
      }

      console.log('🔧 AuthState recibido:', {
        hasState: !!authState.state,
        hasSaveCreds: !!authState.saveCreds,
        stateCreds: !!authState.state.creds,
        stateKeys: !!authState.state.keys,
        stateMe: authState.state.creds?.me,
        stateRegistrationId: authState.state.creds?.registrationId
      });

      // Inicializar socket de Baileys
      this.state.socket = this.connectionManager.createSocket(authState);
      console.log('🔌 [WhatsAppLiteService] Socket de Baileys creado');

      // Configurar eventos
      this.eventManager.setupEventListeners(this.state.socket, authState.saveCreds, userId, this.state);
      console.log('📡 [WhatsAppLiteService] Eventos configurados');

      // Emitir evento de estado inicial via Socket.IO
      this.eventManager.notifyConnectionCallbacks(this.state);

      console.log('✅ [WhatsAppLiteService] Conexión iniciada exitosamente');
      
      return { 
        success: true, 
        data: { 
          connected: false, 
          message: 'Conexión iniciada, esperando QR...',
          sessionId: sessionId
        } 
      };

    } catch (error) {
      console.error('❌ [WhatsAppLiteService] Error en connect:', error);
      
      // Emitir error al usuario via Socket.IO
      this.eventManager.notifyConnectionCallbacks({
        ...this.state,
        isConnected: false,
        phoneNumber: null
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(phoneNumber: string, message: string, options: MessageOptions = {}): Promise<boolean> {
    try {
      if (!this.state.socket || !this.state.isConnected) {
        console.log('❌ WhatsApp Lite no está conectado');
        return false;
      }

      const jid = `${phoneNumber}@s.whatsapp.net`;
      
      await this.state.socket.sendMessage(jid, {
        text: message
      });

      console.log(`✅ Mensaje enviado a ${phoneNumber}`);
      return true;

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      return false;
    }
  }

  /**
   * Obtener estado de conexión (verifica BD y estado local)
   */
  getConnectionStatus(): ConnectionStatus {
    // ✅ SOLUCIÓN: Verificar estado real del socket
    const isReallyConnected = !!(this.state.socket && 
                             this.state.socket.user && 
                             this.state.isConnected);
    
    return {
      connected: isReallyConnected,
      phoneNumber: isReallyConnected ? (this.state.phoneNumber || undefined) : undefined,
      lastActivity: this.state.lastActivity || undefined
    };
  }

  /**
   * Obtener estado de conexión desde BD (async)
   */
  async getConnectionStatusFromDB(userId?: string): Promise<ConnectionStatus> {
    try {
      if (!userId) {
        return this.getConnectionStatus();
      }

      // Verificar sesión activa en BD
      const hasActiveSession = await this.databaseManager.hasActiveSession(userId);
      
      if (hasActiveSession) {
        // Si hay sesión activa en BD pero no en memoria, sincronizar
        if (!this.state.isConnected) {
          console.log('🔄 Sesión activa encontrada en BD, sincronizando estado local...');
          // Aquí podrías cargar los datos de la sesión desde BD
        }
        
        return {
          connected: true,
          phoneNumber: this.state.phoneNumber || undefined,
          lastActivity: this.state.lastActivity || new Date()
        };
      }

      return this.getConnectionStatus();
    } catch (error) {
      console.error('❌ Error verificando estado desde BD:', error);
      return this.getConnectionStatus();
    }
  }

  /**
   * Limpiar sesiones
   */
  async cleanSessions(): Promise<void> {
    console.log('🧹 Limpiando sesiones...');
    await this.databaseManager.cleanExpiredCredentials();
    console.log('✅ Sesiones limpiadas');
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
      
      // Cerrar socket
      if (this.state.socket) {
        this.connectionManager.clearExistingSocket();
        console.log('✅ Socket cerrado');
        this.state.socket = null;
      }
      
      // ✅ SOLUCIÓN: Limpiar archivos temporales
      await this.cleanupManager.cleanupAllTempFiles();
      
      // Limpiar estado
      this.state = {
        isConnected: false,
        currentQR: null,
        phoneNumber: null,
        lastActivity: null,
        userId: null,
        sessionId: null,
        socket: null,
        isReconnecting: false
      };
      
      console.log('✅ WhatsApp Lite desconectado');
    } catch (error) {
      console.error('❌ Error desconectando WhatsApp Lite:', error);
    }
  }

  /**
   * Agregar callback de conexión
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.eventManager.onConnectionChange(callback);
  }

  /**
   * Crear configuración de WhatsApp para el usuario
   */
  private async createWhatsAppConfiguration(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();

      // Convertir Google ID a UUID si es necesario
      let usuarioId = userId;
      if (typeof userId === 'string' && /^\d+$/.test(userId)) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();

        if (user?.id) {
          usuarioId = user.id;
        }
      }

      // Crear configuración de WhatsApp
      const nuevaConfiguracion = {
        usuario_id: usuarioId,
        plataforma: 'whatsapp',
        nombre_configuracion: 'WhatsApp Lite',
        descripcion: 'Configuración automática de WhatsApp Lite',
        activa: true,
        configuracion: {
          tipo_conexion: 'lite',
          plataforma_original: 'whatsapp-lite',
          auto_created: true,
          created_at: new Date().toISOString()
        },
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const { error } = await supabase
        .from('configuracion_mensajeria_usuario')
        .insert(nuevaConfiguracion);

      if (error) {
        console.error('❌ Error creando configuración de WhatsApp:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error en createWhatsAppConfiguration:', error);
      throw error;
    }
  }

  /**
   * Verificar que el usuario tenga configuración de WhatsApp válida
   */
  private async verifyUserHasWhatsAppConfig(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();

      // Convertir Google ID a UUID si es necesario
      let usuarioId = userId;
      if (typeof userId === 'string' && /^\d+$/.test(userId)) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();

        if (user?.id) {
          usuarioId = user.id;
        }
      }

      // Buscar configuración activa de WhatsApp para este usuario
      const { data: configuracion, error } = await supabase
        .from('configuracion_mensajeria_usuario')
        .select('id, plataforma, activa, configuracion')
        .eq('usuario_id', usuarioId)
        .eq('plataforma', 'whatsapp')
        .eq('activa', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error verificando configuración de WhatsApp:', error);
        return false;
      }

      const hasConfig = !!configuracion;
      console.log('🔍 Verificación de configuración WhatsApp:', {
        userId: usuarioId,
        hasConfig,
        configId: configuracion?.id
      });

      return hasConfig;

    } catch (error) {
      console.error('❌ Error en verifyUserHasWhatsAppConfig:', error);
      return false;
    }
  }

  /**
   * Restaurar estado desde base de datos (método legacy para compatibilidad)
   */
  async restoreStateFromDatabase(userId: string): Promise<void> {
    console.log('🔄 Restaurando estado desde BD para compatibilidad...');
    await this.loadConnectionState(userId);
  }

  /**
   * Obtener estado de conexión con error (método legacy para compatibilidad)
   */
  getConnectionStatusWithError(): ConnectionStatus & { error?: string } {
    const status = this.getConnectionStatus();
    return {
      ...status,
      error: this.state.isConnected ? undefined : 'No conectado'
    };
  }

  /**
   * Cargar estado de conexión desde BD
   */
  private async loadConnectionState(userId: string): Promise<void> {
    try {
      console.log('🔄 [WhatsApp] Google ID detectado en loadConnectionState, obteniendo UUID...');
      
      // Aquí iría la lógica para obtener UUID del usuario
      // Por ahora usamos un UUID falso para testing
      const userUUID = 'bd6cb228-7597-4df3-b6ec-c9d6b32b50f9';
      console.log('✅ [WhatsApp] UUID obtenido para loadConnectionState:', userUUID);
      
      // Cargar estado desde BD
      const savedState = await this.databaseManager.loadConnectionState(userId);
      if (savedState) {
        this.state = { ...this.state, ...savedState };
        console.log('📥 Estado de conexión cargado desde BD');
      }
    } catch (error) {
      console.error('❌ Error cargando estado de conexión:', error);
    }
  }

  /**
   * Limpiar archivos de sesión específica
   */
  async cleanupSessionFiles(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.state.sessionId;
    if (targetSessionId) {
      await this.cleanupManager.cleanupSessionFiles(targetSessionId);
    }
  }

  /**
   * Manejar reintentos automáticos después de errores
   */
  private async handleReconnection(userId: string, maxRetries: number = 3): Promise<void> {
    if (!this.state.sessionId) {
      console.log('❌ No hay sessionId para reintento');
      return;
    }

    let retryCount = 0;
    
    const attemptReconnection = async () => {
      try {
        retryCount++;
        console.log(`🔄 Reintento ${retryCount}/${maxRetries} para usuario ${userId}`);
        
        // Verificar si ya está conectado
        if (this.state.isConnected && this.state.phoneNumber) {
          console.log('✅ Ya está conectado, no se necesita reintento');
          return;
        }
        
        // Limpiar socket anterior
        if (this.state.socket) {
          this.connectionManager.clearExistingSocket();
          this.state.socket = null;
        }
        
        // Intentar reconectar
        await this.connect(userId);
        
      } catch (error) {
        console.error(`❌ Error en reintento ${retryCount}:`, error);
        
        if (retryCount < maxRetries) {
          console.log(`⏳ Esperando 10 segundos antes del siguiente reintento...`);
          setTimeout(attemptReconnection, 10000);
        } else {
          console.log('❌ Máximo de reintentos alcanzado');
        }
      }
    };
    
    // Iniciar reintentos
    setTimeout(attemptReconnection, 5000); // Primer reintento después de 5 segundos
  }

  /**
   * Verificar estado real de la conexión
   */
  async verifyRealConnectionStatus(): Promise<{
    isReallyConnected: boolean;
    phoneNumber?: string;
    hasUser: boolean;
    error?: string;
  }> {
    try {
      console.log('🔍 Verificando estado REAL de la conexión...');
      
      // Verificar si hay socket
      if (!this.state.socket) {
        console.log('❌ No hay socket activo');
        return {
          isReallyConnected: false,
          hasUser: false,
          error: 'No hay socket activo'
        };
      }
      
      // Verificar si hay usuario autenticado
      const hasUser = !!(this.state.socket.user && this.state.socket.user.id);
      const phoneNumber = hasUser && this.state.socket.user?.id ? 
        this.state.socket.user.id.replace('@s.whatsapp.net', '') : undefined;
      
      console.log('📊 Estado REAL:', {
        hasSocket: !!this.state.socket,
        hasUser,
        phoneNumber,
        stateConnected: this.state.isConnected,
        statePhoneNumber: this.state.phoneNumber
      });
      
      // Verificar que el número de teléfono es válido
      const isReallyConnected = !!(hasUser && 
                               phoneNumber && 
                               phoneNumber !== 'undefined' && 
                               phoneNumber.length > 0);
      
      if (isReallyConnected) {
        console.log('✅ Conexión REAL verificada:', phoneNumber);
      } else {
        console.log('❌ Conexión NO verificada - Estado inconsistente');
      }
      
      return {
        isReallyConnected,
        phoneNumber,
        hasUser,
        error: isReallyConnected ? undefined : 'Usuario no autenticado correctamente'
      };
      
    } catch (error) {
      console.error('❌ Error verificando estado real:', error);
      return {
        isReallyConnected: false,
        hasUser: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Programar limpieza automática
   */
  scheduleCleanup(): void {
    this.cleanupManager.scheduleCleanup();
  }

  /**
   * Obtener estado actual del servicio
   */
  getCurrentState(userId?: string): WhatsAppState | null {
    // Si se especifica un userId, verificar que coincida
    if (userId && this.state.userId !== userId) {
      console.log('⚠️ [WhatsAppLiteService] Estado solicitado para usuario diferente:', {
        requested: userId,
        current: this.state.userId
      });
      return null;
    }
    
    return { ...this.state }; // Retornar copia del estado
  }
}

// Exportar instancia singleton por defecto
export const whatsappLiteService = WhatsAppLiteService.getInstance(); 