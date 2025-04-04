import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]/items/[itemId]
 * Obtiene una diapositiva específica y sus elementos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: slideId, itemId: slideItemId } = params;
    
    // Obtener la diapositiva
    // No hay un método directo para obtener una diapositiva por ID, así que obtenemos todas
    // y filtramos la que necesitamos
    const slideItems = await slidesService.listSlideItems({ slides_id: slideId });
    const slideItem = slideItems.find(item => item.id === slideItemId);
    
    if (!slideItem) {
      return NextResponse.json(
        { error: 'Diapositiva no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener los elementos de la diapositiva
    const elements = await slidesService.getSlideElements(slideItemId);
    
    // Devolver respuesta
    return NextResponse.json({ slideItem, elements });
  } catch (error) {
    return formatErrorResponse('Error al obtener diapositiva');
  }
}

/**
 * PUT /api/supabase/slides/[id]/items/[itemId]
 * Actualiza una diapositiva específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: slideId, itemId: slideItemId } = params;
    
    // Verificar que la diapositiva existe
    const slideItems = await slidesService.listSlideItems({ slides_id: slideId });
    const slideItem = slideItems.find(item => item.id === slideItemId);
    
    if (!slideItem) {
      return NextResponse.json(
        { error: 'Diapositiva no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Actualizar diapositiva
    const success = await slidesService.updateSlideItem(slideItemId, data);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la diapositiva' },
        { status: 500 }
      );
    }
    
    // Obtener todas las diapositivas para devolver una lista actualizada
    const updatedSlideItems = await slidesService.listSlideItems({ slides_id: slideId });
    const updatedSlideItem = updatedSlideItems.find(item => item.id === slideItemId);
    
    // Devolver respuesta
    return NextResponse.json({ 
      success: true,
      slideItem: updatedSlideItem 
    });
  } catch (error) {
    return formatErrorResponse('Error al actualizar diapositiva');
  }
}

/**
 * DELETE /api/supabase/slides/[id]/items/[itemId]
 * Elimina una diapositiva específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: slideId, itemId: slideItemId } = params;
    
    // Verificar que la diapositiva existe
    const slideItems = await slidesService.listSlideItems({ slides_id: slideId });
    const slideItem = slideItems.find(item => item.id === slideItemId);
    
    if (!slideItem) {
      return NextResponse.json(
        { error: 'Diapositiva no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar diapositiva
    const success = await slidesService.deleteSlideItem(slideItemId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la diapositiva' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar diapositiva');
  }
} 