export interface ResultadoAPI<T = any> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ServiceConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

// Tipos específicos para respuestas de Google
export interface GoogleServiceResponse<T = any> extends ResultadoAPI<T> {
  nextPageToken?: string;
  totalItems?: number;
}

// Tipos para el manejo de caché
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

// Tipos para el manejo de rate limiting
export interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // en milisegundos
  delayBetweenRequests?: number;
} 