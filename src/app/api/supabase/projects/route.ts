import { NextRequest, NextResponse } from 'next/server';
import { ProjectsService } from '../../../../lib/supabase/services/projects';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

// Crear una instancia del servicio
const projectsService = new ProjectsService();

/**
 * GET /api/supabase/projects
 * Obtiene los proyectos del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const usuario_id = searchParams.get('usuario_id');
    const busqueda = searchParams.get('busqueda') || undefined;
    const ordenPor = (searchParams.get('ordenPor') || 'created_at') as 'created_at' | 'updated_at' | 'nombre';
    const orden = (searchParams.get('orden') || 'desc') as 'asc' | 'desc';
    const pagina = searchParams.has('pagina') ? parseInt(searchParams.get('pagina')!) : 1;
    const porPagina = searchParams.has('porPagina') ? parseInt(searchParams.get('porPagina')!) : 20;
    
    // Validar que hay un usuario_id (requerido)
    if (!usuario_id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del usuario' }, 
        { status: 400 }
      );
    }
    
    // Consultar proyectos
    const projects = await projectsService.listProjects({
      usuario_id,
      busqueda,
      ordenPor,
      orden,
      pagina,
      porPagina
    });
    
    return NextResponse.json({ projects });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * POST /api/supabase/projects
 * Crea un nuevo proyecto
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener datos de la solicitud
    const data = await request.json();
    
    // Validar datos mínimos requeridos
    if (!data.nombre || !data.usuario_id) {
      return NextResponse.json(
        { error: 'Se requiere nombre y usuario_id' }, 
        { status: 400 }
      );
    }
    
    // Crear proyecto
    const projectId = await projectsService.createProject({
      nombre: data.nombre,
      descripcion: data.descripcion,
      usuario_id: data.usuario_id,
      presentacion_id: data.presentacion_id,
      hoja_calculo_id: data.hoja_calculo_id,
      metadata: data.metadata
    });
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'No se pudo crear el proyecto' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ id: projectId });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 