import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
const ALLOWED_CSV = ['text/csv', 'application/csv', 'text/plain'];

/**
 * POST /api/datos/parse
 * Parsea archivo Excel (.xlsx, .xls) o CSV y devuelve datos normalizados al formato DatosHoja.
 *
 * Body: FormData con:
 *   - file: File (obligatorio)
 *   - sheetName?: string (para Excel con múltiples hojas; si no se envía y hay varias, devuelve sheetNames para que el cliente elija)
 *
 * Respuesta:
 *   - exito, datos: { encabezados, filas, sheetNames?, tituloHoja? }
 *   - Si Excel con varias hojas y no sheetName: devuelve sheetNames y no filas (el cliente debe reenviar con sheetName)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sheetName = formData.get('sheetName') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { exito: false, error: 'Se requiere un archivo' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { exito: false, error: 'El archivo excede el límite de 5MB' },
        { status: 400 }
      );
    }

    const ext = (file.name || '').toLowerCase().split('.').pop();
    const mime = file.type || '';

    const isExcel =
      ['.xlsx', '.xls'].includes('.' + ext) ||
      ALLOWED_EXCEL.some((m) => mime.includes(m));
    const isCsv =
      ext === 'csv' || ALLOWED_CSV.some((m) => mime.includes(m));

    if (!isExcel && !isCsv) {
      return NextResponse.json(
        {
          exito: false,
          error:
            'Formato no soportado. Use Excel (.xlsx, .xls) o CSV.'
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      return NextResponse.json(
        { exito: false, error: 'El archivo no contiene hojas' },
        { status: 400 }
      );
    }

    // Excel con múltiples hojas y sin sheetName: pedir al cliente que elija
    if (isExcel && sheetNames.length > 1 && !sheetName) {
      return NextResponse.json({
        exito: true,
        datos: {
          sheetNames,
          encabezados: [],
          filas: [],
          requiereSeleccionHoja: true
        }
      });
    }

    const nameToUse = sheetName && sheetNames.includes(sheetName)
      ? sheetName
      : sheetNames[0];

    const worksheet = workbook.Sheets[nameToUse];
    if (!worksheet) {
      return NextResponse.json(
        { exito: false, error: `No se encontró la hoja "${nameToUse}"` },
        { status: 400 }
      );
    }

    // sheet_to_json con header: 1 devuelve array de arrays
    // header: 1 = primera fila son los datos, no los keys del objeto
    const raw = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as (string | number | null | undefined)[][];

    if (!raw || raw.length === 0) {
      return NextResponse.json({
        exito: true,
        datos: {
          encabezados: [],
          filas: [],
          tituloHoja: nameToUse
        }
      });
    }

    // Primera fila = encabezados, resto = datos (formato DatosHoja como SheetsService)
    const encabezados = raw[0].map((h, i) =>
      h != null && String(h).trim()
        ? String(h).trim()
        : `Columna ${i + 1}`
    );
    const filas = raw.slice(1).map((row, index) => ({
      indice: index + 1,
      valores: encabezados.map((_, colIdx) => ({
        valor: row[colIdx] != null && row[colIdx] !== ''
          ? String(row[colIdx])
          : ''
      }))
    }));

    return NextResponse.json({
      exito: true,
      datos: {
        encabezados,
        filas,
        tituloHoja: nameToUse,
        ...(sheetNames.length > 1 && { sheetNames })
      }
    });
  } catch (error) {
    console.error('[datos/parse] Error:', error);
    return NextResponse.json(
      {
        exito: false,
        error:
          error instanceof Error ? error.message : 'Error al procesar el archivo'
      },
      { status: 500 }
    );
  }
}
