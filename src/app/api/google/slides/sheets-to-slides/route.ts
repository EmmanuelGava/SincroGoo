import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { ExcelToSlidesService } from '@/app/servicios/google/conversions/excel-to-slides/ExcelToSlidesService';
import { SheetsService } from '@/servicios/google/sheets';

/**
 * POST /api/google/slides/sheets-to-slides
 * Genera una presentación de Google Slides desde los datos de una hoja de cálculo.
 * Body: { spreadsheetId: string, nombrePresentacion: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ exito: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { spreadsheetId, nombrePresentacion } = body;

    if (!spreadsheetId || !nombrePresentacion) {
      return NextResponse.json(
        { exito: false, error: 'Se requieren spreadsheetId y nombrePresentacion' },
        { status: 400 }
      );
    }

    const sheetsService = SheetsService.getInstance(session.accessToken);
    const resultadoDatos = await sheetsService.obtenerDatosHoja(spreadsheetId);

    if (!resultadoDatos.exito || !resultadoDatos.datos) {
      return NextResponse.json(
        { exito: false, error: resultadoDatos.error || 'No se pudieron leer los datos de la hoja' },
        { status: 400 }
      );
    }

    const { encabezados, filas } = resultadoDatos.datos;
    const datos: any[][] = [
      encabezados,
      ...filas.map((f: { valores: { valor: any }[] }) => f.valores.map((v: { valor: any }) => v.valor))
    ];

    if (datos.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'La hoja no tiene datos' },
        { status: 400 }
      );
    }

    const excelToSlidesService = ExcelToSlidesService.getInstance(session.accessToken);
    const presentationId = await excelToSlidesService.generarPresentacionDesdeDatos(
      nombrePresentacion,
      datos
    );

    if (!presentationId) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo generar la presentación' },
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
    console.error('[sheets-to-slides] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
