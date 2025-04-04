import { NextRequest, NextResponse } from 'next/server';
import { slidesService } from '../../../../lib/supabase/services/slides';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import type { SlideListOptions } from '../../../../lib/supabase/types/slides';

/**
 * GET /api/supabase/slides
 * Obtiene la lista de presentaciones con opciones de filtrado
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const proyecto_id = searchParams.get('proyecto_id') || undefined;
    const busqueda = searchParams.get('busqueda') || undefined;
    const ordenPorParam = searchParams.get('ordenPor') || 'created_at';
    const ordenParam = searchParams.get('orden') || 'desc';
    const pagina = parseInt(searchParams.get('pagina') || '1', 10);
    const porPagina = parseInt(searchParams.get('porPagina') || '20', 10);

    // Validar ordenPor
    let ordenPor: 'created_at' | 'updated_at' | 'titulo' | undefined = 'created_at';
    if (ordenPorParam === 'titulo' || ordenPorParam === 'updated_at' || ordenPorParam === 'created_at') {
      ordenPor = ordenPorParam;
    }

    // Validar orden
    let orden: 'asc' | 'desc' = 'desc';
    if (ordenParam === 'asc') {
      orden = 'asc';
    }

    // Construir opciones
    const options: SlideListOptions = {
      proyecto_id,
      busqueda,
      ordenPor,
      orden,
      pagina,
      porPagina
    };

    // Obtener presentaciones
    const slides = await slidesService.listSlides(options);

    // Devolver respuesta
    return NextResponse.json({ slides });
  } catch (error) {
    return formatErrorResponse('Error al obtener presentaciones');
  }
}

/**
 * POST /api/supabase/slides
 * Crea una nueva presentación
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();

    // Validar datos mínimos requeridos
    if (!data.proyecto_id || !data.titulo) {
      return NextResponse.json(
        { error: 'Se requiere proyecto_id y titulo' },
        { status: 400 }
      );
    }

    // Crear presentación
    const slideId = await slidesService.createSlide(data);

    if (!slideId) {
      return NextResponse.json(
        { error: 'No se pudo crear la presentación' },
        { status: 500 }
      );
    }

    // Obtener la presentación creada
    const slide = await slidesService.getSlideById(slideId);

    // Devolver respuesta
    return NextResponse.json({ slide }, { status: 201 });
  } catch (error) {
    return formatErrorResponse('Error al crear presentación');
  }
} 