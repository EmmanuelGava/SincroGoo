import { Server as SocketIOServer } from 'socket.io';

export interface WhatsAppConnectionEvent {
  connected: boolean;
  phoneNumber?: string;
  lastActivity?: Date;
  error?: string;
}

export interface WhatsAppQREvent {
  qrCode: string;
  sessionId: string;
  expiresAt: Date;
}

export interface WhatsAppMessageEvent {
  from: string;
  message: string;
  timestamp: string;
  type: string;
  platform: string;
}

export interface WhatsAppConnectionEvent {
  connected: boolean;
  phoneNumber?: string;
  lastActivity?: Date;
  error?: string;
}

export interface WhatsAppQREvent {
  qrCode: string;
  sessionId: string;
  expiresAt: Date;
}

export interface WhatsAppMessageEvent {
  from: string;
  message: string;
  timestamp: string;
  type: string;
  platform: string;
} 