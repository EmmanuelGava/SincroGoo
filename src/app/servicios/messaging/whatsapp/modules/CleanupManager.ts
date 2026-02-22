import fs from 'fs';
import path from 'path';

export class CleanupManager {
  private static instance: CleanupManager | null = null;

  private constructor() {}

  public static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Limpiar todos los archivos temporales de WhatsApp
   */
  async cleanupAllTempFiles(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpieza de archivos temporales...');
      
      // Limpiar directorio temporal del sistema
      await this.cleanupSystemTempDir();
      
      // Limpiar directorio local si existe
      await this.cleanupLocalTempDir();
      
      console.log('✅ Limpieza de archivos temporales completada');
    } catch (error) {
      console.error('❌ Error en limpieza de archivos temporales:', error);
    }
  }

  /**
   * Limpiar directorio temporal del sistema
   */
  private async cleanupSystemTempDir(): Promise<void> {
    try {
      const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
      const whatsappAuthDir = path.join(tempDir, 'whatsapp_auth');
      
      if (fs.existsSync(whatsappAuthDir)) {
        console.log('🧹 Limpiando directorio temporal del sistema:', whatsappAuthDir);
        
        const files = fs.readdirSync(whatsappAuthDir);
        let deletedCount = 0;
        
        for (const file of files) {
          const filePath = path.join(whatsappAuthDir, file);
          try {
            const stats = fs.statSync(filePath);
            const fileAge = Date.now() - stats.mtime.getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas
            
            // Eliminar archivos más antiguos de 24 horas
            if (fileAge > maxAge) {
              fs.rmSync(filePath, { recursive: true, force: true });
              console.log(`🗑️ Eliminado archivo antiguo: ${file} (${Math.round(fileAge / (60 * 60 * 1000))}h)`);
              deletedCount++;
            }
          } catch (error) {
            console.error(`❌ Error procesando ${file}:`, error);
          }
        }
        
        console.log(`✅ Limpieza completada: ${deletedCount} archivos eliminados`);
        
        // Eliminar directorio principal si está vacío
        try {
          const remainingFiles = fs.readdirSync(whatsappAuthDir);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(whatsappAuthDir);
            console.log('✅ Directorio temporal eliminado (vacío)');
          }
        } catch (error) {
          // El directorio no está vacío, es normal
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando directorio temporal del sistema:', error);
    }
  }

  /**
   * Limpiar directorio temporal local
   */
  private async cleanupLocalTempDir(): Promise<void> {
    try {
      const localTempDir = path.join(process.cwd(), 'temp_auth_sessions');
      
      if (fs.existsSync(localTempDir)) {
        console.log('🧹 Limpiando directorio temporal local:', localTempDir);
        
        const files = fs.readdirSync(localTempDir);
        let deletedCount = 0;
        
        for (const file of files) {
          const filePath = path.join(localTempDir, file);
          try {
            const stats = fs.statSync(filePath);
            const fileAge = Date.now() - stats.mtime.getTime();
            const maxAge = 1 * 60 * 60 * 1000; // 1 hora (más agresivo para archivos locales)
            
            // Eliminar archivos más antiguos de 1 hora
            if (fileAge > maxAge) {
              fs.rmSync(filePath, { recursive: true, force: true });
              console.log(`🗑️ Eliminado archivo local antiguo: ${file} (${Math.round(fileAge / (60 * 60 * 1000))}h)`);
              deletedCount++;
            }
          } catch (error) {
            console.error(`❌ Error procesando archivo local ${file}:`, error);
          }
        }
        
        console.log(`✅ Limpieza local completada: ${deletedCount} archivos eliminados`);
        
        // Eliminar directorio principal si está vacío
        try {
          const remainingFiles = fs.readdirSync(localTempDir);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(localTempDir);
            console.log('✅ Directorio temporal local eliminado (vacío)');
          }
        } catch (error) {
          // El directorio no está vacío, es normal
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando directorio temporal local:', error);
    }
  }

  /**
   * Programar limpieza automática
   */
  scheduleCleanup(): void {
    // Limpiar cada 6 horas
    setInterval(() => {
      this.cleanupAllTempFiles();
    }, 6 * 60 * 60 * 1000);
    
    console.log('⏰ Limpieza automática programada cada 6 horas');
  }

  /**
   * Limpiar archivos de una sesión específica
   */
  async cleanupSessionFiles(sessionId: string): Promise<void> {
    try {
      console.log(`🧹 Limpiando archivos de sesión: ${sessionId}`);
      
      // Limpiar en directorio temporal del sistema
      const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
      const sessionDir = path.join(tempDir, 'whatsapp_auth', sessionId);
      
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`✅ Archivos de sesión eliminados: ${sessionId}`);
      }
      
      // Limpiar en directorio local
      const localSessionDir = path.join(process.cwd(), 'temp_auth_sessions', sessionId);
      
      if (fs.existsSync(localSessionDir)) {
        fs.rmSync(localSessionDir, { recursive: true, force: true });
        console.log(`✅ Archivos locales de sesión eliminados: ${sessionId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error limpiando archivos de sesión ${sessionId}:`, error);
    }
  }
} 