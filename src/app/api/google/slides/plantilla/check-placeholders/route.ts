import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';

const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}/g;

/**
 * GET /api/google/slides/plantilla/check-placeholders?presentationId=xxx
 * Verifica si la presentación tiene al menos un placeholder {{Columna}}
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const presentationId = request.nextUrl.searchParams.get('presentationId');
    if (!presentationId) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere presentationId' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const resultado = await slidesService.obtenerPresentacion(presentationId, false);

    if (!resultado.exito || !resultado.datos) {
      return NextResponse.json(
        { exito: false, error: resultado.error || 'Error al obtener presentación' },
        { status: 500 }
      );
    }

    let hasPlaceholders = false;
    const placeholders = new Set<string>();

    for (const slide of resultado.datos.slides || []) {
      for (const element of slide.pageElements || []) {
        const text = element.shape?.text?.textElements;
        if (!text) continue;
        for (const te of text) {
          const content = (te.textRun as { content?: string })?.content || '';
          const matches = content.match(PLACEHOLDER_REGEX);
          if (matches) {
            hasPlaceholders = true;
            matches.forEach((m) => placeholders.add(m));
          }
        }
      }
    }

    return NextResponse.json({
      exito: true,
      datos: {
        hasPlaceholders,
        placeholders: Array.from(placeholders)
      }
    });
  } catch (error) {
    console.error('[check-placeholders] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
