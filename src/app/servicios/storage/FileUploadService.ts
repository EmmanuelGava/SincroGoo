import { validateOutgoingMedia } from '@/lib/chat/mediaLimits';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  bucket?: string;
  fileType?: 'image' | 'audio' | 'file' | 'video';
  error?: string;
}

export class FileUploadService {
  static validateFile(file: File): { valid: boolean; error?: string } {
    const result = validateOutgoingMedia(file);
    if (!result.ok) {
      return { valid: false, error: result.error };
    }
    return { valid: true };
  }

  static getFileType(file: File): 'image' | 'file' | 'audio' | 'video' | 'unknown' {
    const mime = (file.type || '').split(';')[0].trim().toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'video/mp4') return 'video';
    if (
      mime === 'application/pdf' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return 'file';
    }
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
        fileType: data.fileType,
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
