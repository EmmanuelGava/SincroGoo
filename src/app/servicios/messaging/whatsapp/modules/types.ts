import { WASocket } from 'baileys';

export interface QRCodeData {
  qrCode: string;
  sessionId: string;
  expiresAt: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
  lastActivity?: Date;
}

export interface ConnectionCallback {
  (status: { connected: boolean; phoneNumber?: string }): void;
}

export interface MessageOptions {
  type?: 'text' | 'file' | 'image' | 'audio' | 'video';
  filePath?: string;
  fileName?: string;
}

export interface WhatsAppLiteState {
  socket: WASocket | null;
  isConnected: boolean;
  phoneNumber: string | null;
  sessionId: string | null;
  lastActivity: Date | null;
  currentQR: string | null;
  userId: string | null;
  isReconnecting: boolean;
}

export interface AuthFileInfo {
  hasValidFiles: boolean;
  hasRequiredProps: boolean;
  error?: string;
} 