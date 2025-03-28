export class GoogleAuthService {
  private static instance: GoogleAuthService;

  private constructor() {}

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  public async obtenerTokenAcceso(): Promise<string> {
    try {
      const response = await fetch('/api/auth/token');
      if (!response.ok) {
        throw new Error('Error al obtener el token de acceso');
      }
      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error('Error al obtener el token de acceso:', error);
      throw error;
    }
  }
} 