/**
 * WhatsApp Storage Manager
 * Maneja la persistencia de credenciales de Baileys usando localStorage + BD
 */

export interface WhatsAppCredentials {
    creds: any;
    keys: any;
    sessionId: string;
    userId: string;
    timestamp: number;
    phoneNumber?: string;
}

export class WhatsAppStorage {
    private static readonly STORAGE_KEY = 'whatsapp_credentials';
    private static readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas

    /**
     * Verificar si localStorage está disponible
     */
    private static isLocalStorageAvailable(): boolean {
        try {
            return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
        } catch {
            return false;
        }
    }

    /**
     * Guardar credenciales en localStorage
     */
    static saveCredentials(credentials: WhatsAppCredentials): void {
        if (!this.isLocalStorageAvailable()) {
            console.log('📭 [WhatsAppStorage] localStorage no disponible (servidor)');
            return;
        }

        try {
            const data = {
                ...credentials,
                timestamp: Date.now()
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('✅ [WhatsAppStorage] Credenciales guardadas en localStorage');
            console.log('📊 [WhatsAppStorage] Datos guardados:', {
                sessionId: data.sessionId,
                userId: data.userId,
                hasCreds: !!data.creds,
                hasKeys: !!data.keys,
                timestamp: new Date(data.timestamp).toISOString()
            });
        } catch (error) {
            console.error('❌ [WhatsAppStorage] Error guardando credenciales:', error);
        }
    }

    /**
     * Obtener credenciales de localStorage
     */
    static getCredentials(userId: string, sessionId?: string): WhatsAppCredentials | null {
        if (!this.isLocalStorageAvailable()) {
            console.log('📭 [WhatsAppStorage] localStorage no disponible (servidor)');
            return null;
        }

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                console.log('📭 [WhatsAppStorage] No hay credenciales en localStorage');
                return null;
            }

            const data: WhatsAppCredentials = JSON.parse(stored);

            // Verificar que las credenciales sean para el usuario correcto
            if (data.userId !== userId) {
                console.log('⚠️ [WhatsAppStorage] Credenciales son para otro usuario');
                this.clearCredentials();
                return null;
            }

            // Verificar que no hayan expirado
            if (Date.now() - data.timestamp > this.EXPIRY_TIME) {
                console.log('⏰ [WhatsAppStorage] Credenciales expiradas');
                this.clearCredentials();
                return null;
            }

            // Si se especifica sessionId, verificar que coincida
            if (sessionId && data.sessionId !== sessionId) {
                console.log('🔄 [WhatsAppStorage] SessionId diferente, credenciales obsoletas');
                this.clearCredentials();
                return null;
            }

            console.log('✅ [WhatsAppStorage] Credenciales encontradas en localStorage');
            console.log('📊 [WhatsAppStorage] Datos encontrados:', {
                sessionId: data.sessionId,
                userId: data.userId,
                hasCreds: !!data.creds,
                hasKeys: !!data.keys,
                phoneNumber: data.phoneNumber,
                age: Math.round((Date.now() - data.timestamp) / 1000) + 's'
            });

            return data;
        } catch (error) {
            console.error('❌ [WhatsAppStorage] Error obteniendo credenciales:', error);
            this.clearCredentials();
            return null;
        }
    }

    /**
     * Actualizar número de teléfono en las credenciales
     */
    static updatePhoneNumber(userId: string, phoneNumber: string): void {
        try {
            const credentials = this.getCredentials(userId);
            if (credentials) {
                credentials.phoneNumber = phoneNumber;
                credentials.timestamp = Date.now();
                this.saveCredentials(credentials);
                console.log('📱 [WhatsAppStorage] Número de teléfono actualizado:', phoneNumber);
            }
        } catch (error) {
            console.error('❌ [WhatsAppStorage] Error actualizando número:', error);
        }
    }

    /**
     * Limpiar credenciales de localStorage
     */
    static clearCredentials(): void {
        if (!this.isLocalStorageAvailable()) {
            console.log('📭 [WhatsAppStorage] localStorage no disponible (servidor)');
            return;
        }

        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('🧹 [WhatsAppStorage] Credenciales limpiadas de localStorage');
        } catch (error) {
            console.error('❌ [WhatsAppStorage] Error limpiando credenciales:', error);
        }
    }

    /**
     * Verificar si hay credenciales válidas
     */
    static hasValidCredentials(userId: string, sessionId?: string): boolean {
        const credentials = this.getCredentials(userId, sessionId);
        return credentials !== null && !!credentials.creds && !!credentials.keys;
    }

    /**
     * Obtener información de debug
     */
    static getDebugInfo(): any {
        if (!this.isLocalStorageAvailable()) {
            return { hasCredentials: false, error: 'localStorage no disponible' };
        }

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return { hasCredentials: false };

            const data = JSON.parse(stored);
            return {
                hasCredentials: true,
                sessionId: data.sessionId,
                userId: data.userId,
                phoneNumber: data.phoneNumber,
                timestamp: new Date(data.timestamp).toISOString(),
                age: Math.round((Date.now() - data.timestamp) / 1000) + 's',
                hasCreds: !!data.creds,
                hasKeys: !!data.keys,
                credsKeys: data.creds ? Object.keys(data.creds) : [],
                expired: Date.now() - data.timestamp > this.EXPIRY_TIME
            };
        } catch (error: unknown) {
            return {
                hasCredentials: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

/**
 * Hook para usar WhatsApp Storage en componentes React
 */
export function useWhatsAppStorage(userId: string) {
    const saveCredentials = (credentials: Omit<WhatsAppCredentials, 'userId' | 'timestamp'>) => {
        WhatsAppStorage.saveCredentials({
            ...credentials,
            userId,
            timestamp: Date.now()
        });
    };

    const getCredentials = (sessionId?: string) => {
        return WhatsAppStorage.getCredentials(userId, sessionId);
    };

    const hasValidCredentials = (sessionId?: string) => {
        return WhatsAppStorage.hasValidCredentials(userId, sessionId);
    };

    const updatePhoneNumber = (phoneNumber: string) => {
        WhatsAppStorage.updatePhoneNumber(userId, phoneNumber);
    };

    const clearCredentials = () => {
        WhatsAppStorage.clearCredentials();
    };

    return {
        saveCredentials,
        getCredentials,
        hasValidCredentials,
        updatePhoneNumber,
        clearCredentials,
        debugInfo: WhatsAppStorage.getDebugInfo()
    };
}