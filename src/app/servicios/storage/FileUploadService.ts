export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  bucket?: string;
  error?: string;
}

export class FileUploadService {
  private static readonly MAX_FILE_SIZE = 16 * 1024 * 1024;

  private static readonly ALLOWED_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'],
    documents: ['application/pdf', 'text/plain', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/opus'],
  };

  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Máximo ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    const kind = this.getFileType(file);
    if (kind !== 'image' && kind !== 'audio') {
      return { valid: false, error: 'Solo se permiten imágenes o audio' };
    }

    return { valid: true };
  }

  static getFileType(file: File): 'image' | 'document' | 'audio' | 'unknown' {
    const mime = (file.type || '').split(';')[0].trim().toLowerCase();
    if (this.ALLOWED_TYPES.images.includes(mime) || mime.startsWith('image/')) return 'image';
    if (this.ALLOWED_TYPES.audio.includes(mime) || mime.startsWith('audio/')) return 'audio';
    if (this.ALLOWED_TYPES.documents.includes(mime)) return 'document';
    return 'unknown';
  }

  static async uploadFile(file: File, conversationId: string): Promise<FileUploadResult> {
    try {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Error subiendo archivo' };
      }

      return {
        success: true,
        url: data.url,
        path: data.path,
        bucket: data.bucket,
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
  }
}
