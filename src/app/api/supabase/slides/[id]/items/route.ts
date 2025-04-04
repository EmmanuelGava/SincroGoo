import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/slides/[id]/items
 * Obtiene todas las diapositivas de una presentación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slideId = params.id;
    
    // Verificar que la presentación existe
    const slide = await slidesService.getSlideById(slideId);
    
    if (!slide) {
      return NextResponse.json(
        { error: 'Presentación no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const ordenarPorParam = searchParams.get('ordenarPor') || 'orden';
    const ordenParam = searchParams.get('orden') || 'asc';
    
    // Validar ordenarPor
    let ordenarPor: 'orden' | 'titulo' = 'orden';
    if (ordenarPorParam === 'titulo') {
      ordenarPor = 'titulo';
    }
    
    // Validar orden
    let orden: 'asc' | 'desc' = 'asc';
    if (ordenParam === 'desc') {
      orden = 'desc';
    }
    
    // Obtener diapositivas
    const slideItems = await slidesService.listSlideItems({
      slides_id: slideId,
      ordenarPor,
      orden
    });
    
    // Devolver respuesta
    return NextResponse.json({ slideItems });
  } catch (error) {
    return formatErrorResponse('Error al obtener diapositivas');
  }
}

/**
 * POST /api/supabase/slides/[id]/items
 * Crea una nueva diapositiva en una presentación
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slideId = params.id;
    
    // Verificar que la presentación existe
    const slide = await slidesService.getSlideById(slideId);
    
    if (!slide) {
      return NextResponse.json(
        { error: 'Presentación no encontrada' },
        { status: 404 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Asegurar que el slides_id esté establecido correctamente
    data.slides_id = slideId;
    
    // Crear diapositiva
    const slideItemId = await slidesService.createSlideItem(data);
    
    if (!slideItemId) {
      return NextResponse.json(
        { error: 'No se pudo crear la diapositiva' },
        { status: 500 }
      );
    }
    
    // Obtener todas las diapositivas para devolver una lista actualizada
    const slideItems = await slidesService.listSlideItems({ slides_id: slideId });
    
    // Devolver respuesta
    return NextResponse.json({
      success: true,
      slideItemId,
      slideItems
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse('Error al crear diapositiva');
  }
} 