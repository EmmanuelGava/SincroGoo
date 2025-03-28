import { SupabaseService } from '../globales/supabase-service';
import { Diapositiva } from '../globales/tipos';

/**
 * Operaciones relacionadas con la tabla de diapositivas utilizando el servicio centralizado
 */
export class DiapositivasAPI {
  /**
   * Obtiene todas las diapositivas de una presentación
   * @param slidesId ID de la presentación
   * @returns Array de diapositivas o array vacío si hay error
   */
  static async obtenerDiapositivasPorPresentacion(slidesId: string): Promise<Diapositiva[]> {
    try {
      console.log(`🔍 [Diapositivas Debug] Obteniendo diapositivas para presentación: ${slidesId}`);
      
      const { data, error } = await SupabaseService.select(
        'diapositivas',
        { slides_id: slidesId },
        { order: { column: 'orden', ascending: true } }
      );
      
      if (error) {
        console.error('❌ [Diapositivas Debug] Error al obtener diapositivas:', error);
        throw error;
      }
      
      console.log(`✅ [Diapositivas Debug] Se encontraron ${data?.length || 0} diapositivas`);
      return data || [];
    } catch (error) {
      console.error('❌ [Diapositivas Debug] Error general en obtenerDiapositivasPorPresentacion:', error);
      return [];
    }
  }

  /**
   * Obtiene una diapositiva por su ID de Google
   * @param diapositivaId ID de Google de la diapositiva
   * @returns Diapositiva o null si no se encuentra
   */
  static async obtenerDiapositivaPorGoogleId(diapositivaId: string): Promise<Diapositiva | null> {
    try {
      console.log(`🔍 [Diapositivas Debug] Buscando diapositiva con diapositiva_id: ${diapositivaId}`);
      
      const { data, error } = await SupabaseService.select(
        'diapositivas',
        { diapositiva_id: diapositivaId }
      );
      
      if (error) {
        console.error('❌ [Diapositivas Debug] Error al buscar diapositiva por Google ID:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log(`⚠️ [Diapositivas Debug] No se encontró diapositiva con diapositiva_id: ${diapositivaId}`);
        return null;
      }
      
      console.log(`✅ [Diapositivas Debug] Diapositiva encontrada: ${data[0].id}`);
      return data[0];
    } catch (error) {
      console.error('❌ [Diapositivas Debug] Error general en obtenerDiapositivaPorGoogleId:', error);
      return null;
    }
  }

  /**
   * Guarda una diapositiva en la base de datos
   * @param diapositiva Datos de la diapositiva a guardar
   * @returns ID de la diapositiva guardada o null si hay error
   */
  static async guardarDiapositiva(diapositiva: Omit<Diapositiva, 'id'>): Promise<string | null> {
    try {
      console.log('🔄 [Diapositivas Debug] Guardando diapositiva:', diapositiva);
      
      const { data, error } = await SupabaseService.insert<Diapositiva>(
        'diapositivas',
        diapositiva
      );
      
      if (error) {
        console.error('❌ [Diapositivas Debug] Error al crear diapositiva:', error);
        throw new Error(error.message || 'Error al crear diapositiva');
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ [Diapositivas Debug] No se pudo crear la diapositiva, respuesta vacía');
        return null;
      }
      
      const id = data[0].id;
      if (!id) {
        console.error('❌ [Diapositivas Debug] No se pudo crear la diapositiva, ID no definido');
        return null;
      }
      
      console.log(`✅ [Diapositivas Debug] Diapositiva creada correctamente: ${id}`);
      return id;
    } catch (error) {
      console.error('❌ [Diapositivas Debug] Error al guardar diapositiva:', error);
      return null;
    }
  }

  /**
   * Actualiza el orden de múltiples diapositivas
   * @param diapositivasOrdenadas Array de objetos con id y orden de las diapositivas
   * @returns true si se actualizaron correctamente, false si hubo error
   */
  static async actualizarOrdenDiapositivas(diapositivasOrdenadas: { id: string, orden: number }[]): Promise<boolean> {
    try {
      console.log(`🔄 [Diapositivas Debug] Actualizando orden de ${diapositivasOrdenadas.length} diapositivas`);
      
      // Actualizar cada diapositiva individualmente
      for (const { id, orden } of diapositivasOrdenadas) {
        const { error } = await SupabaseService.update(
          'diapositivas',
          { id },
          { 
            orden,
            fecha_actualizacion: new Date().toISOString()
          }
        );
        
        if (error) {
          console.error(`❌ [Diapositivas Debug] Error al actualizar orden de diapositiva ${id}:`, error);
          throw error;
        }
      }
      
      console.log('✅ [Diapositivas Debug] Orden de diapositivas actualizado correctamente');
      return true;
    } catch (error) {
      console.error('❌ [Diapositivas Debug] Error general en actualizarOrdenDiapositivas:', error);
      return false;
    }
  }

  /**
   * Elimina una diapositiva de la base de datos
   * @param diapositivaId ID de la diapositiva a eliminar
   * @returns true si se eliminó correctamente, false si hubo error
   */
  static async eliminarDiapositiva(diapositivaId: string): Promise<boolean> {
    try {
      console.log(`🔄 [Diapositivas Debug] Eliminando diapositiva: ${diapositivaId}`);
      
      const { error } = await SupabaseService.delete(
        'diapositivas',
        { id: diapositivaId }
      );
      
      if (error) {
        console.error('❌ [Diapositivas Debug] Error al eliminar diapositiva:', error);
        throw error;
      }
      
      console.log('✅ [Diapositivas Debug] Diapositiva eliminada correctamente');
      return true;
    } catch (error) {
      console.error('❌ [Diapositivas Debug] Error general en eliminarDiapositiva:', error);
      return false;
    }
  }
} 