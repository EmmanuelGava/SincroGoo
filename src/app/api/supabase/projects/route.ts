import { NextRequest, NextResponse } from 'next/server';
import { ProjectsService } from '../../../../lib/supabase/services/projects';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import { jsonAuthError, requireUsuarioId } from '@/lib/auth/requireUsuario';

const projectsService = new ProjectsService();

/**
 * GET /api/supabase/projects
 * Obtiene los proyectos del usuario de la sesión (ignora usuario_id del query).
 */
export async function GET(request: NextRequest) {
  try {
    const usuario_id = await requireUsuarioId();
    const searchParams = request.nextUrl.searchParams;
    const projects = await projectsService.listProjects({
      usuario_id,
      busqueda: searchParams.get('busqueda') || undefined,
      ordenPor: (searchParams.get('ordenPor') || 'created_at') as 'created_at' | 'updated_at' | 'nombre',
      orden: (searchParams.get('orden') || 'desc') as 'asc' | 'desc',
      pagina: searchParams.has('pagina') ? parseInt(searchParams.get('pagina')!) : 1,
      porPagina: searchParams.has('porPagina') ? parseInt(searchParams.get('porPagina')!) : 20,
    });
    return NextResponse.json({ projects });
  } catch (error) {
    const auth = jsonAuthError(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * POST /api/supabase/projects
 * Crea un nuevo proyecto para el usuario de la sesión.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario_id = await requireUsuarioId();
    const data = await request.json();

    if (!data.nombre) {
      return NextResponse.json(
        { error: 'Se requiere nombre' },
        { status: 400 }
      );
    }

    const projectId = await projectsService.createProject({
      nombre: data.nombre,
      descripcion: data.descripcion,
      usuario_id,
      presentacion_id: data.presentacion_id,
      hoja_calculo_id: data.hoja_calculo_id,
      modo: data.modo,
      metadata: data.metadata,
    });

    if (!projectId) {
      return NextResponse.json(
        { error: 'No se pudo crear el proyecto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: projectId });
  } catch (error) {
    const auth = jsonAuthError(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
