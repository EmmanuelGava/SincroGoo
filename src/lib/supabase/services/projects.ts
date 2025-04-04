import { supabase, getSupabaseClient } from '../client';
import { handleError, formatErrorResponse } from '../utils/error-handler';
import type { 
  Project, 
  ProjectCreateParams, 
  ProjectUpdateParams, 
  ProjectWithRelations,
  ProjectListOptions 
} from '../types/projects';
import type { PostgrestError } from '@supabase/supabase-js';
import { Sheet } from '../types/sheets';

/**
 * Servicio para gestionar proyectos
 */
export class ProjectsService {
  private readonly CONTEXT = 'ProjectsService';

  /**
   * Formatea un error para logging
   */
  private formatError(method: string, error: unknown): string {
    if (error instanceof Error) {
      return `${method}: ${error.message}`;
    }
    return `${method}: ${String(error)}`;
  }

  /**
   * Obtiene un usuario por su email
   */
  async getUsuarioPorEmail(email: string | null | undefined) {
    try {
      if (!email) return { data: null, error: new Error('Email no proporcionado') };
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();
        
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Obtiene los proyectos de un usuario por su ID
   */
  async getProyectosPorUsuarioId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('usuario_id', userId);
        
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Obtiene la lista de proyectos del usuario con opciones de filtrado
   * @param options Opciones para filtrar y paginar resultados
   * @returns Array de proyectos o array vacío si hay error
   */
  async listProjects(options: ProjectListOptions = {}): Promise<Project[]> {
    try {
      const { 
        usuario_id, 
        busqueda, 
        ordenPor = 'created_at', 
        orden = 'desc',
        pagina = 1,
        porPagina = 20
      } = options;
      
      const client = getSupabaseClient();
      let query = client.from('proyectos').select('*');
      
      // Aplicar filtros
      if (usuario_id) {
        // Filtrar directamente por el usuario_id proporcionado
        console.log(`Buscando proyectos para usuario_id: ${usuario_id}`);
        query = query.eq('usuario_id', usuario_id);
      }
      
      if (busqueda) {
        // Buscar en nombre y descripción
        query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
      }
      
      // Aplicar ordenamiento
      const columnaOrden = ordenPor === 'created_at' ? 'fecha_creacion' : 
                           ordenPor === 'updated_at' ? 'fecha_actualizacion' : 'nombre';
                           
      query = query.order(columnaOrden, { ascending: orden === 'asc' });
      
      // Aplicar paginación
      const desde = (pagina - 1) * porPagina;
      query = query.range(desde, desde + porPagina - 1);
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log(`Se encontraron ${data?.length || 0} proyectos para el usuario`);
      
      // Mapear resultados a formato Project
      return data.map(item => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion || undefined,
        usuario_id: item.usuario_id,
        presentacion_id: item.slides_id || undefined,
        hoja_calculo_id: item.sheets_id || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        metadata: {
          hojastitulo: item.hojastitulo,
          presentaciontitulo: item.presentaciontitulo
        }
      }));
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('listProjects', error));
      return [];
    }
  }

  /**
   * Obtiene un proyecto por su ID
   * @param id ID del proyecto
   * @returns El proyecto encontrado o null si no existe
   */
  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        usuario_id: data.usuario_id,
        presentacion_id: data.slides_id || undefined,
        hoja_calculo_id: data.sheets_id || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: {
          hojastitulo: data.hojastitulo,
          presentaciontitulo: data.presentaciontitulo
        }
      };
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('getProjectById', error));
      return null;
    }
  }

  /**
   * Obtiene un proyecto con sus relaciones cargadas
   * @param id ID del proyecto
   * @returns El proyecto con sus relaciones o null si no existe
   */
  async getProjectWithRelations(id: string): Promise<ProjectWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select(`
          *,
          presentacion:slides_id (
            id,
            nombre,
            url,
            thumbnail_url
          ),
          hoja_calculo:sheets_id (
            id,
            nombre,
            url
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        usuario_id: data.usuario_id,
        presentacion_id: data.slides_id || undefined,
        hoja_calculo_id: data.sheets_id || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: {
          hojastitulo: data.hojastitulo,
          presentaciontitulo: data.presentaciontitulo
        },
        presentacion: data.presentacion ? {
          id: data.presentacion.id,
          nombre: data.presentacion.nombre,
          url: data.presentacion.url,
          thumbnail_url: data.presentacion.thumbnail_url
        } : undefined,
        hoja_calculo: data.hoja_calculo ? {
          id: data.hoja_calculo.id,
          nombre: data.hoja_calculo.nombre,
          url: data.hoja_calculo.url
        } : undefined
      };
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('getProjectWithRelations', error));
      return null;
    }
  }

  /**
   * Obtiene todas las hojas de un proyecto
   * @param proyectoId ID del proyecto
   * @returns Array de hojas del proyecto
   */
  async getSheetsByProjectId(proyectoId: string): Promise<Sheet[]> {
    try {
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('proyecto_id', proyectoId);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('getSheetsByProjectId', error));
      return [];
    }
  }

  /**
   * Crea un nuevo proyecto
   * @param params Datos del proyecto a crear
   * @returns ID del proyecto creado o null si hay error
   */
  async createProject(params: ProjectCreateParams): Promise<string | null> {
    try {
      const client = getSupabaseClient();
      
      // Preparar datos para inserción
      const projectData = {
        nombre: params.nombre,
        descripcion: params.descripcion || null,
        usuario_id: params.usuario_id,
        userid: params.usuario_id, // Para compatibilidad
        slides_id: params.presentacion_id || null,
        sheets_id: params.hoja_calculo_id || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        // Extraer metadatos específicos
        hojastitulo: params.metadata?.hojastitulo || null,
        presentaciontitulo: params.metadata?.presentaciontitulo || null
      };
      
      // Insertar proyecto
      const { data, error } = await client
        .from('proyectos')
        .insert(projectData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('createProject', error));
      return null;
    }
  }

  /**
   * Actualiza un proyecto existente
   * @param projectId ID del proyecto
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateProject(projectId: string, params: ProjectUpdateParams): Promise<boolean> {
    try {
      if (!projectId) {
        throw new Error('ID de proyecto no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Preparar datos para actualización
      const updateData: Record<string, any> = {
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Añadir campos opcionales si están definidos
      if (params.nombre !== undefined) updateData.nombre = params.nombre;
      if (params.descripcion !== undefined) updateData.descripcion = params.descripcion;
      if (params.presentacion_id !== undefined) updateData.slides_id = params.presentacion_id;
      if (params.hoja_calculo_id !== undefined) updateData.sheets_id = params.hoja_calculo_id;
      
      // Extraer metadatos específicos
      if (params.metadata?.hojastitulo !== undefined) {
        updateData.hojastitulo = params.metadata.hojastitulo;
      }
      if (params.metadata?.presentaciontitulo !== undefined) {
        updateData.presentaciontitulo = params.metadata.presentaciontitulo;
      }
      
      // Actualizar proyecto
      const { error } = await client
        .from('proyectos')
        .update(updateData)
        .eq('id', projectId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('updateProject', error));
      return false;
    }
  }

  /**
   * Elimina un proyecto
   * @param projectId ID del proyecto
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      if (!projectId) {
        throw new Error('ID de proyecto no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Eliminar proyecto
      const { error } = await client
        .from('proyectos')
        .delete()
        .eq('id', projectId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('deleteProject', error));
      return false;
    }
  }

  /**
   * Obtiene el total de proyectos que coinciden con los criterios de búsqueda
   * @param options Opciones de filtrado
   * @returns Total de proyectos o 0 si hay error
   */
  async countProjects(options: Omit<ProjectListOptions, 'pagina' | 'porPagina'> = {}): Promise<number> {
    try {
      const { usuario_id, busqueda } = options;
      
      let query = supabase
        .from('proyectos')
        .select('*', { count: 'exact', head: true });
      
      if (usuario_id) {
        query = query.or(`usuario_id.eq.${usuario_id},userid.eq.${usuario_id}`);
      }
      
      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('countProjects', error));
      return 0;
    }
  }

  /**
   * Obtiene todos los proyectos de un usuario específico
   * @param userId ID del usuario
   * @returns Array de proyectos o array vacío si hay error
   */
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .or(`usuario_id.eq.${userId},userid.eq.${userId}`)
        .order('fecha_creacion', { ascending: false });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion || undefined,
        usuario_id: item.usuario_id,
        presentacion_id: item.slides_id || undefined,
        hoja_calculo_id: item.sheets_id || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        metadata: {
          hojastitulo: item.hojastitulo,
          presentaciontitulo: item.presentaciontitulo
        }
      }));
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('getProjectsByUserId', error));
      return [];
    }
  }

  /**
   * Duplica un proyecto existente
   * @param projectId ID del proyecto a duplicar
   * @param newName Nombre para el nuevo proyecto
   * @returns ID del nuevo proyecto o null si hay error
   */
  async duplicateProject(projectId: string, newName?: string): Promise<string | null> {
    try {
      // Obtener proyecto original
      const original = await this.getProjectById(projectId);
      if (!original) throw new Error('Proyecto original no encontrado');
      
      // Crear nuevo proyecto con datos del original
      const newProject: ProjectCreateParams = {
        nombre: newName || `${original.nombre} (copia)`,
        descripcion: original.descripcion,
        usuario_id: original.usuario_id,
        presentacion_id: original.presentacion_id,
        hoja_calculo_id: original.hoja_calculo_id,
        metadata: original.metadata
      };
      
      return await this.createProject(newProject);
    } catch (error) {
      handleError(this.CONTEXT, this.formatError('duplicateProject', error));
      return null;
    }
  }
}

// Exportar una instancia por defecto
export const projectsService = new ProjectsService(); 