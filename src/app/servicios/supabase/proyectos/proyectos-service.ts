import { createClient } from '@supabase/supabase-js';

// Interfaces
interface ProyectoBase {
  id: string;
  usuario_id: string;
  userid?: string; // Para compatibilidad con el resto del código
  nombre: string;
  descripcion?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  sheets_id?: string;
  slides_id?: string;
  hojastitulo?: string;
  presentaciontitulo?: string;
}

export interface Proyecto extends ProyectoBase {
  // No necesitamos extender nada más
}

// Interfaz para los datos que vienen de Supabase
interface ProyectoSupabase {
  id: string;
  usuario_id: string;
  userid: string | null;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  sheets_id: string | null;
  slides_id: string | null;
  hojastitulo: string | null;
  presentaciontitulo: string | null;
}

// Variables para el cliente Supabase singleton
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Implementar patrón singleton para el cliente de Supabase
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseInstance() {
  if (!supabaseInstance && supabaseUrl && supabaseKey) {
    console.log('🔄 [Supabase] Creando instancia única del cliente Supabase en proyectos-service.ts');
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance || (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any);
}

/**
 * Operaciones relacionadas con la tabla de proyectos
 */
export class ProyectosAPI {
  /**
   * Obtiene todos los proyectos de un usuario
   * @param userId ID del usuario
   * @returns Array de proyectos o array vacío si hay error
   */
  static async obtenerProyectos(userId: string): Promise<Proyecto[]> {
    try {
      console.log('[ProyectosAPI] Consultando proyectos con userid:', userId);
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Faltan variables de entorno para Supabase');
        return [];
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      // Realizar la consulta usando explícitamente la columna userid
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('userid', userId)
        .order('fecha_creacion', { ascending: false });
      
      if (error) {
        console.error('[ProyectosAPI] Error al consultar proyectos:', error);
        throw error;
      }
      
      // Mapear los resultados para que coincidan con la interfaz Proyecto
      const proyectos = data?.map((item: ProyectoSupabase) => ({
        id: item.id || '',
        usuario_id: item.usuario_id || '',
        userid: item.userid,
        nombre: item.nombre || item.nombre || 'Proyecto sin nombre',
        descripcion: item.descripcion,
        fecha_creacion: item.fecha_creacion,
        fecha_actualizacion: item.fecha_actualizacion,
        sheets_id: item.sheets_id,
        slides_id: item.slides_id,
        hojastitulo: item.hojastitulo,
        presentaciontitulo: item.presentaciontitulo
      })) || [];
      
      return proyectos
    } catch (error) {
      console.error('Error al obtener proyectos:', error)
      return []
    }
  }

  /**
   * Obtiene un proyecto por su ID
   * @param proyectoId ID del proyecto
   * @returns Proyecto o null si no se encuentra
   */
  static async obtenerProyecto(proyectoId: string): Promise<Proyecto | null> {
    try {
      if (!proyectoId) {
        console.error('[ProyectosAPI] ID de proyecto no proporcionado');
        return null;
      }
      
      console.log('[ProyectosAPI] Consultando proyecto con id:', proyectoId);
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[ProyectosAPI] Faltan variables de entorno para Supabase');
        return null;
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', proyectoId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[ProyectosAPI] No se encontró proyecto con id:', proyectoId);
          return null;
        }
        console.error('[ProyectosAPI] Error al consultar proyecto:', error);
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear los resultados para que coincidan con la interfaz Proyecto
      return {
        id: data.id,
        usuario_id: data.usuario_id,
        userid: data.userid,
        nombre: data.nombre,
        descripcion: data.descripcion,
        fecha_creacion: data.fecha_creacion,
        fecha_actualizacion: data.fecha_actualizacion,
        sheets_id: data.sheets_id,
        slides_id: data.slides_id,
        hojastitulo: data.hojastitulo,
        presentaciontitulo: data.presentaciontitulo
      };
    } catch (error) {
      console.error('[ProyectosAPI] Error inesperado al obtener proyecto:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo proyecto
   * @param proyecto Datos del proyecto a crear
   * @returns ID del proyecto creado o null si hay error
   */
  static async crearProyecto(proyecto: Proyecto): Promise<string | null> {
    try {
      console.log('[ProyectosAPI] Creando proyecto:', proyecto);
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[ProyectosAPI] Faltan variables de entorno para Supabase');
        return null;
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      // Preparar los datos del proyecto
      const datosProyecto = {
        nombre: proyecto.nombre || proyecto.nombre || 'Proyecto sin nombre',
        descripcion: proyecto.descripcion || '',
        usuario_id: proyecto.usuario_id,
        userid: proyecto.userid // Guardar para compatibilidad
      };
      
      // Insertar el proyecto
      const { data, error } = await supabase
        .from('proyectos')
        .insert(datosProyecto)
        .select('id')
        .single();
      
      if (error) {
        console.error('[ProyectosAPI] Error al crear proyecto:', error);
        throw error;
      }
      
      console.log('[ProyectosAPI] Proyecto creado con ID:', data?.id);
      return data?.id || null;
    } catch (error) {
      console.error('[ProyectosAPI] Error inesperado al crear proyecto:', error);
      return null;
    }
  }

  /**
   * Actualiza un proyecto existente
   * @param proyectoId ID del proyecto a actualizar
   * @param datos Datos a actualizar
   * @returns true si se actualizó correctamente, false si hubo error
   */
  static async actualizarProyecto(
    proyectoId: string, 
    datos: Partial<Omit<Proyecto, 'id' | 'usuario_id' | 'userid'>>
  ): Promise<boolean> {
    try {
      console.log('[ProyectosAPI] Actualizando proyecto:', proyectoId, datos);
      
      if (!proyectoId) {
        console.error('[ProyectosAPI] ID de proyecto no proporcionado');
        return false;
      }
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[ProyectosAPI] Faltan variables de entorno para Supabase');
        return false;
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      // Actualizar el proyecto
      const { error } = await supabase
        .from('proyectos')
        .update({
          ...datos,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', proyectoId);
      
      if (error) {
        console.error('[ProyectosAPI] Error al actualizar proyecto:', error);
        throw error;
      }
      
      console.log('[ProyectosAPI] Proyecto actualizado correctamente');
      return true;
    } catch (error) {
      console.error('[ProyectosAPI] Error inesperado al actualizar proyecto:', error);
      return false;
    }
  }

  /**
   * Elimina un proyecto
   * @param proyectoId ID del proyecto a eliminar
   * @returns true si se eliminó correctamente, false si hubo error
   */
  static async eliminarProyecto(proyectoId: string): Promise<boolean> {
    try {
      console.log('[ProyectosAPI] Eliminando proyecto:', proyectoId);
      
      if (!proyectoId) {
        console.error('[ProyectosAPI] ID de proyecto no proporcionado');
        return false;
      }
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[ProyectosAPI] Faltan variables de entorno para Supabase');
        return false;
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      // Eliminar el proyecto
      const { error } = await supabase
        .from('proyectos')
        .delete()
        .eq('id', proyectoId);
      
      if (error) {
        console.error('[ProyectosAPI] Error al eliminar proyecto:', error);
        throw error;
      }
      
      console.log('[ProyectosAPI] Proyecto eliminado correctamente');
      return true;
    } catch (error) {
      console.error('[ProyectosAPI] Error inesperado al eliminar proyecto:', error);
      return false;
    }
  }
}

/**
 * Clase de compatibilidad para mantener el código existente funcionando
 * mientras se migra a la nueva API
 */
export class ProyectosService {
  /**
   * Obtiene todos los proyectos de un usuario
   * @param userId ID del usuario
   * @returns Array de proyectos o array vacío si hay error
   */
  static async listarProyectos(userId: string): Promise<Proyecto[]> {
    console.log('[ProyectosService] Listando proyectos para usuario:', userId);
    
    try {
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[ProyectosService] Faltan variables de entorno para Supabase');
        return [];
      }
      
      // Usar la instancia singleton
      const supabase = getSupabaseInstance();
      
      // Realizar la consulta usando explícitamente la columna userid (TEXT)
      console.log('[ProyectosService] Consultando proyectos con userid:', userId);
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('userid', userId);
      
      if (error) {
        console.error('[ProyectosService] Error al listar proyectos:', error);
        throw error;
      }
      
      console.log('[ProyectosService] Datos recibidos de Supabase (raw):', data);
      
      // Mapear los resultados para que coincidan con la interfaz Proyecto
      const proyectos = data?.map((item: ProyectoSupabase) => {
        const proyectoMapeado = {
          id: item.id,
          usuario_id: item.usuario_id,
          userid: item.userid || userId,
          nombre: item.nombre,
          descripcion: item.descripcion || '',
          fecha_creacion: item.fecha_creacion,
          fecha_actualizacion: item.fecha_actualizacion,
          sheets_id: item.sheets_id,
          slides_id: item.slides_id,
          hojastitulo: item.hojastitulo,
          presentaciontitulo: item.presentaciontitulo
        };
        console.log('[ProyectosService] Proyecto mapeado:', proyectoMapeado);
        return proyectoMapeado;
      }) || [];
      
      console.log('[ProyectosService] Total de proyectos procesados:', proyectos.length);
      return proyectos;
    } catch (error) {
      console.error('[ProyectosService] Error en listarProyectos:', error);
      return [];
    }
  }

  /**
   * Obtiene un proyecto por su ID
   * @param proyectoId ID del proyecto
   * @returns Proyecto o null si no existe o hay error
   */
  static async obtenerProyecto(proyectoId: string): Promise<Proyecto | null> {
    try {
      return await ProyectosAPI.obtenerProyecto(proyectoId);
    } catch (error) {
      console.error('[ProyectosService] Error en obtenerProyecto:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo proyecto
   * @param proyecto Datos del proyecto a crear
   * @returns ID del proyecto creado o null si hay error
   */
  static async crearProyecto(proyecto: Proyecto): Promise<string | null> {
    try {
      return await ProyectosAPI.crearProyecto(proyecto);
    } catch (error) {
      console.error('[ProyectosService] Error en crearProyecto:', error);
      return null;
    }
  }

  /**
   * Actualiza un proyecto existente
   * @param proyectoId ID del proyecto a actualizar
   * @param datos Datos a actualizar
   * @returns true si se actualizó correctamente, false en caso contrario
   */
  static async actualizarProyecto(
    proyectoId: string, 
    datos: Partial<Omit<Proyecto, 'id' | 'usuario_id' | 'userid'>>
  ): Promise<boolean> {
    try {
      return await ProyectosAPI.actualizarProyecto(proyectoId, datos);
    } catch (error) {
      console.error('[ProyectosService] Error en actualizarProyecto:', error);
      return false;
    }
  }

  /**
   * Elimina un proyecto
   * @param proyectoId ID del proyecto a eliminar
   * @returns true si se eliminó correctamente, false en caso contrario
   */
  static async eliminarProyecto(proyectoId: string): Promise<boolean> {
    try {
      return await ProyectosAPI.eliminarProyecto(proyectoId);
    } catch (error) {
      console.error('[ProyectosService] Error en eliminarProyecto:', error);
      return false;
    }
  }
}
