import { NextRequest, NextResponse } from 'next/server';
import { sheetsService } from '../../../../../../../lib/supabase/services/sheets';
import { formatErrorResponse } from '../../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/sheets/[id]/cells/[cellId]
 * Obtiene una celda específica por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; cellId: string } }
) {
  try {
    const { cellId } = params;
    
    // Obtener la celda
    const cell = await sheetsService.getCellById(cellId);
    
    if (!cell) {
      return NextResponse.json(
        { error: 'Celda no encontrada' },
        { status: 404 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ cell });
  } catch (error) {
    return formatErrorResponse('Error al obtener celda');
  }
}

/**
 * PUT /api/supabase/sheets/[id]/cells/[cellId]
 * Actualiza una celda específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; cellId: string } }
) {
  try {
    const { cellId } = params;
    
    // Verificar si la celda existe
    const existingCell = await sheetsService.getCellById(cellId);
    
    if (!existingCell) {
      return NextResponse.json(
        { error: 'Celda no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Actualizar celda
    const success = await sheetsService.updateCell(cellId, {
      contenido: data.contenido,
      tipo: data.tipo,
      formato: data.formato
    });
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la celda' },
        { status: 500 }
      );
    }
    
    // Obtener la celda actualizada
    const updatedCell = await sheetsService.getCellById(cellId);
    
    // Devolver respuesta
    return NextResponse.json({ 
      success: true,
      cell: updatedCell 
    });
  } catch (error) {
    return formatErrorResponse('Error al actualizar celda');
  }
}

/**
 * DELETE /api/supabase/sheets/[id]/cells/[cellId]
 * Elimina una celda específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cellId: string } }
) {
  try {
    const { cellId } = params;
    
    // Verificar si la celda existe
    const existingCell = await sheetsService.getCellById(cellId);
    
    if (!existingCell) {
      return NextResponse.json(
        { error: 'Celda no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar celda
    const success = await sheetsService.deleteCell(cellId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la celda' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar celda');
  }
} 