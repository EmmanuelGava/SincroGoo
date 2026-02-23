import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { SheetsService } from '@/servicios/google/sheets';

/**
 * POST /api/google/slides/plantilla/generate
 * Genera una diapositiva por cada fila del Sheet, duplicando la plantilla y reemplazando placeholders.
 * Body: { presentationId, spreadsheetId, encabezados?: string[], columnMapping?: Record<string, string>, slideTemplateId?: string }
 * columnMapping: placeholder name -> sheet column name (e.g. { "Nombre": "Nombre Completo" })
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { presentationId, spreadsheetId, encabezados, columnMapping, slideTemplateId } = body;

    if (!presentationId || !spreadsheetId) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren presentationId y spreadsheetId' },
        { status: 400 }
      );
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const sheetsService = SheetsService.getInstance(session.accessToken);

    const datosResult = await sheetsService.obtenerDatosHoja(spreadsheetId);
    if (!datosResult.exito || !datosResult.datos) {
      return NextResponse.json(
        { exito: false, error: datosResult.error || 'Error al leer el Sheet' },
        { status: 500 }
      );
    }

    const { encabezados: headers, filas } = datosResult.datos;
    if (filas.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'El Sheet no tiene filas de datos' },
        { status: 400 }
      );
    }

    let templateSlideId = slideTemplateId;
    if (!templateSlideId) {
      const presResult = await slidesService.obtenerPresentacion(presentationId, false);
      if (!presResult.exito || !presResult.datos?.slides?.length) {
        return NextResponse.json(
          { exito: false, error: 'No se encontró la presentación o está vacía' },
          { status: 500 }
        );
      }
      templateSlideId = presResult.datos.slides[0].objectId || '';
    }

    if (!templateSlideId) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo determinar la diapositiva plantilla' },
        { status: 500 }
      );
    }

    let exito = 0;
    const fallidos: { fila: number; error: string }[] = [];
    const numSlidesAntes = (await slidesService.obtenerPresentacion(presentationId, false)).datos?.slides?.length || 0;
    let insercionIndex = numSlidesAntes;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const valores = fila.valores || [];

      try {
        const dupResult = await slidesService.duplicarDiapositivaYObtenerId(
          presentationId,
          templateSlideId,
          insercionIndex
        );

        if (!dupResult.exito || !dupResult.datos) {
          fallidos.push({ fila: i + 2, error: dupResult.error || 'Error al duplicar' });
          continue;
        }

        const nuevaSlideId = dupResult.datos;
        insercionIndex++;

        const replacements: Record<string, string> = {};
        if (columnMapping && typeof columnMapping === 'object' && Object.keys(columnMapping).length > 0) {
          for (const [placeholder, columnName] of Object.entries(columnMapping)) {
            const colIdx = headers.findIndex((h: string) => String(h || '').trim() === String(columnName || '').trim());
            const valor = colIdx >= 0 ? valores[colIdx] : null;
            const valorStr = valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
            replacements[`{{${placeholder}}}`] = valorStr;
          }
        } else {
          const colsToUse = Array.isArray(encabezados) && encabezados.length > 0 ? encabezados : headers;
          colsToUse.forEach((col: string, idx: number) => {
            const headerName = (headers[idx] || col || '').toString().trim();
            const valor = valores[idx];
            const valorStr = valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
            if (headerName) replacements[`{{${headerName}}}`] = valorStr;
            if (col && col !== headerName) replacements[`{{${col}}}`] = valorStr;
          });
        }

        const replaceResult = await slidesService.reemplazarPlaceholders(
          presentationId,
          replacements,
          [nuevaSlideId]
        );

        if (!replaceResult.exito) {
          fallidos.push({ fila: i + 2, error: replaceResult.error || 'Error al reemplazar' });
          continue;
        }

        exito++;
      } catch (err) {
        fallidos.push({
          fila: i + 2,
          error: err instanceof Error ? err.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      exito: true,
      datos: {
        generadas: exito,
        total: filas.length,
        fallidas: fallidos.length,
        errores: fallidos
      }
    });
  } catch (error) {
    console.error('[plantilla/generate] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
