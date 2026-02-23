/**
 * Stub SessionManager para compatibilidad con WhatsAppLiteServiceOld (legacy).
 * No se usa en el flujo principal; el servicio activo es WhatsAppLiteService.
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface AuthFileInfo {
  hasValidFiles: boolean;
  hasRequiredProps: boolean;
  error?: string;
}

export class SessionManager {
  private authDir: string;

  constructor(authDir: string) {
    this.authDir = authDir;
  }

  generateSessionId(): string {
    return uuidv4();
  }

  getUserAuthDir(sessionId: string): string {
    return path.join(this.authDir, sessionId);
  }

  async cleanDuplicateSessions(_userId: string): Promise<void> {
    // No-op para stub
  }

  async checkForValidAuthFiles(userAuthDir: string): Promise<AuthFileInfo> {
    try {
      if (!fs.existsSync(userAuthDir)) {
        return { hasValidFiles: false, hasRequiredProps: false };
      }
      const files = fs.readdirSync(userAuthDir);
      const hasCreds = files.some(f => f.includes('creds') || f === 'auth_info_baileys.json');
      return { hasValidFiles: hasCreds, hasRequiredProps: hasCreds };
    } catch {
      return { hasValidFiles: false, hasRequiredProps: false };
    }
  }
}
