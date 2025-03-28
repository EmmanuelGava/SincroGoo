import { toast } from '@/componentes/ui/use-toast';

export class ErrorHandler {
  static handleError(error: unknown, context: string = ''): void {
    console.error(`❌ [${context}] Error:`, error);

    let mensaje = 'Ha ocurrido un error inesperado';
    
    if (error instanceof Error) {
      mensaje = error.message;
    } else if (typeof error === 'string') {
      mensaje = error;
    }

    // Mostrar toast de error
    toast({
      variant: "destructive",
      title: `Error en ${context}`,
      description: mensaje,
    });
  }

  static handleHttpError(response: Response, context: string = ''): void {
    console.error(`❌ [${context}] Error HTTP ${response.status}:`, response.statusText);

    let mensaje = 'Error en la comunicación con el servidor';
    
    switch (response.status) {
      case 401:
        mensaje = 'No autorizado. Por favor, inicie sesión nuevamente.';
        break;
      case 403:
        mensaje = 'No tiene permisos para realizar esta acción.';
        break;
      case 404:
        mensaje = 'El recurso solicitado no fue encontrado.';
        break;
      case 500:
        mensaje = 'Error interno del servidor. Por favor, intente más tarde.';
        break;
      default:
        mensaje = `Error ${response.status}: ${response.statusText}`;
    }

    toast({
      variant: "destructive",
      title: `Error en ${context}`,
      description: mensaje,
    });
  }
} 