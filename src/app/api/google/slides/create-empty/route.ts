import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';

/**
 * POST /api/google/slides/create-empty
 * Crea una presentación vacía en Google Drive del usuario.
 * Body: { titulo: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { titulo } = body;

    if (!titulo || typeof titulo !== 'string') {
      return NextResponse.json(
        { exito: false, error: 'Se requiere titulo (string)' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const resultado = await slidesService.crearPresentacion({
      titulo: titulo.trim() || 'Presentación Klosync'
    });

    if (!resultado.exito || !resultado.datos) {
      return NextResponse.json(
        {
          exito: false,
          error: resultado.error || 'No se pudo crear la presentación'
        },
        { status: 500 }
      );
    }

    const presentationId = (resultado.datos as { presentationId?: string }).presentationId;
    if (!presentationId) {
      return NextResponse.json(
        { exito: false, error: 'No se obtuvo el ID de la presentación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exito: true,
      datos: {
        presentationId,
        url: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    });
  } catch (error) {
    console.error('[create-empty] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
