import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]
 * Obtiene un elemento específico y sus asociaciones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string } }
) {
  try {
    const { itemId: slideItemId, elementId } = params;
    
    // Obtener todos los elementos
    const elements = await slidesService.getSlideElements(slideItemId);
    const element = elements.find(el => el.id === elementId);
    
    if (!element) {
      return NextResponse.json(
        { error: 'Elemento no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener asociaciones del elemento
    const associations = await slidesService.getElementAssociations(elementId);
    
    // Devolver respuesta
    return NextResponse.json({ element, associations });
  } catch (error) {
    return formatErrorResponse('Error al obtener elemento');
  }
}

/**
 * PUT /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]
 * Actualiza un elemento específico
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string } }
) {
  try {
    const { itemId: slideItemId, elementId } = params;
    
    // Verificar que el elemento existe
    const elements = await slidesService.getSlideElements(slideItemId);
    const element = elements.find(el => el.id === elementId);
    
    if (!element) {
      return NextResponse.json(
        { error: 'Elemento no encontrado' },
        { status: 404 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Actualizar elemento
    const success = await slidesService.updateSlideElement(elementId, data);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el elemento' },
        { status: 500 }
      );
    }
    
    // Obtener el elemento actualizado
    const updatedElements = await slidesService.getSlideElements(slideItemId);
    const updatedElement = updatedElements.find(el => el.id === elementId);
    
    // Devolver respuesta
    return NextResponse.json({ 
      success: true,
      element: updatedElement 
    });
  } catch (error) {
    return formatErrorResponse('Error al actualizar elemento');
  }
}

/**
 * DELETE /api/supabase/slides/[id]/items/[itemId]/elements/[elementId]
 * Elimina un elemento específico
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string; elementId: string } }
) {
  try {
    const { elementId } = params;
    
    // Eliminar elemento
    const success = await slidesService.deleteSlideElement(elementId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el elemento' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar elemento');
  }
} 