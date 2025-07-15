import { supabase } from '@/lib/supabase/browserClient';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export class FileUploadService {
  private static readonly BUCKET_NAME = 'chat-files';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  
  private static readonly ALLOWED_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'text/plain', 'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
  };

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Verificar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `El archivo es demasiado grande. Máximo ${this.MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // Verificar tipo
    const allAllowedTypes = [
      ...this.ALLOWED_TYPES.images,
      ...this.ALLOWED_TYPES.documents,
      ...this.ALLOWED_TYPES.audio
    ];

    if (!allAllowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Tipo de archivo no permitido' 
      };
    }

    return { valid: true };
  }

  static getFileType(file: File): 'image' | 'document' | 'audio' | 'unknown' {
    if (this.ALLOWED_TYPES.images.includes(file.type)) return 'image';
    if (this.ALLOWED_TYPES.documents.includes(file.type)) return 'document';
    if (this.ALLOWED_TYPES.audio.includes(file.type)) return 'audio';
    return 'unknown';
  }

  static async uploadFile(file: File, conversationId: string): Promise<FileUploadResult> {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generar nombre único
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop();
      const fileName = `${conversationId}/${timestamp}_${randomId}.${extension}`;

      // Subir archivo
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        return { success: false, error: 'Error subiendo archivo' };
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName
      };

    } catch (error) {
      console.error('Error in uploadFile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  static async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}