import { DatabaseManager } from './DatabaseManager';
import { useMultiFileAuthState } from 'baileys';
import path from 'path';
import fs from 'fs';

// Interface para el objeto que devuelve useMultiFileAuthState
export interface BaileysAuthState {
  state: any;
  saveCreds: () => Promise<void>;
}

export class AuthManager {
  private databaseManager: DatabaseManager;

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

    /**
   * Crear auth state híbrido: BD + archivos temporales para compatibilidad
   */
  async createInMemoryAuthState(
    existingCredentials?: any,
    userId?: string,
    sessionId?: string
  ): Promise<{ state: any; saveCreds: () => Promise<void> }> {
    console.log('🧠 Creando auth state híbrido (BD + archivos temporales)...');
    
    try {
      // ✅ SOLUCIÓN: Usar directorio temporal del sistema
      const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
      const authDir = path.join(tempDir, 'whatsapp_auth', sessionId || 'default');
      
      console.log('📁 Directorio de autenticación temporal:', authDir);
      
      // ✅ SOLUCIÓN: Limpiar directorio SIEMPRE antes de crear
      if (fs.existsSync(authDir)) {
        console.log('🧹 Limpiando directorio existente...');
        fs.rmSync(authDir, { recursive: true, force: true });
      }
      
      // ✅ SOLUCIÓN: Crear directorio sin timestamp para acceso consistente
      fs.mkdirSync(authDir, { recursive: true });
      console.log('📁 Directorio temporal creado:', authDir);
      
      // Si hay credenciales existentes, restaurarlas a archivos
      if (existingCredentials && Object.keys(existingCredentials).length > 0) {
        console.log('📥 Restaurando credenciales existentes desde BD...');
        try {
          const credsPath = path.join(authDir, 'creds.json');
          fs.writeFileSync(credsPath, JSON.stringify(existingCredentials, null, 2));
          console.log('✅ Credenciales restauradas exitosamente');
        } catch (error) {
          console.error('❌ Error restaurando credenciales:', error);
          // Continuar sin credenciales existentes
        }
      }
      
      // Usar useMultiFileAuthState para compatibilidad con Baileys
      console.log('🔧 Inicializando useMultiFileAuthState...');
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      console.log('✅ useMultiFileAuthState inicializado exitosamente');
      
      // Validar que el estado tenga la estructura esperada
      if (!state) {
        throw new Error('Estado de autenticación es null o undefined');
      }
      
      console.log('📊 Estado de autenticación:', {
        hasCreds: !!state.creds,
        hasKeys: !!state.keys,
        credsKeys: state.creds ? Object.keys(state.creds) : 'No creds',
        keysKeys: state.keys ? Object.keys(state.keys) : 'No keys'
      });
      
      // ✅ SOLUCIÓN: Wrapper que limpia archivos después de guardar
      const wrappedSaveCreds = async () => {
        try {
          console.log('💾 Guardando credenciales...');
          
          // Guardar en archivos temporales
          await saveCreds();
          console.log('✅ Credenciales guardadas en archivos temporales');
          
          // ✅ SOLUCIÓN: Limpiar archivos temporales después de guardar en BD
          // Aumentar tiempo a 5 minutos para evitar problemas durante autenticación
          setTimeout(() => {
            try {
              if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log('🧹 Archivos temporales limpiados después de 5 minutos');
              }
            } catch (cleanupError) {
              console.error('❌ Error limpiando archivos temporales:', cleanupError);
            }
          }, 300000); // Limpiar después de 5 minutos
          
        } catch (error) {
          console.error('❌ Error en wrappedSaveCreds:', error);
          throw error;
        }
      };
      
      return {
        state,
        saveCreds: wrappedSaveCreds
      };
      
    } catch (error) {
      console.error('❌ Error en createInMemoryAuthState:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }





  /**
   * Cargar credenciales desde la base de datos
   */
  async loadCredentialsFromDatabase(userId: string): Promise<any | null> {
    try {
      return await this.databaseManager.loadBaileysCredentials(userId);
    } catch (error) {
      console.error('❌ Error cargando credenciales desde BD:', error);
      return null;
    }
  }
} 