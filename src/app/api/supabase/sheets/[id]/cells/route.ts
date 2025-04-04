import { NextRequest, NextResponse } from 'next/server';
import { sheetsService } from '../../../../../../lib/supabase/services/sheets';
import { formatErrorResponse } from '../../../../../../lib/supabase/utils/error-handler';
import type { SheetCellCreateParams } from '../../../../../../lib/supabase/types/sheets';

/**
 * GET /api/supabase/sheets/[id]/cells
 * Obtiene todas las celdas de una hoja de cálculo con opciones de filtrado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const filaInicio = searchParams.get('filaInicio') ? 
      parseInt(searchParams.get('filaInicio')!, 10) : undefined;
    const filaFin = searchParams.get('filaFin') ? 
      parseInt(searchParams.get('filaFin')!, 10) : undefined;
    const columnasParam = searchParams.get('columnas');
    const columnas = columnasParam ? columnasParam.split(',') : undefined;
    
    // Obtener celdas
    const cells = await sheetsService.listCells({
      sheet_id: sheetId,
      filaInicio,
      filaFin,
      columnas
    });
    
    // Devolver respuesta
    return NextResponse.json({ cells });
  } catch (error) {
    return formatErrorResponse('Error al obtener celdas');
  }
}

/**
 * POST /api/supabase/sheets/[id]/cells
 * Crea o actualiza múltiples celdas en una hoja de cálculo
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Validar que se proporcionen celdas
    if (!Array.isArray(data.cells) || data.cells.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de celdas' },
        { status: 400 }
      );
    }
    
    // Asegurar que todas las celdas tengan el sheet_id correcto
    const cellsWithSheetId: SheetCellCreateParams[] = data.cells.map((cell: any) => ({
      ...cell,
      sheet_id: sheetId
    }));
    
    // Crear o actualizar celdas
    const cellIds = await sheetsService.upsertCells(sheetId, cellsWithSheetId);
    
    if (!cellIds) {
      return NextResponse.json(
        { error: 'No se pudieron crear/actualizar las celdas' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({
      success: true,
      cellIds
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse('Error al crear/actualizar celdas');
  }
}

/**
 * PUT /api/supabase/sheets/[id]/cells
 * Actualiza múltiples celdas en una hoja de cálculo (upsert)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Validar que se proporcionen celdas
    if (!Array.isArray(data.cells) || data.cells.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de celdas' },
        { status: 400 }
      );
    }
    
    // Asegurar que todas las celdas tengan el sheet_id correcto
    const cellsWithSheetId: SheetCellCreateParams[] = data.cells.map((cell: any) => ({
      ...cell,
      sheet_id: sheetId
    }));
    
    // Crear o actualizar celdas
    const cellIds = await sheetsService.upsertCells(sheetId, cellsWithSheetId);
    
    if (!cellIds) {
      return NextResponse.json(
        { error: 'No se pudieron actualizar las celdas' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({
      success: true,
      cellIds
    });
  } catch (error) {
    return formatErrorResponse('Error al actualizar celdas');
  }
}

/**
 * DELETE /api/supabase/sheets/[id]/cells
 * Elimina todas las celdas de una hoja de cálculo o un rango específico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Obtener parámetros de consulta para eliminar un rango específico
    const searchParams = request.nextUrl.searchParams;
    const filaInicio = searchParams.get('filaInicio') ? 
      parseInt(searchParams.get('filaInicio')!, 10) : null;
    const filaFin = searchParams.get('filaFin') ? 
      parseInt(searchParams.get('filaFin')!, 10) : null;
    const columnaInicio = searchParams.get('columnaInicio') || null;
    const columnaFin = searchParams.get('columnaFin') || null;
    
    let success: boolean;
    
    // Si se especifica un rango, eliminar ese rango
    if (filaInicio !== null && filaFin !== null) {
      success = await sheetsService.deleteCellsByRange(
        sheetId, 
        filaInicio, 
        filaFin,
        columnaInicio || undefined,
        columnaFin || undefined
      );
    } else {
      // Si no, eliminar todas las celdas de la hoja
      success = await sheetsService.deleteCellsBySheetId(sheetId);
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudieron eliminar las celdas' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar celdas');
  }
} 