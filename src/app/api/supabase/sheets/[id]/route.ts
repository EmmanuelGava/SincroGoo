import { NextRequest, NextResponse } from 'next/server';
import { SheetsService } from '../../../../../lib/supabase/services/sheets';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';

// Instanciar el servicio
const sheetsService = new SheetsService();

/**
 * GET /api/supabase/sheets/[id]
 * Obtiene una hoja de cálculo específica por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Validar ID de la hoja
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la hoja de cálculo' }, 
        { status: 400 }
      );
    }
    
    // Obtener hoja de cálculo
    const sheet = await sheetsService.getSheetById(sheetId);
    
    if (!sheet) {
      return NextResponse.json(
        { error: 'Hoja de cálculo no encontrada' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ sheet });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * PUT /api/supabase/sheets/[id]
 * Actualiza una hoja de cálculo existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Validar ID de la hoja
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la hoja de cálculo' }, 
        { status: 400 }
      );
    }
    
    // Obtener datos de la solicitud
    const data = await request.json();
    
    // Actualizar hoja de cálculo
    const success = await sheetsService.updateSheet(sheetId, {
      nombre: data.nombre,
      titulo: data.titulo,
      ultima_sincronizacion: data.ultima_sincronizacion,
      google_id: data.google_id,
      url: data.url,
      metadata: data.metadata
    });
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la hoja de cálculo' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * DELETE /api/supabase/sheets/[id]
 * Elimina una hoja de cálculo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sheetId = params.id;
    
    // Validar ID de la hoja
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la hoja de cálculo' }, 
        { status: 400 }
      );
    }
    
    // Primero eliminar todas las celdas asociadas
    await sheetsService.deleteCellsBySheetId(sheetId);
    
    // Eliminar hoja de cálculo
    const success = await sheetsService.deleteSheet(sheetId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la hoja de cálculo' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 