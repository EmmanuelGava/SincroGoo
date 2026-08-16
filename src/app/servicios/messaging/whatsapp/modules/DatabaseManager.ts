import { getSupabaseAdmin } from '@/lib/supabase/client';
import { WhatsAppLiteState } from './types';

export class DatabaseManager {
  /**
   * Un Google ID es una cadena puramente numérica (ej. "105103073145221460512").
   */
  private isGoogleId(userId?: string | null): userId is string {
    return typeof userId === 'string' && /^\d+$/.test(userId);
  }

  /**
   * Convierte el userId a UUID de `usuarios.id`.
   * Si no hay fila, la crea (el Chat/CRM necesitan ese UUID como FK).
   * NUNCA devuelve el Google ID crudo (eso causaba el error 22P02 al castear a uuid).
   */
  async resolveOrCreateUsuarioId(userId?: string | null, extra?: { email?: string; nombre?: string }): Promise<string | null> {
    if (!userId) return null;
    if (!this.isGoogleId(userId)) return userId;
    try {
      const supabase = getSupabaseAdmin();
      const existing = await supabase.from('usuarios').select('id').eq('auth_id', userId).limit(1);
      if (existing.data?.[0]?.id) return existing.data[0].id;

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          auth_id: userId,
          email: extra?.email || `auth-${userId}@klosync.user`,
          nombre: extra?.nombre || 'Usuario',
          provider: 'google',
          ultimo_acceso: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [DatabaseManager] No se pudo crear fila en usuarios:', error);
        const retry = await supabase.from('usuarios').select('id').eq('auth_id', userId).limit(1);
        return retry.data?.[0]?.id ?? null;
      }
      console.log('✅ [DatabaseManager] Usuario creado para auth_id:', userId, '→', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ [DatabaseManager] Error resolveOrCreateUsuarioId:', error);
      return null;
    }
  }

  private async resolveUsuarioId(userId?: string | null): Promise<string | null> {
    return this.resolveOrCreateUsuarioId(userId);
  }

  /**
   * Aplica el filtro de propietario a una query de whatsapp_lite_sessions.
   * Usa el UUID si existe; si no, cae al Google ID guardado en metadata.auth_id.
   */
  private applyOwnerFilter<T>(query: T, usuarioId: string | null, authId: string | null): T {
    const q = query as any;
    if (usuarioId) return q.eq('usuario_id', usuarioId);
    if (authId) return q.eq('metadata->>auth_id', authId);
    return q;
  }

  /**
   * Validar que un número de teléfono no tenga conexiones activas
   */
  async validatePhoneNumberUniqueness(phoneNumber: string, currentSessionId?: string): Promise<{
    isValid: boolean;
    existingConnection?: {
      usuario_id: string;
      session_id: string;
      phone_number: string;
      status: string;
      last_activity: string;
    };
    message: string;
  }> {
    try {
      const supabase = getSupabaseAdmin();
      
      // Limpiar el número de teléfono (remover @s.whatsapp.net si existe)
      const cleanPhoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
      
      console.log('🔍 Validando unicidad del número:', cleanPhoneNumber);
      
      // Buscar conexiones activas con este número
      let query = supabase
        .from('whatsapp_lite_sessions')
        .select('usuario_id, session_id, phone_number, status, last_activity')
        .eq('status', 'connected')
        .or(`phone_number.eq.${cleanPhoneNumber},phone_number.eq.${phoneNumber}`);
      
      // Si hay una sesión actual, excluirla de la búsqueda
      if (currentSessionId) {
        query = query.neq('session_id', currentSessionId);
      }
      
      const { data: existingConnections, error } = await query;
      
      if (error) {
        console.error('❌ Error validando número de teléfono:', error);
        return {
          isValid: false,
          message: 'Error validando número de teléfono'
        };
      }
      
      if (existingConnections && existingConnections.length > 0) {
        const existing = existingConnections[0];
        console.log('⚠️ Número ya conectado:', existing);
        
        return {
          isValid: false,
          existingConnection: existing,
          message: `El número ${cleanPhoneNumber} ya tiene una conexión activa`
        };
      }
      
      console.log('✅ Número disponible para conexión');
      return {
        isValid: true,
        message: 'Número disponible'
      };
      
    } catch (error) {
      console.error('❌ Error en validación de número:', error);
      return {
        isValid: false,
        message: 'Error interno en validación'
      };
    }
  }

