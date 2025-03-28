"use client"

/**
 * Servicio base para realizar peticiones a APIs externas
 * con manejo de autenticación y control de errores
 */

import { AuthService } from '../auth/auth-service';

export interface ResultadoAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export class ServicioApi {
  protected authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  public async fetchConAuth(url: string, opciones: RequestInit = {}): Promise<ResultadoAPI<any>> {
    try {
      // Obtener headers de autenticación
      const headers = await this.authService.getAuthHeaders();

      // Combinar con los headers existentes
      const opcionesFinales = {
        ...opciones,
        headers: {
          ...headers,
          ...(opciones.headers || {})
        }
      };

      // Realizar la petición
      let respuesta = await fetch(url, opcionesFinales);

      // Si recibimos un 401, intentar renovar el token y reintentar
      if (respuesta.status === 401) {
        console.log('🔄 Token expirado, intentando renovar...');
        this.authService.clearToken();
        
        // Obtener nuevos headers con token renovado
        const headersRenovados = await this.authService.getAuthHeaders();
        opcionesFinales.headers = {
          ...opcionesFinales.headers,
          ...headersRenovados
        };

        // Reintentar la petición
        respuesta = await fetch(url, opcionesFinales);
      }

      // Verificar si la respuesta es exitosa
      if (!respuesta.ok) {
        const errorTexto = await respuesta.text();
        throw new Error(`Error ${respuesta.status}: ${errorTexto}`);
      }

      // Intentar parsear la respuesta como JSON
      try {
        const datos = await respuesta.json();
        return {
          exito: true,
          datos,
          codigo: respuesta.status
        };
      } catch (errorParse) {
        // Si no es JSON, devolver el texto
        const texto = await respuesta.text();
        return {
          exito: true,
          datos: texto,
          codigo: respuesta.status
        };
      }
    } catch (error) {
      console.error('Error en fetchConAuth:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }
}
