import { NextRequest, NextResponse } from 'next/server';
import { ProjectsService } from '../../../../../lib/supabase/services/projects';
import { formatErrorResponse } from '../../../../../lib/supabase/utils/error-handler';

// Crear una instancia del servicio
const projectsService = new ProjectsService();

/**
 * GET /api/supabase/projects/[id]
 * Obtiene un proyecto específico por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Validar ID del proyecto
    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' }, 
        { status: 400 }
      );
    }
    
    // Determinar si se deben incluir relaciones
    const searchParams = request.nextUrl.searchParams;
    const includeRelations = searchParams.get('includeRelations') === 'true';
    
    // Obtener proyecto
    const project = includeRelations 
      ? await projectsService.getProjectWithRelations(projectId)
      : await projectsService.getProjectById(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ project });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * PUT /api/supabase/projects/[id]
 * Actualiza un proyecto existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Validar ID del proyecto
    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' }, 
        { status: 400 }
      );
    }
    
    // Obtener datos de la solicitud
    const data = await request.json();
    
    // Actualizar proyecto
    const success = await projectsService.updateProject(projectId, {
      nombre: data.nombre,
      descripcion: data.descripcion,
      presentacion_id: data.presentacion_id,
      hoja_calculo_id: data.hoja_calculo_id,
      metadata: data.metadata
    });
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el proyecto' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * DELETE /api/supabase/projects/[id]
 * Elimina un proyecto
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Validar ID del proyecto
    if (!projectId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del proyecto' }, 
        { status: 400 }
      );
    }
    
    // Eliminar proyecto
    const success = await projectsService.deleteProject(projectId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el proyecto' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 