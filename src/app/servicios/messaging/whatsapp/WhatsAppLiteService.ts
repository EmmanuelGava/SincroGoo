import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { DatabaseManager } from './modules/DatabaseManager';
import { AuthManager, type BaileysAuthState } from './modules/AuthManager';
import { EventManager, WhatsAppState, ConnectionCallback } from './modules/EventManager';
import { ConnectionManager, QRCodeData } from './modules/ConnectionManager';
import { CleanupManager } from './modules/CleanupManager';
import {
  isWaSocketOpen,
  isConnectionClosedError,
  getDisconnectStatusCode,
  isPermanentDisconnect,
} from './modules/socketHealth';
import type { AnyMessageContent } from 'baileys';
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
  mimetype?: string;
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
  private connectLock: Promise<{
    success: boolean;
    data?: any;
    error?: string;
    qrCode?: string;
    sessionId?: string;
    expiresAt?: Date;
  }> | null = null;

  private constructor() {
    this.databaseManager = new DatabaseManager();
    this.authManager = new AuthManager(this.databaseManager);
    this.eventManager = new EventManager(this.databaseManager);
    this.connectionManager = new ConnectionManager(this.eventManager);
    this.cleanupManager = CleanupManager.getInstance();
    this.eventManager.setReconnectHandler(async (uid) => {
      await this.connect(uid);
    });

    console.log('🎯 WhatsApp Lite Service Refactorizado inicializado');
  }

  public static getInstance(): WhatsAppLiteService {
    if (!WhatsAppLiteService.instance) {
      WhatsAppLiteService.instance = new WhatsAppLiteService();
    }
    return WhatsAppLiteService.instance;
  }

  /** Resultado de connect: success + data o bien qrCode/sessionId/expiresAt cuando aplica */
  async connect(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    qrCode?: string;
    sessionId?: string;
    expiresAt?: Date;
  }> {
    if (this.connectLock) {
      console.log('⏳ [WhatsAppLiteService] Conexión ya en curso, se espera...');
      return this.connectLock;
    }
    this.connectLock = this.executeConnect(userId).finally(() => {
      this.connectLock = null;
    });
    return this.connectLock;
  }

  private async executeConnect(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    qrCode?: string;
    sessionId?: string;
    expiresAt?: Date;
  }> {
    try {
      console.log('🚀 [WhatsAppLiteService] Iniciando conexión para usuario:', userId);

      if (this.hasLiveSocket() && this.state.userId === userId) {
        console.log('⚠️ [WhatsAppLiteService] Ya hay una conexión activa');
        return { success: true, data: { connected: true, message: 'Ya conectado' } };
      }

      if (this.state.socket && !isWaSocketOpen(this.state.socket)) {
        console.log('⚠️ [WhatsAppLiteService] Socket en memoria pero WS cerrado, se recrea');
        this.connectionManager.releaseExistingSocket();
        this.state.socket = null;
        this.state.isConnected = false;
      }

      const lastErrorCode = getDisconnectStatusCode(this.state.lastError);
      if (this.state.sessionId && this.state.lastError && isPermanentDisconnect(lastErrorCode)) {
        console.log('🧹 Limpiando sesión corrupta anterior:', this.state.sessionId);
        await this.cleanupSessionFiles(this.state.sessionId);
      }
      
      console.log('🔄 [WhatsAppLiteService] Preparando conexión (preservando auth si existe)');

      const preserveTempDir = this.state.preserve515 === true;
      this.state.preserve515 = false;

      const { AuthManager } = await import('./modules/AuthManager');
      const authManager = new AuthManager(this.databaseManager);
      // Tras 515 no toques la BD: las credenciales (me, registered=false) están en el dir temporal.
      const savedSession = preserveTempDir ? null : await authManager.loadSessionFromDatabase(userId);
      const existingCredentials = savedSession?.credentials ?? null;

      // Reutilizar el sessionId guardado evita crear filas nuevas sin credenciales
      // en cada arranque del worker.
      const sessionId = this.state.sessionId || savedSession?.sessionId || uuidv4();
      this.state.userId = userId;
      this.state.sessionId = sessionId;

      console.log('👤 [WhatsAppLiteService] Estado actualizado:', {
        userId: this.state.userId,
        sessionId: this.state.sessionId,
        restoredFromDb: Boolean(existingCredentials),
        reusedSessionId: savedSession?.sessionId === sessionId,
        preserveTempDir,
      });

      let authState;
      if (typeof window !== 'undefined') {
        const { BrowserAuthManager } = await import('./modules/BrowserAuthManager');
        const browserAuthManager = new BrowserAuthManager(userId, sessionId);
        authState = await browserAuthManager.createBrowserAuthState();
        console.log('🌐 [WhatsAppLiteService] Auth state con localStorage creado');
      } else {
        authState = await authManager.createInMemoryAuthState(
          existingCredentials || undefined,
          userId,
          sessionId,
          preserveTempDir
        );
        console.log('🌐 [WhatsAppLiteService] Auth state con archivos creado', {
          restoredFromDb: Boolean(existingCredentials),
          preserveTempDir,
        });
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

      // Tras 515 el socket viejo está muerto: soltar referencia para crear uno nuevo.
      if (preserveTempDir) {
        this.connectionManager.releaseExistingSocket();
      }

      // Inicializar socket de Baileys
      this.state.socket = await this.connectionManager.createSocket(authState);
      console.log('🔌 [WhatsAppLiteService] Socket de Baileys creado');

      this.eventManager.setupEventListeners(this.state.socket, authState.saveCreds, userId, this.state);
      console.log('📡 [WhatsAppLiteService] Eventos configurados');

      if (this.applyLiveUserFromSocket()) {
        try {
          await this.state.socket.sendPresenceUpdate('available');
        } catch {
          // presencia no bloquea
        }
        this.eventManager.notifyConnectionCallbacks(this.state);
        console.log('✅ [WhatsAppLiteService] Socket ya autenticado:', this.state.phoneNumber);
        return {
          success: true,
          data: {
            connected: true,
            message: 'Ya conectado',
            sessionId,
            phoneNumber: this.state.phoneNumber,
          },
          sessionId,
        };
      }

      this.eventManager.notifyConnectionCallbacks(this.state);

      console.log('✅ [WhatsAppLiteService] Conexión iniciada exitosamente');
      
      return { 
        success: true, 
        data: { 
          connected: false, 
          message: 'Conexión iniciada, esperando QR...',
          sessionId: sessionId
        },
        sessionId,
        qrCode: this.state.currentQR ?? undefined,
        expiresAt: new Date(Date.now() + 60 * 1000)
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
      if (await this.sendOnLiveSocket(phoneNumber, message, options)) {
        return true;
      }
    } catch (error) {
      if (!isConnectionClosedError(error)) {
        console.error('❌ Error enviando mensaje:', error);
        return false;
      }
      console.warn('⚠️ Envío falló por socket cerrado, reconectando...');
    }

    const userId = this.state.userId;
    if (!userId) {
      console.log('❌ WhatsApp Lite no está conectado');
      return false;
    }

    this.state.lastError = undefined;
    this.state.preserve515 = true;

    const result = await this.connect(userId);
    if (!result.success) {
      console.error('❌ No se pudo reconectar para enviar');
      return false;
    }
    const recovered = await this.waitUntilConnected(20000);
    if (!recovered) {
      console.error('❌ La reconexión no abrió a tiempo para enviar');
      return false;
    }

    try {
      return await this.sendOnLiveSocket(phoneNumber, message, options);
    } catch (error) {
      console.error('❌ Error enviando mensaje (reintento):', error);
      return false;
    }
  }

  private async sendOnLiveSocket(phoneNumber: string, message: string, options: MessageOptions = {}): Promise<boolean> {
    if (!this.hasLiveSocket()) {
      return false;
    }
    const jid = toWhatsAppJid(phoneNumber);
    const payload = await buildWhatsAppPayload(message, options);
    await this.state.socket!.sendMessage(jid, payload);
    console.log(`✅ Mensaje enviado a ${jid}`, options.type || 'text');
    return true;
  }

  hasLiveSocket(): boolean {
    this.applyLiveUserFromSocket();
    return Boolean(
      this.state.socket &&
        isWaSocketOpen(this.state.socket) &&
        this.state.isConnected &&
        this.state.phoneNumber
    );
  }

  private applyLiveUserFromSocket(): boolean {
    if (!isWaSocketOpen(this.state.socket)) {
      if (this.state.socket) {
        this.state.isConnected = false;
      }
      return false;
    }
    const user = this.state.socket?.user;
    if (!user?.id) return false;
    const phone = String(user.id).split('@')[0].split(':')[0];
    if (!phone || phone.length < 8) return false;
    this.state.isConnected = true;
    this.state.phoneNumber = phone;
    this.state.currentQR = null;
    this.state.lastActivity = this.state.lastActivity || new Date();
    return true;
  }

  getConnectionStatus(): ConnectionStatus {
    this.applyLiveUserFromSocket();
    const connected = Boolean(this.state.isConnected && this.state.phoneNumber);
    return {
      connected,
      phoneNumber: connected ? (this.state.phoneNumber || undefined) : undefined,
      lastActivity: this.state.lastActivity || undefined
    };
  }

  async waitUntilConnected(timeoutMs = 25000): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (this.hasLiveSocket()) return true;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    return this.hasLiveSocket();
  }

  async restoreConnectedSessions(): Promise<void> {
    const owners = await this.databaseManager.listConnectedSessionOwners();
    console.log('🔄 Restaurando sesiones Lite conectadas:', owners.length);
    for (const userId of owners) {
      try {
        if (this.hasLiveSocket() && this.state.userId === userId) continue;
        await this.connect(userId);
        const ok = await this.waitUntilConnected(25000);
        console.log(ok ? '✅ Sesión restaurada' : '⚠️ Sesión no abrió a tiempo', userId);
      } catch (error) {
        console.error('❌ Error restaurando sesión Lite:', userId, error);
      }
    }
  }

  /**
   * Obtener estado de conexión desde BD (async)
   */
  async getConnectionStatusFromDB(userId?: string): Promise<ConnectionStatus> {
    try {
      if (!userId) {
        return this.getConnectionStatus();
      }

      const saved = await this.databaseManager.loadConnectionState(userId);
      if (saved.isConnected && saved.phoneNumber) {
        return {
          connected: true,
          phoneNumber: saved.phoneNumber,
          lastActivity: saved.lastActivity || new Date(),
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
   * Desvincular por completo: sin esto, el siguiente connect() reutiliza las
   * credenciales guardadas y nunca aparece un QR nuevo.
   */
  async resetSession(userId: string): Promise<void> {
    console.log('♻️ [WhatsAppLiteService] Reiniciando sesión de WhatsApp para', userId);

    this.connectionManager.clearExistingSocket();

    const sessionIds = await this.databaseManager.deleteSessionsForUser(userId);
    const localSessionId = this.state.sessionId;
    if (localSessionId && !sessionIds.includes(localSessionId)) {
      sessionIds.push(localSessionId);
    }

    for (const sessionId of sessionIds) {
      await this.cleanupManager.cleanupSessionFiles(sessionId);
    }

    await this.databaseManager.clearLiteMessagingConfig(userId);

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

    console.log('✅ [WhatsAppLiteService] Sesión reiniciada, el próximo connect pedirá QR');
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

function toWhatsAppJid(to: string): string {
  const trimmed = to.trim();
  if (trimmed.includes('@')) return trimmed;
  const user = trimmed.replace(/[^\d]/g, '');
  return `${user}@s.whatsapp.net`;
}

async function buildWhatsAppPayload(message: string, options: MessageOptions): Promise<AnyMessageContent> {
  const type = options.type || 'text';
  const filePath = options.filePath;
  if ((type === 'image' || type === 'audio' || type === 'file') && filePath) {
    const media = await downloadMedia(filePath);
    if (type === 'image') {
      return {
        image: media,
        caption: message && !message.startsWith('📎') ? message : undefined,
      };
    }
    if (type === 'audio') {
      return {
        audio: media,
        mimetype: options.mimetype || guessAudioMime(filePath),
        ptt: true,
      };
    }
    return {
      document: media,
      fileName: options.fileName || 'archivo',
      mimetype: options.mimetype || 'application/octet-stream',
      caption: message || undefined,
    };
  }
  return { text: message };
}

function guessAudioMime(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.ogg') || lower.includes('.opus')) return 'audio/ogg; codecs=opus';
  if (lower.includes('.mp3') || lower.includes('.mpeg')) return 'audio/mpeg';
  if (lower.includes('.m4a') || lower.includes('.mp4')) return 'audio/mp4';
  return 'audio/webm';
}

async function downloadMedia(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo bajar el archivo (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
} 