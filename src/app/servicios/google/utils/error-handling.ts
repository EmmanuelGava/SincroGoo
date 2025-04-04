import { ResultadoAPI } from '@/types/servicios';

export interface ErrorResponse {
  error: string;
  code: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleGoogleAPIError(error: any, serviceName: string): ErrorResponse {
    console.error(`❌ [${serviceName}] Error:`, error);

    // Errores de autenticación
    if (error.message?.includes('auth') || error.message?.includes('401')) {
      return {
        error: 'Error de autenticación. Por favor, inicia sesión nuevamente.',
        code: 401
      };
    }

    // Errores de recursos no encontrados
    if (error.message?.includes('notFound')) {
      return {
        error: 'El recurso solicitado no fue encontrado.',
        code: 404
      };
    }

    // Errores de permisos
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return {
        error: 'No tienes permisos suficientes para realizar esta operación.',
        code: 403
      };
    }

    // Errores de límite de tasa
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return {
        error: 'Has excedido el límite de solicitudes. Por favor, intenta más tarde.',
        code: 429
      };
    }

    // Error por defecto
    return {
      error: error.message || `Error desconocido en ${serviceName}`,
      code: 500
    };
  }
}

export function handleError(error: any): ResultadoAPI<any> {
  console.error('Error en servicio Google:', error);
  
  return {
    exito: false,
    error: error instanceof Error ? error.message : 'Error desconocido',
    codigo: 500
  };
}

export function handleAuthError(): ResultadoAPI<any> {
  return {
    exito: false,
    error: 'No autorizado - No hay sesión válida',
    codigo: 401
  };
}

export function handleValidationError(mensaje: string): ResultadoAPI<any> {
  return {
    exito: false,
    error: mensaje,
    codigo: 400
  };
}
