import { PostgrestError } from '@supabase/supabase-js';
import { ServiceError } from '../types/common';

/**
 * Tipos de errores específicos de la aplicación
 */
export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  AUTHENTICATION = 'AUTH_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Mapeo de códigos de error HTTP
 */
export const ErrorStatusCodes: Record<ErrorType, number> = {
  [ErrorType.DATABASE]: 503,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.VALIDATION]: 400,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.PERMISSION]: 403,
  [ErrorType.EXTERNAL_SERVICE]: 502,
  [ErrorType.UNKNOWN]: 500
};

/**
 * Determina el tipo de error basado en el error original
 */
function determineErrorType(error: unknown): ErrorType {
  if (error instanceof PostgrestError) {
    // Códigos específicos de Postgres
    if (error.code === 'PGRST301') return ErrorType.NOT_FOUND;
    if (error.code === 'PGRST403') return ErrorType.PERMISSION;
    if (error.code?.startsWith('23')) return ErrorType.VALIDATION; // Errores de restricción
    return ErrorType.DATABASE;
  }

  if (error instanceof Error) {
    if (error.name === 'AuthError') return ErrorType.AUTHENTICATION;
    if (error.name === 'ValidationError') return ErrorType.VALIDATION;
    if (error.name === 'NotFoundError') return ErrorType.NOT_FOUND;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Maneja y registra errores de forma consistente
 * @param context Contexto donde ocurrió el error
 * @param error Error a manejar
 */
export function handleError(context: string, error: Error | PostgrestError | string | unknown): void {
  const errorMessage = error instanceof Error ? error.message : 
                      typeof error === 'string' ? error :
                      (error as PostgrestError)?.message || 'Error desconocido';
                      
  console.error(`[${context}] ${errorMessage}`);
  
  // Aquí podríamos agregar más lógica de manejo de errores
  // como enviar a un servicio de monitoreo, etc.
}

/**
 * Maneja un error y lo registra en la consola
 * @param error El error a manejar
 * @param context Contexto adicional sobre dónde ocurrió el error
 * @returns ServiceError formateado
 */
export function handleErrorFormatted(error: unknown, context: string = 'Operación de Supabase'): ServiceError {
  const errorType = determineErrorType(error);
  const status = ErrorStatusCodes[errorType];
  
  // Formatear mensaje de error
  let message = 'Error desconocido';
  let code = errorType;
  let originalError = undefined;

  if (error instanceof Error) {
    message = error.message;
    originalError = error;
  } else if (error instanceof PostgrestError) {
    message = error.message;
    code = errorType;
    originalError = error;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Registrar error
  console.error(`[${errorType}] ${context}:`, {
    message,
    code,
    status,
    originalError
  });

  return {
    message,
    code,
    status,
    originalError
  };
}

/**
 * Convierte un error en un resultado formateado para API
 * @param error Error a convertir
 * @returns Objeto formateado para devolver en API
 */
export function formatErrorResponse(error: unknown) {
  const serviceError = error instanceof Error ? handleErrorFormatted(error) : error as ServiceError;
  
  return {
    error: serviceError.message,
    code: serviceError.code,
    status: serviceError.status || ErrorStatusCodes[ErrorType.UNKNOWN]
  };
}

/**
 * Verifica si un objeto es un error del servicio
 */
export function isServiceError(error: unknown): error is ServiceError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    'status' in error
  );
}

/**
 * Crea un error del servicio
 */
export function createServiceError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN,
  originalError?: unknown
): ServiceError {
  return {
    message,
    code: type,
    status: ErrorStatusCodes[type],
    originalError
  };
} 