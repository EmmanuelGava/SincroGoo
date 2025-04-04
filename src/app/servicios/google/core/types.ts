export interface ResultadoAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
  timestamp?: number;
}

export interface ResultadoServicio<T> extends ResultadoAPI<T> {
  advertencia?: string;
}

export interface GoogleServiceConfig {
  accessToken: string;
  serviceName: string;
}

export interface PaginationOptions {
  pageSize?: number;
  pageToken?: string;
}

export interface ErrorResponse {
  error: string;
  code: number;
  status?: string;
  details?: any;
}

export interface GoogleAPIError {
  code: number;
  message: string;
  status?: string;
  details?: any;
}

export interface GoogleAPIResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

export interface GoogleAPIConfig {
  version: string;
  scopes: {
    [key: string]: string[];
  };
  endpoints: {
    [key: string]: string;
  };
  rateLimits: {
    [key: string]: {
      maxRequests: number;
      timeWindow: number;
    };
  };
  cache: {
    [key: string]: number;
  };
}

export interface TokenInfo {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
  refresh_token?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  locale: string;
  verified_email: boolean;
}

export type APIMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIRequestConfig {
  method: APIMethod;
  url: string;
  data?: any;
  params?: any;
  headers?: any;
  timeout?: number;
  validateStatus?: (status: number) => boolean;
} 