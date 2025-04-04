import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]
 * Obtiene una presentación específica por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Obtener la presentación
    const slide = await slidesService.getSlideById(id);
    
    if (!slide) {
      return NextResponse.json(
        { error: 'Presentación no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener las diapositivas relacionadas
    const slideItems = await slidesService.listSlideItems({ slides_id: id });
    
    // Devolver respuesta
    return NextResponse.json({ slide, slideItems });
  } catch (error) {
    return formatErrorResponse('Error al obtener presentación');
  }
}

/**
 * PUT /api/supabase/slides/[id]
 * Actualiza una presentación específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Verificar que la presentación existe
    const existingSlide = await slidesService.getSlideById(id);
    
    if (!existingSlide) {
      return NextResponse.json(
        { error: 'Presentación no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Actualizar presentación
    const success = await slidesService.updateSlide(id, data);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar la presentación' },
        { status: 500 }
      );
    }
    
    // Obtener la presentación actualizada
    const updatedSlide = await slidesService.getSlideById(id);
    
    // Devolver respuesta
    return NextResponse.json({ slide: updatedSlide });
  } catch (error) {
    return formatErrorResponse('Error al actualizar presentación');
  }
}

/**
 * DELETE /api/supabase/slides/[id]
 * Elimina una presentación específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Verificar que la presentación existe
    const existingSlide = await slidesService.getSlideById(id);
    
    if (!existingSlide) {
      return NextResponse.json(
        { error: 'Presentación no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar presentación
    const success = await slidesService.deleteSlide(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar la presentación' },
        { status: 500 }
      );
    }
    
    // Devolver respuesta
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse('Error al eliminar presentación');
  }
} 