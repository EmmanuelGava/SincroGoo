import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]/items/[itemId]/elements
 * Obtiene todos los elementos de una diapositiva
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { itemId: slideItemId } = params;
    
    // Obtener los elementos de la diapositiva
    const elements = await slidesService.getSlideElements(slideItemId);
    
    // Devolver respuesta
    return NextResponse.json({ elements });
  } catch (error) {
    return formatErrorResponse('Error al obtener elementos de la diapositiva');
  }
}

/**
 * POST /api/supabase/slides/[id]/items/[itemId]/elements
 * Crea un nuevo elemento en una diapositiva
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { itemId: slideItemId } = params;
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Asegurar que la diapositiva_id esté establecida correctamente
    data.diapositiva_id = slideItemId;
    
    // Validar datos mínimos requeridos
    if (!data.elemento_id || !data.tipo) {
      return NextResponse.json(
        { error: 'Se requiere elemento_id y tipo' },
        { status: 400 }
      );
    }
    
    // Crear elemento
    const elementId = await slidesService.createSlideElement(data);
    
    if (!elementId) {
      return NextResponse.json(
        { error: 'No se pudo crear el elemento' },
        { status: 500 }
      );
    }
    
    // Obtener todos los elementos para devolver una lista actualizada
    const elements = await slidesService.getSlideElements(slideItemId);
    
    // Devolver respuesta
    return NextResponse.json({
      success: true,
      elementId,
      elements
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse('Error al crear elemento');
  }
} 