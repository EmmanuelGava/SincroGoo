import { NextRequest, NextResponse } from 'next/server';
import { ProjectsService } from '../../../../../lib/supabase/services/projects';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';
import { jsonAuthError, requireUsuarioId } from '@/lib/auth/requireUsuario';

const projectsService = new ProjectsService();

/**
 * GET /api/supabase/projects/[id]
 * Obtiene un proyecto del usuario de la sesión. 404 si no es dueño.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario_id = await requireUsuarioId();
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' },
        { status: 400 }
      );
    }

    const includeRelations = request.nextUrl.searchParams.get('includeRelations') === 'true';
    const project = includeRelations
      ? await projectsService.getProjectWithRelations(projectId)
      : await projectsService.getProjectById(projectId);

    if (!project || project.usuario_id !== usuario_id) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    const auth = jsonAuthError(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * PUT /api/supabase/projects/[id]
 * Actualiza un proyecto del usuario de la sesión.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario_id = await requireUsuarioId();
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' },
        { status: 400 }
      );
    }

    const owned = await projectsService.getProjectOwnedBy(projectId, usuario_id);
    if (!owned) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const success = await projectsService.updateProject(projectId, {
      nombre: data.nombre,
      descripcion: data.descripcion,
      presentacion_id: data.presentacion_id,
      hoja_calculo_id: data.hoja_calculo_id,
      modo: data.modo,
      metadata: data.metadata,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el proyecto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const auth = jsonAuthError(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * DELETE /api/supabase/projects/[id]
 * Elimina un proyecto del usuario de la sesión.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario_id = await requireUsuarioId();
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' },
        { status: 400 }
      );
    }

    const owned = await projectsService.getProjectOwnedBy(projectId, usuario_id);
    if (!owned) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    const success = await projectsService.deleteProject(projectId);

    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el proyecto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const auth = jsonAuthError(error);
    if (auth) return NextResponse.json(auth.body, { status: auth.status });
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
