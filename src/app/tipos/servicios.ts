export interface ResultadoServicio<T = void> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
} 