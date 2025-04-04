import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_API_CONFIG } from '../config/google-config';

export class GoogleAPIClient {
  private static instance: GoogleAPIClient;
  private oauth2Client: OAuth2Client;

  private constructor() {
    this.oauth2Client = new google.auth.OAuth2();
  }

  static getInstance(): GoogleAPIClient {
    if (!GoogleAPIClient.instance) {
      GoogleAPIClient.instance = new GoogleAPIClient();
    }
    return GoogleAPIClient.instance;
  }

  setAccessToken(accessToken: string): void {
    if (!accessToken) {
      throw new Error('Token de acceso no proporcionado');
    }
    this.oauth2Client.setCredentials({ access_token: accessToken });
  }

  getAuthClient(): OAuth2Client {
    if (!this.oauth2Client.credentials.access_token) {
      throw new Error('No hay token de acceso configurado');
    }
    return this.oauth2Client;
  }

  getSlidesAPI() {
    return google.slides({
      version: 'v1' as const,
      auth: this.getAuthClient()
    });
  }

  getSheetsAPI() {
    return google.sheets({
      version: 'v4' as const,
      auth: this.getAuthClient()
    });
  }

  getDriveAPI() {
    return google.drive({
      version: 'v3' as const,
      auth: this.getAuthClient()
    });
  }

  validateScope(requiredScopes: string[]): boolean {
    const token = this.oauth2Client.credentials.access_token;
    if (!token) return false;

    // TODO: Implementar validación real de scopes cuando tengamos acceso a la información del token
    return true;
  }
} 