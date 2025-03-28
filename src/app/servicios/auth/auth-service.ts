import { getSession } from "next-auth/react";

export class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  async getToken(): Promise<string | null> {
    try {
      // Si ya tenemos un token válido, devolverlo
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      // Si ya hay una renovación en curso, esperar a que termine
      if (this.refreshPromise) {
        await this.refreshPromise;
        return this.token;
      }

      // Iniciar una nueva renovación
      this.refreshPromise = this.refreshToken();
      const success = await this.refreshPromise;
      this.refreshPromise = null;

      if (success) {
        return this.token;
      }

      return null;
    } catch (error) {
      console.error('❌ Error al obtener token:', error);
      return null;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const session = await getSession();
      if (!session?.accessToken) {
        console.error('❌ No hay token de acceso en la sesión');
        return false;
      }

      this.token = session.accessToken;
      // Establecer expiración a 50 minutos (el token de Google dura 1 hora)
      this.tokenExpiry = Date.now() + 50 * 60 * 1000;
      return true;
    } catch (error) {
      console.error('❌ Error al renovar token:', error);
      return false;
    }
  }

  async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  clearToken() {
    this.token = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }
} 