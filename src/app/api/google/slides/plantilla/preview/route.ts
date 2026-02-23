import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { SlidesService } from '@/app/servicios/google/slides/SlidesService';
import { SheetsService } from '@/servicios/google/sheets';

/**
 * POST /api/google/slides/plantilla/preview
 * Crea una copia de la presentación, reemplaza placeholders con la primera fila del Sheet
 * y devuelve la URL de edición para preview en modal.
 * Body: { presentationId, spreadsheetId, encabezados?: string[], columnMapping?: Record<string, string> }
 * columnMapping: placeholder name -> sheet column name (e.g. { "Nombre": "Nombre Completo" })
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { presentationId, spreadsheetId, encabezados, columnMapping } = body;

    if (!presentationId || !spreadsheetId) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren presentationId y spreadsheetId' },
        { status: 400 }
      );
    }

    const sheetsService = SheetsService.getInstance(session.accessToken);
    const datosResult = await sheetsService.obtenerDatosHoja(spreadsheetId);

    if (!datosResult.exito || !datosResult.datos) {
      return NextResponse.json(
        { exito: false, error: datosResult.error || 'Error al leer el Sheet' },
        { status: 500 }
      );
    }

    const { encabezados: headers, filas } = datosResult.datos;
    const primeraFila = filas[0];
    if (!primeraFila || !primeraFila.valores) {
      return NextResponse.json(
        { exito: false, error: 'El Sheet no tiene filas de datos' },
        { status: 400 }
      );
    }

    const replacements: Record<string, string> = {};

    if (columnMapping && typeof columnMapping === 'object' && Object.keys(columnMapping).length > 0) {
      for (const [placeholder, columnName] of Object.entries(columnMapping)) {
        const colIdx = headers.findIndex((h: string) => String(h || '').trim() === String(columnName || '').trim());
        const valor = colIdx >= 0 ? primeraFila.valores[colIdx] : null;
        const valorStr = valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
        replacements[`{{${placeholder}}}`] = valorStr;
      }
    } else {
      const colsToUse = Array.isArray(encabezados) && encabezados.length > 0 ? encabezados : headers;
      colsToUse.forEach((col: string, idx: number) => {
        const headerName = (headers[idx] || col || '').toString().trim();
        const valor = primeraFila.valores[idx];
        const valorStr = valor?.valor != null && valor.valor !== '' ? String(valor.valor) : '';
        if (headerName) replacements[`{{${headerName}}}`] = valorStr;
        if (col && col !== headerName) replacements[`{{${col}}}`] = valorStr;
      });
    }

    const slidesService = SlidesService.getInstance(session.accessToken);
    const copyResult = await slidesService.copiarPresentacion(
      presentationId,
      `Preview - ${Date.now()}`
    );

    if (!copyResult.exito || !copyResult.datos) {
      return NextResponse.json(
        { exito: false, error: copyResult.error || 'Error al copiar presentación' },
        { status: 500 }
      );
    }

    const copyId = copyResult.datos;
    const replaceResult = await slidesService.reemplazarPlaceholdersSeguro(copyId, replacements);

    if (!replaceResult.exito) {
      return NextResponse.json(
        { exito: false, error: replaceResult.error || 'Error al reemplazar placeholders' },
        { status: 500 }
      );
    }

    // Compartir para que el embed funcione en el iframe (anyone with link can view)
    const shareResult = await slidesService.compartirParaEmbed(copyId);
    if (!shareResult.exito) {
      console.warn('[plantilla/preview] No se pudo compartir la copia para embed:', shareResult.error);
      // Continuar igual - el usuario puede abrir en nueva pestaña
    }

    return NextResponse.json({
      exito: true,
      datos: {
        presentationId: copyId,
        url: `https://docs.google.com/presentation/d/${copyId}/edit`
      }
    });
  } catch (error) {
    console.error('[plantilla/preview] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
