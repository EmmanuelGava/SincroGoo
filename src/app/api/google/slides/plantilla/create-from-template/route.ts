import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { PlantillaTemplateService } from '@/app/servicios/google/slides/PlantillaTemplateService';
import { PLANTILLAS } from '@/app/editor-proyectos/plantilla/templates';

/**
 * POST /api/google/slides/plantilla/create-from-template
 * Crea una presentación en Google Slides con el diseño de una plantilla predefinida.
 * Body: { templateId: string, titulo: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, titulo } = body;

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json(
        { exito: false, error: 'Se requiere templateId (string)' },
        { status: 400 }
      );
    }

    if (!titulo || typeof titulo !== 'string') {
      return NextResponse.json(
        { exito: false, error: 'Se requiere titulo (string)' },
        { status: 400 }
      );
    }

    const valido = PLANTILLAS.some(p => p.id === templateId);
    if (!valido) {
      return NextResponse.json(
        { exito: false, error: `templateId inválido: ${templateId}` },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const plantillaService = new PlantillaTemplateService(slidesService);

    const resultado = await plantillaService.crearPresentacionDesdePlantilla(
      templateId,
      titulo.trim() || 'Plantilla SincroGoo'
    );

    if (!resultado) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo crear la presentación desde la plantilla' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exito: true,
      datos: {
        presentationId: resultado.presentationId,
        slideId: resultado.slideId,
        url: `https://docs.google.com/presentation/d/${resultado.presentationId}/edit`
      }
    });
  } catch (error) {
    console.error('[create-from-template] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
