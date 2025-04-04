import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ResultadoAPI } from './types';
import { APICache } from '../utils/cache';
import { RateLimiter } from '../utils/rate-limiting';
import { ErrorHandler } from '../utils/error-handling';
import { GOOGLE_API_CONFIG } from './config/google-config';

export abstract class BaseGoogleService {
  protected abstract serviceName: string;
  protected abstract requiredScopes: string[];
  protected accessToken: string;
  protected oauth2Client!: OAuth2Client;
  protected apiClient!: typeof google;
  protected errorHandler!: ErrorHandler;
  protected cache!: APICache;
  protected rateLimiter!: RateLimiter;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeOAuth2Client();
    this.initializeServices();
  }

  private initializeOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2();
    this.oauth2Client.setCredentials({
      access_token: this.accessToken
    });
  }

  private initializeServices() {
    this.apiClient = google;
    this.errorHandler = ErrorHandler.getInstance();
    this.cache = APICache.getInstance();
    this.rateLimiter = RateLimiter.getInstance();
  }

  protected setAccessToken(newToken: string) {
    this.accessToken = newToken;
    this.oauth2Client.setCredentials({
      access_token: newToken
    });
  }

  protected getAccessToken(): string {
    return this.accessToken;
  }

  protected validateAccess(): boolean {
    return true; // TODO: Implementar validación real de scopes
  }

  protected async executeWithRateLimit<T>(
    operation: string,
    action: () => Promise<T>
  ): Promise<ResultadoAPI<T>> {
    try {
      await this.rateLimiter.checkLimit(`${this.serviceName}_${operation}`);
      const result = await action();

      return {
        exito: true,
        datos: result
      };
    } catch (error) {
      console.error(`❌ [${this.serviceName}] Error:`, error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  protected async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    return fetch(url, {
      ...options,
      headers
    });
  }

  protected getCachedData<T>(key: string): T | null {
    return this.cache.get<T>(key);
  }

  protected setCachedData<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, data, ttlMs);
  }

  protected logInfo(message: string, data?: any): void {
    console.log(`ℹ️ [${this.serviceName}] ${message}`, data || '');
  }

  protected logError(message: string, error?: any): void {
    console.error(`❌ [${this.serviceName}] ${message}`, error || '');
  }

  protected logSuccess(message: string, data?: any): void {
    console.log(`✅ [${this.serviceName}] ${message}`, data || '');
  }

  protected logWarning(message: string, data?: any): void {
    console.warn(`⚠️ [${this.serviceName}] ${message}`, data || '');
  }
} 