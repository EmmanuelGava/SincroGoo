import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]/associations
 * Obtiene todas las asociaciones de un elemento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string } }
) {
  try {
    const { elementId } = params;
    
    // Obtener asociaciones
    const associations = await slidesService.getElementAssociations(elementId);
    
    // Devolver respuesta
    return NextResponse.json({ associations });
  } catch (error) {
    return formatErrorResponse('Error al obtener asociaciones');
  }
}

/**
 * POST /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]/associations
 * Crea una nueva asociación para un elemento
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string } }
) {
  try {
    const { elementId } = params;
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Asegurar que el elemento_id esté establecido correctamente
    data.elemento_id = elementId;
    
    // Validar datos mínimos requeridos
    if (!data.sheets_id || !data.columna) {
      return NextResponse.json(
        { error: 'Se requiere sheets_id y columna' },
        { status: 400 }
      );
    }
    
    // Crear asociación
    const associationId = await slidesService.createElementAssociation(data);
    
    if (!associationId) {
      return NextResponse.json(
        { error: 'No se pudo crear la asociación' },
        { status: 500 }
      );
    }
    
    // Obtener todas las asociaciones para devolver una lista actualizada
    const associations = await slidesService.getElementAssociations(elementId);
    
    // Devolver respuesta
    return NextResponse.json({
      success: true,
      associationId,
      associations
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse('Error al crear asociación');
  }
} 