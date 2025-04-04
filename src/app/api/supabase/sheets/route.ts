import { NextRequest, NextResponse } from 'next/server';
import { SheetsService } from '../../../../lib/supabase/services/sheets';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

// Crear una instancia del servicio
const sheetsService = new SheetsService();

/**
 * GET /api/supabase/sheets
 * Obtiene las hojas de cálculo según los filtros proporcionados
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const proyecto_id = searchParams.get('proyecto_id');
    const busqueda = searchParams.get('busqueda') || undefined;
    const ordenPor = (searchParams.get('ordenPor') || 'created_at') as 'created_at' | 'updated_at' | 'titulo';
    const orden = (searchParams.get('orden') || 'desc') as 'asc' | 'desc';
    const pagina = searchParams.has('pagina') ? parseInt(searchParams.get('pagina')!) : 1;
    const porPagina = searchParams.has('porPagina') ? parseInt(searchParams.get('porPagina')!) : 20;
    
    // Consultar hojas de cálculo
    const sheets = await sheetsService.listSheets({
      proyecto_id: proyecto_id || undefined,
      busqueda,
      ordenPor,
      orden,
      pagina,
      porPagina
    });
    
    return NextResponse.json({ sheets });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * POST /api/supabase/sheets
 * Crea una nueva hoja de cálculo
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener datos de la solicitud
    const data = await request.json();
    
    // Validar datos mínimos requeridos
    if (!data.proyecto_id || !data.sheets_id) {
      return NextResponse.json(
        { error: 'Se requiere proyecto_id y sheets_id' }, 
        { status: 400 }
      );
    }
    
    // Crear hoja de cálculo
    const sheetId = await sheetsService.createSheet({
      proyecto_id: data.proyecto_id,
      sheets_id: data.sheets_id,
      nombre: data.nombre,
      titulo: data.titulo,
      google_id: data.google_id,
      url: data.url,
      metadata: data.metadata
    });
    
    if (!sheetId) {
      return NextResponse.json(
        { error: 'No se pudo crear la hoja de cálculo' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ id: sheetId });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 