import { WhatsAppStorage, WhatsAppCredentials } from '@/lib/whatsapp-storage';

export interface BrowserAuthState {
  state: {
    creds: any;
    keys: any;
  };
  saveCreds: () => Promise<void>;
}

export class BrowserAuthManager {
  private userId: string;
  private sessionId: string;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  /**
   * Crear auth state que usa localStorage para persistencia
   */
  async createBrowserAuthState(): Promise<BrowserAuthState> {
    console.log('🧠 [BrowserAuthManager] Creando auth state con localStorage...');
    
    // Verificar si localStorage está disponible
    if (typeof window === 'undefined') {
      console.log('⚠️ [BrowserAuthManager] localStorage no disponible (servidor), creando auth state vacío...');
      return this.createEmptyAuthState();
    }
    
    // Intentar cargar credenciales existentes
    const existingCredentials = WhatsAppStorage.getCredentials(this.userId, this.sessionId);
    
    const state = {
      creds: existingCredentials?.creds || {},
      keys: existingCredentials?.keys || {}
    };

    console.log('📊 [BrowserAuthManager] Estado inicial:', {
      hasCreds: !!state.creds && Object.keys(state.creds).length > 0,
      hasKeys: !!state.keys && Object.keys(state.keys).length > 0,
      credsKeys: state.creds ? Object.keys(state.creds) : [],
      fromStorage: !!existingCredentials
    });

    // Función para guardar credenciales
    const saveCreds = async () => {
      try {
        console.log('💾 [BrowserAuthManager] Guardando credenciales...');
        
        const credentials: WhatsAppCredentials = {
          creds: state.creds,
          keys: state.keys,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: Date.now()
        };

        WhatsAppStorage.saveCredentials(credentials);
        console.log('✅ [BrowserAuthManager] Credenciales guardadas exitosamente');
        
        // También intentar sincronizar con BD en background
        this.syncToDatabase(credentials).catch(error => {
          console.warn('⚠️ [BrowserAuthManager] Error sincronizando con BD:', error);
        });
        
      } catch (error) {
        console.error('❌ [BrowserAuthManager] Error guardando credenciales:', error);
        throw error;
      }
    };

    return {
      state,
      saveCreds
    };
  }

  /**
   * Verificar si hay credenciales válidas
   */
  hasValidCredentials(): boolean {
    return WhatsAppStorage.hasValidCredentials(this.userId, this.sessionId);
  }

  /**
   * Obtener credenciales existentes
   */
  getExistingCredentials(): WhatsAppCredentials | null {
    return WhatsAppStorage.getCredentials(this.userId, this.sessionId);
  }

  /**
   * Actualizar número de teléfono
   */
  updatePhoneNumber(phoneNumber: string): void {
    WhatsAppStorage.updatePhoneNumber(this.userId, phoneNumber);
  }

  /**
   * Limpiar credenciales
   */
  clearCredentials(): void {
    WhatsAppStorage.clearCredentials();
  }

  /**
   * Sincronizar credenciales con la base de datos (background)
   */
  private async syncToDatabase(credentials: WhatsAppCredentials): Promise<void> {
    try {
      // Enviar credenciales a la BD para backup
      const response = await fetch('/api/whatsapp/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          userId: this.userId,
          sessionId: this.sessionId,
          credentials: {
            creds: credentials.creds,
            keys: credentials.keys
          }
        })
      });

      if (response.ok) {
        console.log('✅ [BrowserAuthManager] Credenciales sincronizadas con BD');
      } else {
        console.warn('⚠️ [BrowserAuthManager] Error sincronizando con BD:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ [BrowserAuthManager] Error en sincronización con BD:', error);
    }
  }

  /**
   * Crear auth state vacío para servidor
   */
  private createEmptyAuthState(): BrowserAuthState {
    const state = {
      creds: {},
      keys: {}
    };

    const saveCreds = async () => {
      console.log('💾 [BrowserAuthManager] saveCreds llamado en servidor (no-op)');
    };

    return {
      state,
      saveCreds
    };
  }

  /**
   * Obtener información de debug
   */
  getDebugInfo(): any {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      storage: WhatsAppStorage.getDebugInfo()
    };
  }
}