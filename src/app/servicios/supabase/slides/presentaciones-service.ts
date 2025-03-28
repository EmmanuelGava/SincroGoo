import { SupabaseService } from '../globales/supabase-service';
import { SlidesAPI } from './slides-service';
import { DiapositivasAPI } from '../slides/diapositivas-service';
import { ElementosAPI } from '../slides/elementos-service';
import { Slide, Diapositiva } from '../globales/tipos';

/**
 * Operaciones relacionadas con la gestión de presentaciones utilizando el servicio centralizado
 */
export class PresentacionesAPI {
  /**
   * Obtiene todas las presentaciones de un proyecto
   * @param proyectoId ID del proyecto
   * @returns Array de presentaciones o array vacío si hay error
   */
  static async obtenerPresentacionesPorProyecto(proyectoId: string): Promise<Slide[]> {
    try {
      console.log('🔍 [Presentaciones Debug] Obteniendo presentaciones para proyecto:', proyectoId);
      
      const { data, error } = await SupabaseService.select(
        'slides',
        { proyecto_id: proyectoId }
      );
      
      if (error) {
        console.error('❌ [Presentaciones Debug] Error al obtener presentaciones:', error);
        throw error;
      }
      
      console.log(`✅ [Presentaciones Debug] Se encontraron ${data?.length || 0} presentaciones`);
      return data || [];
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en obtenerPresentacionesPorProyecto:', error);
      return [];
    }
  }

  /**
   * Obtiene una presentación por su ID
   * @param presentacionId ID de la presentación
   * @returns Presentación o null si no existe
   */
  static async obtenerPresentacion(presentacionId: string): Promise<Slide | null> {
    try {
      console.log('🔍 [Presentaciones Debug] Obteniendo presentación:', presentacionId);
      
      return await SlidesAPI.obtenerSlide(presentacionId);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en obtenerPresentacion:', error);
      return null;
    }
  }

  /**
   * Obtiene una presentación por su ID de Google
   * @param googleId ID de Google de la presentación
   * @returns Presentación o null si no existe
   */
  static async obtenerPresentacionPorGoogleId(googleId: string): Promise<Slide | null> {
    try {
      console.log('🔍 [Presentaciones Debug] Obteniendo presentación por Google ID:', googleId);
      
      const resultado = await SlidesAPI.obtenerSlidePorGoogleId(googleId);
      
      if (!resultado) {
        return null;
      }
      
      return await SlidesAPI.obtenerSlide(resultado.id);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en obtenerPresentacionPorGoogleId:', error);
      return null;
    }
  }

  /**
   * Guarda una presentación en la base de datos
   * @param presentacion Datos de la presentación
   * @returns ID de la presentación guardada o null si hay error
   */
  static async guardarPresentacion(presentacion: Slide): Promise<string | null> {
    try {
      console.log('🔄 [Presentaciones Debug] Guardando presentación:', presentacion.titulo);
      
      return await SlidesAPI.guardarSlideCompleto(presentacion);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en guardarPresentacion:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las diapositivas de una presentación
   * @param presentacionId ID de la presentación
   * @returns Array de diapositivas
   */
  static async obtenerDiapositivas(presentacionId: string): Promise<Diapositiva[]> {
    try {
      console.log('🔍 [Presentaciones Debug] Obteniendo diapositivas para presentación:', presentacionId);
      
      return await DiapositivasAPI.obtenerDiapositivasPorPresentacion(presentacionId);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en obtenerDiapositivas:', error);
      return [];
    }
  }

  /**
   * Guarda una diapositiva en la base de datos
   * @param diapositiva Datos de la diapositiva
   * @returns ID de la diapositiva guardada o null si hay error
   */
  static async guardarDiapositiva(diapositiva: Diapositiva): Promise<string | null> {
    try {
      console.log('🔄 [Presentaciones Debug] Guardando diapositiva para presentación:', diapositiva.slides_id);
      
      return await DiapositivasAPI.guardarDiapositiva(diapositiva);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en guardarDiapositiva:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los elementos de una diapositiva
   * @param diapositivaId ID de la diapositiva
   * @returns Array de elementos
   */
  static async obtenerElementos(diapositivaId: string): Promise<any[]> {
    try {
      console.log('🔍 [Presentaciones Debug] Obteniendo elementos para diapositiva:', diapositivaId);
      
      return await ElementosAPI.obtenerElementosPorDiapositiva(diapositivaId);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en obtenerElementos:', error);
      return [];
    }
  }

  /**
   * Guarda un elemento en la base de datos
   * @param elemento Datos del elemento
   * @returns ID del elemento guardado o null si hay error
   */
  static async guardarElemento(elemento: any): Promise<string | null> {
    try {
      console.log('🔄 [Presentaciones Debug] Guardando elemento para diapositiva:', elemento.diapositiva_id);
      
      return await ElementosAPI.guardarElemento(elemento);
    } catch (error) {
      console.error('❌ [Presentaciones Debug] Error general en guardarElemento:', error);
      return null;
    }
  }
} 