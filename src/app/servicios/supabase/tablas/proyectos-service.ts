import { createClient } from '@supabase/supabase-js';
import { supabase } from '../globales/auth-service';
import { Database } from '../../../tipos/supabase';

// Definir los tipos para la tabla proyectos
export type ProyectoBase = {
  id?: string;
  usuario_id: string;
  titulo: string;
  descripcion?: string | null;
  google_id?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  sheets_id?: string;
  slides_id?: string;
  hojastitulo?: string;
  presentaciontitulo?: string;
};

// Tipo para la tabla en la base de datos
type ProyectoSupabase = Database['public']['Tables']['proyectos']['Row'];

// Tipo personalizado para insertar en la base de datos
export type ProyectoInsert = {
  usuario_id: string;
  titulo: string;
  descripcion?: string | null;
  google_id?: string | null;
  creado_en?: string;
  actualizado_en?: string;
};

// Tipo para actualizar en la base de datos
type ProyectoUpdate = Partial<ProyectoBase>;

// Tipo para la aplicación (incluye campos adicionales para compatibilidad)
export type Proyecto = {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string | null;
  google_id: string | null;
  creado_en: string;
  actualizado_en: string;
};

// Proyectos de ejemplo para modo desarrollo
const proyectosEjemplo: Proyecto[] = [
  {
    id: 'dev-proyecto-1',
    usuario_id: 'dev-user-id',
    titulo: 'Proyecto de ejemplo 1',
    descripcion: 'Este es un proyecto de ejemplo para desarrollo',
    google_id: null,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString()
  },
  {
    id: 'dev-proyecto-2',
    usuario_id: 'dev-user-id',
    titulo: 'Proyecto de ejemplo 2',
    descripcion: 'Otro proyecto de ejemplo para desarrollo',
    google_id: null,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString()
  }
];

export class ProyectosService {
  static async crearProyecto(proyecto: ProyectoInsert): Promise<Proyecto | null> {
    try {
      console.log('📝 [ProyectosService] Creando proyecto:', {
        ...proyecto,
        tieneUserId: !!proyecto.usuario_id,
        tieneTitulo: !!proyecto.titulo
      });

      // Adaptar el objeto proyecto para que coincida con la estructura de la base de datos
      const proyectoParaDB = {
        usuario_id: proyecto.usuario_id,
        titulo: proyecto.titulo,
        descripcion: proyecto.descripcion,
        google_id: proyecto.google_id,
        creado_en: proyecto.creado_en || new Date().toISOString(),
        actualizado_en: proyecto.actualizado_en || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('proyectos')
        .insert([proyectoParaDB])
        .select()
        .single();

      if (error) {
        console.error('❌ [ProyectosService] Error al crear proyecto:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ [ProyectosService] No se recibieron datos al crear el proyecto');
        return null;
      }

      // Convertir el resultado de la base de datos al formato esperado por la aplicación
      const proyectoCreado: Proyecto = {
        id: data.id,
        usuario_id: data.usuario_id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        google_id: data.google_id,
        creado_en: data.creado_en,
        actualizado_en: data.actualizado_en
      };

      console.log('✅ [ProyectosService] Proyecto creado exitosamente:', proyectoCreado);
      return proyectoCreado;
    } catch (error) {
      console.error('❌ [ProyectosService] Error en crearProyecto:', error);
      throw error;
    }
  }

  static async obtenerProyecto(id: string): Promise<Proyecto | null> {
    try {
      // Verificar si el cliente Supabase está disponible
      if (!supabase) {
        console.warn('⚠️ [ProyectosService] Cliente Supabase no disponible. Usando modo desarrollo.');
        // Buscar en proyectos de ejemplo
        const proyectoEncontrado = proyectosEjemplo.find(p => p.id === id);
        if (proyectoEncontrado) {
          return {
            id: proyectoEncontrado.id,
            usuario_id: proyectoEncontrado.usuario_id,
            titulo: proyectoEncontrado.titulo,
            descripcion: proyectoEncontrado.descripcion || null,
            google_id: proyectoEncontrado.google_id || null,
            creado_en: proyectoEncontrado.creado_en,
            actualizado_en: proyectoEncontrado.actualizado_en
          };
        }
        return null;
      }

      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ [ProyectosService] Error al obtener proyecto:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ [ProyectosService] Error en obtenerProyecto:', error);
      throw error;
    }
  }

  static async listarProyectos(userId: string): Promise<Proyecto[]> {
    try {
      // Verificar si el cliente Supabase está disponible
      if (!supabase) {
        console.warn('⚠️ [ProyectosService] Cliente Supabase no disponible. Usando proyectos de ejemplo.');
        // Devolver proyectos de ejemplo para desarrollo
        return proyectosEjemplo;
      }

      console.log('📝 [ProyectosService] Consultando proyectos con usuario_id:', userId);
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('usuario_id', userId)
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('❌ [ProyectosService] Error al listar proyectos:', error);
        throw error;
      }

      // Convertir los datos al formato esperado por la aplicación
      const proyectosConvertidos: Proyecto[] = data?.map((proyecto: ProyectoSupabase) => ({
        id: proyecto.id,
        usuario_id: proyecto.usuario_id,
        titulo: proyecto.titulo,
        descripcion: proyecto.descripcion,
        google_id: proyecto.google_id,
        creado_en: proyecto.creado_en,
        actualizado_en: proyecto.actualizado_en
      })) || [];

      return proyectosConvertidos;
    } catch (error) {
      console.error('❌ [ProyectosService] Error en listarProyectos:', error);
      throw error;
    }
  }

  static async actualizarProyecto(id: string, proyecto: Partial<Proyecto>): Promise<Proyecto | null> {
    try {
      // Verificar si el cliente Supabase está disponible
      if (!supabase) {
        console.warn('⚠️ [ProyectosService] Cliente Supabase no disponible. Usando modo desarrollo.');
        // Simular actualización en modo desarrollo
        const proyectoActualizado: Proyecto = {
          id,
          usuario_id: proyecto.usuario_id || 'dev-user-id',
          titulo: proyecto.titulo || 'Proyecto actualizado',
          descripcion: proyecto.descripcion || null,
          google_id: proyecto.google_id || null,
          actualizado_en: new Date().toISOString(),
          creado_en: proyecto.creado_en || new Date().toISOString()
        };
        return proyectoActualizado;
      }

      const { data, error } = await supabase
        .from('proyectos')
        .update(proyecto)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [ProyectosService] Error al actualizar proyecto:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ [ProyectosService] Error en actualizarProyecto:', error);
      throw error;
    }
  }

  static async eliminarProyecto(id: string): Promise<void> {
    try {
      // Verificar si el cliente Supabase está disponible
      if (!supabase) {
        console.warn('⚠️ [ProyectosService] Cliente Supabase no disponible. Simulando eliminación en modo desarrollo.');
        return;
      }

      const { error } = await supabase
        .from('proyectos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ [ProyectosService] Error al eliminar proyecto:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ [ProyectosService] Error en eliminarProyecto:', error);
      throw error;
    }
  }
}