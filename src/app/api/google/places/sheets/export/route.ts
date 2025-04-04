import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { ExplorerSheetsService } from '@/app/servicios/google/explorer/ExplorerSheetsService';
import { validarSesion } from '@/app/api/google/places/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const validacion = await validarSesion(session);
    
    if (!validacion.exito) {
      return Response.json({ 
        exito: false, 
        error: validacion.error 
      }, { status: 401 });
    }

    const { titulo, datos } = await request.json();

    if (!titulo || !datos || !Array.isArray(datos)) {
      return Response.json({ 
        exito: false, 
        error: 'Datos inválidos' 
      }, { status: 400 });
    }

    // Verificamos que el accessToken exista
    if (!session?.accessToken) {
      return Response.json({ 
        exito: false, 
        error: 'Token de acceso no disponible' 
      }, { status: 401 });
    }

    const sheetsService = ExplorerSheetsService.getInstance(session.accessToken);
    const resultado = await sheetsService.crearHojaCalculo(titulo, datos);

    return Response.json(resultado);
  } catch (error) {
    console.error('Error al exportar a sheets:', error);
    return Response.json({ 
      exito: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 