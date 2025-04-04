import { Session } from 'next-auth';

export interface ResultadoValidacion {
  exito: boolean;
  error?: string;
}

export async function validarSesion(session: Session | null): Promise<ResultadoValidacion> {
  if (!session) {
    return {
      exito: false,
      error: 'No hay sesión activa'
    };
  }

  if (!session.accessToken) {
    return {
      exito: false,
      error: 'Token de acceso no disponible'
    };
  }

  return {
    exito: true
  };
} 