  /**
   * Desconectar sesiones existentes de un número de teléfono
   */
  async disconnectExistingPhoneConnections(phoneNumber: string, excludeSessionId?: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      
      const cleanPhoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
      console.log('🔌 Desconectando conexiones existentes del número:', cleanPhoneNumber);
      
      let query = supabase
        .from('whatsapp_lite_sessions')
        .update({ 
          status: 'disconnected',
          last_activity: new Date().toISOString()
        })
        .or(`phone_number.eq.${cleanPhoneNumber},phone_number.eq.${phoneNumber}`)
        .eq('status', 'connected');
      
      if (excludeSessionId) {
        query = query.neq('session_id', excludeSessionId);
      }
      
      const { error } = await query;
      
      if (error) {
        console.error('❌ Error desconectando sesiones existentes:', error);
      } else {
        console.log('✅ Sesiones existentes desconectadas');
      }
      
    } catch (error) {
      console.error('❌ Error en desconexión de sesiones:', error);
    }
  }

  /**
   * Guardar estado de conexión en la base de datos
   */
  async saveConnectionState(state: WhatsAppLiteState): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();

      // Resolver UUID; guardar también el Google ID en metadata como respaldo
      const authId = this.isGoogleId(state.userId) ? state.userId : null;
      const usuarioId = await this.resolveUsuarioId(state.userId);

      const connectionData = {
        usuario_id: usuarioId,
        session_id: state.sessionId,
        phone_number: state.phoneNumber,
        qr_code: state.currentQR,
        status: state.isConnected ? 'connected' : 'disconnected',
        last_activity: state.lastActivity?.toISOString(),
        metadata: {
          connected: state.isConnected,
          sessionId: state.sessionId,
          phoneNumber: state.phoneNumber,
          lastActivity: state.lastActivity?.toISOString(),
          auth_id: authId ?? undefined
        }
      };

      // Una desconexión nunca debe crear una fila nueva: dejaría una sesión sin
      // credenciales que después se restaura vacía.
      if (!state.isConnected) {
        const { data, error } = await supabase
          .from('whatsapp_lite_sessions')
          .update(connectionData)
          .eq('session_id', state.sessionId)
          .select('session_id');

        if (error) {
          console.error('❌ Error actualizando estado de conexión:', error);
        } else if (!data?.length) {
          console.log('ℹ️ Sesión sin fila en BD, no se crea al desconectar:', state.sessionId);
        } else {
          console.log('✅ Estado de conexión actualizado en BD');
        }
        return;
      }

      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .upsert(connectionData, { onConflict: 'session_id' });

      if (error) {
        console.error('❌ Error guardando estado de conexión:', error);
      } else {
        console.log('✅ Estado de conexión guardado en BD');
      }

    } catch (error) {
      console.error('❌ Error en saveConnectionState:', error);
    }
  }

  /**
   * Cargar estado de conexión desde la base de datos
   */
  async loadConnectionState(userId: string): Promise<Partial<WhatsAppLiteState>> {
    try {
      const supabase = getSupabaseAdmin();

      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      let query = supabase
        .from('whatsapp_lite_sessions')
        .select('*')
        .eq('status', 'connected')
        .order('created_at', { ascending: false })
        .limit(1);
      query = this.applyOwnerFilter(query, usuarioId, authId);

      const { data: sessions } = await query;
      const session = sessions?.[0];

      if (session) {
        console.log('📥 Estado de conexión cargado:', session);

        return {
          isConnected: session.status === 'connected',
          phoneNumber: session.phone_number,
          sessionId: session.session_id,
          lastActivity: session.last_activity ? new Date(session.last_activity) : null,
          currentQR: session.qr_code
        };
      }

      return {};

    } catch (error) {
      console.error('❌ Error cargando estado de conexión:', error);
      return {};
    }
  }

  /**
   * Guardar mensaje entrante en la base de datos
   */
  async saveIncomingMessage(messageData: any, userId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();

      const usuarioId = await this.resolveUsuarioId(userId);

      const messageRecord = {
        usuario_id: usuarioId,
        phone_number: messageData.from,
        message_content: messageData.message,
        message_type: messageData.type,
        platform: messageData.platform,
        direction: 'incoming',
        status: 'received',
        created_at: messageData.timestamp
      };

      const { error } = await supabase
        .from('whatsapp_messages')
        .insert(messageRecord);

      if (error) {
        console.error('❌ Error guardando mensaje entrante:', error);
      } else {
        console.log('✅ Mensaje entrante guardado en BD');
      }

    } catch (error) {
      console.error('❌ Error en saveIncomingMessage:', error);
    }
  }

  /**
   * Guardar credenciales de Baileys en la base de datos
   */
  async saveBaileysCredentials(userId: string, sessionId: string, credentials: any): Promise<void> {
    try {
      console.log('💾 [DatabaseManager] Intentando guardar credenciales en Supabase...');
      console.log('💾 [DatabaseManager] userId:', userId);
      console.log('💾 [DatabaseManager] sessionId:', sessionId);
      
      const supabase = getSupabaseAdmin();

      // Resolver UUID; guardar el Google ID en metadata para poder recuperar sin fila en usuarios
      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      // Verificar que las credenciales contengan los campos necesarios
      if (!credentials || typeof credentials !== 'object') {
        console.warn('⚠️ Credenciales de Baileys inválidas, no se guardarán');
        return;
      }

      // Validar que contenga al menos los campos mínimos requeridos
      const requiredFields = ['registrationId'];
      const hasRequiredFields = requiredFields.every(field => 
        credentials[field] !== null && credentials[field] !== undefined
      );

      if (!hasRequiredFields) {
        console.warn('⚠️ Credenciales de Baileys incompletas, no se guardarán');
        return;
      }

      // Convertir Uint8Array a arrays normales para JSON
      const serializedCredentials = this.serializeCredentials(credentials);
      
      const credentialsData = {
        usuario_id: usuarioId,
        session_id: sessionId,
        baileys_credentials: serializedCredentials,
        status: 'connected',
        last_activity: new Date().toISOString(),
        metadata: { auth_id: authId ?? undefined }
      };

      console.log('💾 [DatabaseManager] Datos a guardar:', {
        usuario_id: credentialsData.usuario_id,
        session_id: credentialsData.session_id,
        hasCredentials: !!credentialsData.baileys_credentials
      });

      console.log('💾 [DatabaseManager] Ejecutando upsert en Supabase...');
      
      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .upsert(credentialsData, { onConflict: 'session_id' });

      if (error) {
        console.error('❌ Error guardando credenciales de Baileys:', error);
        console.error('❌ Detalles del error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error; // Re-lanzar para que se maneje arriba
      } else {
        console.log('✅ Credenciales de Baileys guardadas en Supabase');
      }

    } catch (error) {
      console.error('❌ Error en saveBaileysCredentials:', error);
    }
  }

  /**
   * Cargar credenciales de Baileys desde la base de datos
   */
  async loadBaileysCredentials(userId: string): Promise<any | null> {
    const session = await this.loadBaileysSession(userId);
    return session?.credentials ?? null;
  }

  /**
   * Credenciales + sessionId de origen, para reconectar sobre la MISMA fila.
   */
  async loadBaileysSession(userId: string): Promise<{ credentials: any; sessionId: string } | null> {
    try {
      console.log('📥 [DatabaseManager] Intentando cargar credenciales de Supabase...');
      console.log('📥 [DatabaseManager] userId:', userId);
      
      const supabase = getSupabaseAdmin();

      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      let query = supabase
        .from('whatsapp_lite_sessions')
        .select('baileys_credentials, session_id, last_activity, status, phone_number')
        .not('baileys_credentials', 'is', null)
        .order('last_activity', { ascending: false })
        .limit(1);
      query = this.applyOwnerFilter(query, usuarioId, authId);

      const { data: rows, error } = await query;

      if (error) {
        console.error('❌ Error consultando credenciales de Baileys:', error);
        return null;
      }

      const session = rows?.[0];

      if (session?.baileys_credentials) {
        console.log('📥 [DatabaseManager] Credenciales encontradas en Supabase');
        
        // CRÍTICO: sin `me` el emparejamiento nunca arrancó → QR nuevo.
        // Con `me` hay que DEVOLVER las credenciales. `registered: false` es normal
        // después del scan y a veces queda persistido aunque la sesión ya esté connected.
        const creds = session.baileys_credentials;
        const meOk = !!creds.me && creds.me !== null;
        if (!meOk) {
          console.log('⚠️ Credenciales INCOMPLETAS (me: null) - empezando desde cero');
          await this.deleteIncompleteCredentials(session.session_id);
          return null;
        }

        const lastActivity = session.last_activity ? new Date(session.last_activity) : null;
        const minutesSinceActivity = lastActivity
          ? (Date.now() - lastActivity.getTime()) / (1000 * 60)
          : Number.POSITIVE_INFINITY;
        // `registered: false` es normal después del scan (515) y a veces queda guardado
        // aunque status=connected. No borrar esas credenciales.
        
        // Verificar que las credenciales no estén expiradas (más de 7 días)
        if (minutesSinceActivity > 7 * 24 * 60) {
          console.log('⚠️ Credenciales de Baileys expiradas (más de 7 días), no se cargarán');
          return null;
        }

        console.log('📥 Credenciales de Baileys cargadas desde Supabase (sesión:', session.session_id, ')');
        
        // Deserializar y validar las credenciales
        console.log('🔧 Antes de validar - Credenciales crudas:', {
          hasMe: !!session.baileys_credentials.me,
          hasNoiseKey: !!session.baileys_credentials.noiseKey,
          meValue: session.baileys_credentials.me,
          noiseKeyValue: session.baileys_credentials.noiseKey
        });
        
        const validatedCredentials = this.validateAndFixCredentials(session.baileys_credentials);
        console.log('🔧 Después de validar - Credenciales procesadas:', {
          hasMe: !!validatedCredentials?.me,
          hasNoiseKey: !!validatedCredentials?.noiseKey,
          meValue: validatedCredentials?.me,
          noiseKeyValue: validatedCredentials?.noiseKey
        });

        if (!validatedCredentials) return null;
        return { credentials: validatedCredentials, sessionId: session.session_id };
      }

      console.log('📭 [DatabaseManager] No se encontraron credenciales en Supabase');
      return null;

    } catch (error) {
      console.error('❌ Error cargando credenciales de Baileys:', error);
      return null;
    }
  }

  /**
   * Dejar la configuración de mensajería como desconectada: si queda en
   * 'connected' la UI muestra el número viejo y no ofrece escanear otro QR.
   */
  async clearLiteMessagingConfig(userId: string): Promise<void> {
    try {
      const usuarioId = await this.resolveOrCreateUsuarioId(userId);
      if (!usuarioId) return;

      const supabase = getSupabaseAdmin();
      const { data: existing } = await supabase
        .from('configuracion_mensajeria_usuario')
        .select('id, configuracion')
        .eq('usuario_id', usuarioId)
        .eq('plataforma', 'whatsapp')
        .limit(1);

      const row = existing?.[0];
      if (!row?.id) return;

      const configuracion = { ...(row.configuracion || {}) };
      delete configuracion.phone_number;
      delete configuracion.session_id;
      configuracion.status = 'disconnected';
      configuracion.estado_conexion = 'disconnected';

      await supabase
        .from('configuracion_mensajeria_usuario')
        .update({
          activa: false,
          configuracion,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', row.id);

      console.log('✅ Config de mensajería WhatsApp marcada como desconectada');
    } catch (error) {
      console.error('❌ Error en clearLiteMessagingConfig:', error);
    }
  }

  /**
   * Borrar todas las sesiones de un usuario para poder vincular de cero.
   */
  async deleteSessionsForUser(userId: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdmin();
      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      let query = supabase.from('whatsapp_lite_sessions').delete();
      query = this.applyOwnerFilter(query, usuarioId, authId);

      const { data, error } = await query.select('session_id');

      if (error) {
        console.error('❌ Error borrando sesiones del usuario:', error);
        return [];
      }

      const ids = (data || []).map((row: { session_id: string }) => row.session_id);
      console.log('🗑️ Sesiones borradas para vincular de nuevo:', ids.length);
      return ids;
    } catch (error) {
      console.error('❌ Error en deleteSessionsForUser:', error);
      return [];
    }
  }

  /**
   * Invalidar credenciales de una sesión cerrada por WhatsApp (401/500):
   * ya no sirven y reintentarlas al arrancar deja el worker en bucle.
   */
  async invalidateSessionCredentials(sessionId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .update({ baileys_credentials: null, status: 'disconnected', phone_number: null })
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error invalidando credenciales de sesión:', error);
      } else {
        console.log('🗑️ Credenciales invalidadas, hace falta escanear el QR de nuevo:', sessionId);
      }
    } catch (error) {
      console.error('❌ Error en invalidateSessionCredentials:', error);
    }
  }

  /**
   * Eliminar credenciales incompletas de una sesión específica
   */
  async deleteIncompleteCredentials(sessionId: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      
      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error eliminando credenciales incompletas:', error);
      } else {
        console.log('🗑️ Credenciales incompletas eliminadas para sesión:', sessionId);
      }

    } catch (error) {
      console.error('❌ Error en deleteIncompleteCredentials:', error);
    }
  }

  /**
   * Limpiar credenciales de Baileys expiradas
   */
  async cleanExpiredCredentials(): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();
      
      // Eliminar credenciales con más de 7 días de inactividad
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .delete()
        .lt('last_activity', sevenDaysAgo.toISOString())
        .not('baileys_credentials', 'is', null);

      if (error) {
        console.error('❌ Error limpiando credenciales expiradas:', error);
      } else {
        console.log('🧹 Credenciales de Baileys expiradas limpiadas');
      }

    } catch (error) {
      console.error('❌ Error en cleanExpiredCredentials:', error);
    }
  }

  /**
   * Obtener estadísticas de sesiones de WhatsApp
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    try {
      const supabase = getSupabaseAdmin();

      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      let statsQuery = supabase
        .from('whatsapp_lite_sessions')
        .select('status, last_activity, baileys_credentials');
      statsQuery = this.applyOwnerFilter(statsQuery, usuarioId, authId);

      const { data: sessions } = await statsQuery;

      if (!sessions) {
        return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => 
          s.status === 'connected' && 
          s.last_activity && 
          new Date(s.last_activity) > sevenDaysAgo
        ).length,
        expiredSessions: sessions.filter(s => 
          s.last_activity && 
          new Date(s.last_activity) <= sevenDaysAgo
        ).length
      };

      return stats;

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de sesiones:', error);
      return { totalSessions: 0, activeSessions: 0, expiredSessions: 0 };
    }
  }

  /**
   * Serializar credenciales para guardar en JSON
   */
  private serializeCredentials(credentials: any): any {
    const serialized = { ...credentials };
    
    // Convertir Uint8Array a arrays normales
    const convertUint8Array = (obj: any, key: string) => {
      if (obj[key] instanceof Uint8Array) {
        obj[key] = Array.from(obj[key]);
      }
    };
    
    // Serializar noiseKey
    if (serialized.noiseKey) {
      convertUint8Array(serialized.noiseKey, 'private');
      convertUint8Array(serialized.noiseKey, 'public');
    }
    
    // Serializar signedIdentityKey
    if (serialized.signedIdentityKey) {
      convertUint8Array(serialized.signedIdentityKey, 'private');
      convertUint8Array(serialized.signedIdentityKey, 'public');
    }
    
    // Serializar signedPreKey
    if (serialized.signedPreKey?.keyPair) {
      convertUint8Array(serialized.signedPreKey.keyPair, 'private');
      convertUint8Array(serialized.signedPreKey.keyPair, 'public');
      if (serialized.signedPreKey.signature instanceof Uint8Array) {
        serialized.signedPreKey.signature = Array.from(serialized.signedPreKey.signature);
      }
    }
    
    // Serializar advSignedIdentityKey
    if (serialized.advSignedIdentityKey) {
      convertUint8Array(serialized.advSignedIdentityKey, 'private');
      convertUint8Array(serialized.advSignedIdentityKey, 'public');
    }
    
    // Serializar account
    if (serialized.account) {
      convertUint8Array(serialized.account, 'accountSignatureKey');
      if (serialized.account.accountSignature instanceof Uint8Array) {
        serialized.account.accountSignature = Array.from(serialized.account.accountSignature);
      }
      if (serialized.account.deviceSignature instanceof Uint8Array) {
        serialized.account.deviceSignature = Array.from(serialized.account.deviceSignature);
      }
      convertUint8Array(serialized.account, 'deviceSignatureKey');
    }
    
    return serialized;
  }

  /**
   * Validar y deserializar credenciales cargadas desde JSON
   */
  private validateAndFixCredentials(credentials: any): any {
    if (!credentials) {
      console.error('❌ Credenciales vacías recibidas en validateAndFixCredentials');
      return null;
    }

    const validated = { ...credentials };
    
    // Convertir arrays normales de vuelta a Uint8Array
    const convertToUint8Array = (obj: any, key: string) => {
      if (obj[key] && Array.isArray(obj[key])) {
        obj[key] = new Uint8Array(obj[key]);
      }
    };
    
    // Deserializar noiseKey
    if (validated.noiseKey) {
      convertToUint8Array(validated.noiseKey, 'private');
      convertToUint8Array(validated.noiseKey, 'public');
    }
    
    // Deserializar signedIdentityKey
    if (validated.signedIdentityKey) {
      convertToUint8Array(validated.signedIdentityKey, 'private');
      convertToUint8Array(validated.signedIdentityKey, 'public');
    }
    
    // Deserializar signedPreKey
    if (validated.signedPreKey?.keyPair) {
      convertToUint8Array(validated.signedPreKey.keyPair, 'private');
      convertToUint8Array(validated.signedPreKey.keyPair, 'public');
      if (validated.signedPreKey.signature && Array.isArray(validated.signedPreKey.signature)) {
        validated.signedPreKey.signature = new Uint8Array(validated.signedPreKey.signature);
      }
    }
    
    // Deserializar advSignedIdentityKey
    if (validated.advSignedIdentityKey) {
      convertToUint8Array(validated.advSignedIdentityKey, 'private');
      convertToUint8Array(validated.advSignedIdentityKey, 'public');
    }
    
    // Deserializar account
    if (validated.account) {
      convertToUint8Array(validated.account, 'accountSignatureKey');
      if (validated.account.accountSignature && Array.isArray(validated.account.accountSignature)) {
        validated.account.accountSignature = new Uint8Array(validated.account.accountSignature);
      }
      if (validated.account.deviceSignature && Array.isArray(validated.account.deviceSignature)) {
        validated.account.deviceSignature = new Uint8Array(validated.account.deviceSignature);
      }
      convertToUint8Array(validated.account, 'deviceSignatureKey');
    }
    
    // Validar que las credenciales tengan la estructura correcta
    const requiredKeys = ['noiseKey', 'signedIdentityKey', 'signedPreKey', 'registrationId'];
    for (const key of requiredKeys) {
      if (!validated[key]) {
        console.error(`❌ Credenciales inválidas: falta ${key}`);
        return null;
      }
    }
    
    console.log('✅ Credenciales validadas correctamente');
    return validated;
  }

  /**
   * Verificar si el usuario tiene una sesión activa
   */
  async hasActiveSession(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseAdmin();

      const authId = this.isGoogleId(userId) ? userId : null;
      const usuarioId = await this.resolveUsuarioId(userId);

      let query = supabase
        .from('whatsapp_lite_sessions')
        .select('id, status, last_activity')
        .eq('status', 'connected')
        .gte('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Últimos 5 minutos
        .limit(1);
      query = this.applyOwnerFilter(query, usuarioId, authId);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error verificando sesión activa:', error);
        return false;
      }

      const hasActive = Boolean(data && data.length > 0);
      console.log(`🔍 Sesión activa para usuario ${usuarioId ?? authId}:`, hasActive);
      return hasActive;
    } catch (error) {
      console.error('❌ Error en hasActiveSession:', error);
      return false;
    }
  }

  /**
   * Guarda/actualiza la config de mensajería que Chat y CRM consultan.
   */
  async saveLiteMessagingConfig(userId: string, phoneNumber: string): Promise<void> {
    try {
      const usuarioId = await this.resolveOrCreateUsuarioId(userId);
      if (!usuarioId) {
        console.error('❌ [DatabaseManager] Sin UUID de usuario; no se guarda config de mensajería');
        return;
      }

      const supabase = getSupabaseAdmin();
      const payload = {
        tipo_conexion: 'lite',
        phone_number: phoneNumber,
        estado_conexion: 'connected',
        ultima_conexion: new Date().toISOString(),
        plataforma_original: 'whatsapp-lite',
      };

      const { data: existing } = await supabase
        .from('configuracion_mensajeria_usuario')
        .select('id, configuracion')
        .eq('usuario_id', usuarioId)
        .eq('plataforma', 'whatsapp')
        .order('fecha_actualizacion', { ascending: false })
        .limit(1);

      if (existing?.[0]?.id) {
        await supabase
          .from('configuracion_mensajeria_usuario')
          .update({
            activa: true,
            configuracion: { ...(existing[0].configuracion || {}), ...payload },
            fecha_actualizacion: new Date().toISOString(),
          })
          .eq('id', existing[0].id);
        console.log('✅ Config de mensajería WhatsApp actualizada');
        return;
      }

      const { error } = await supabase.from('configuracion_mensajeria_usuario').insert({
        usuario_id: usuarioId,
        plataforma: 'whatsapp',
        nombre_configuracion: 'WhatsApp Personal',
        descripcion: 'Conexión WhatsApp Lite (Baileys)',
        activa: true,
        configuracion: payload,
      });

      if (error) {
        console.error('❌ Error insertando config de mensajería:', error);
      } else {
        console.log('✅ Config de mensajería WhatsApp creada');
      }
    } catch (error) {
      console.error('❌ Error en saveLiteMessagingConfig:', error);
    }
  }

  /**
   * Owners (auth_id / usuario_id) con sesión Lite marcada como conectada.
   */
  async listConnectedSessionOwners(): Promise<string[]> {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('whatsapp_lite_sessions')
        .select('usuario_id, metadata, status')
        .eq('status', 'connected')
        .not('baileys_credentials', 'is', null);

      if (error) {
        console.error('❌ Error listando sesiones conectadas:', error);
        return [];
      }

      const owners = new Set<string>();
      for (const row of data || []) {
        const authId = row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as { auth_id?: string }).auth_id
          : undefined;
        if (authId) owners.add(String(authId));
        else if (row.usuario_id) owners.add(String(row.usuario_id));
      }
      return [...owners];
    } catch (error) {
      console.error('❌ Error en listConnectedSessionOwners:', error);
      return [];
    }
  }

}