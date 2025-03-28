import { SupabaseService } from '../globales/supabase-service';
import { Slide, Diapositiva } from '../globales/tipos';
import { DiapositivasAPI } from '../slides/diapositivas-service';

/**
 * Operaciones relacionadas con la tabla de slides utilizando el servicio centralizado
 */
export class SlidesAPI {
  /**
   * Guarda un slide en la base de datos (versión completa)
   * @param slide Objeto con los datos del slide
   * @returns ID del slide guardado o null si hay error
   */
  static async guardarSlideCompleto(slide: Slide): Promise<string | null> {
    try {
      // Verificar si el slide ya existe
      const { data: existente, error: errorBuscar } = await SupabaseService.select(
        'slides',
        { 
          proyecto_id: slide.proyecto_id,
          google_presentation_id: slide.google_presentation_id
        }
      );

      if (errorBuscar) {
        console.error('❌ [Slide Debug] Error al buscar slide existente:', errorBuscar);
        return null;
      }

      // Si existe, actualizar
      if (existente && existente.length > 0) {
        const { data: actualizado, error: errorActualizar } = await SupabaseService.update(
          'slides',
          {
            titulo: slide.titulo,
            nombre: slide.nombre || slide.titulo,
            url: slide.url,
            google_id: slide.google_id,
            fecha_actualizacion: new Date().toISOString()
          },
          { id: existente[0].id }
        );

        if (errorActualizar) {
          console.error('❌ [Slide Debug] Error al actualizar slide:', errorActualizar);
          return null;
        }

        console.log('✅ [Slide Debug] Slide actualizado correctamente:', existente[0].id);
        return existente[0].id;
      }

      // Si no existe, crear nuevo slide
      const { data: nuevo, error: errorCrear } = await SupabaseService.insert(
        'slides',
        {
          proyecto_id: slide.proyecto_id,
          google_presentation_id: slide.google_presentation_id,
          titulo: slide.titulo,
          nombre: slide.nombre || slide.titulo,
          url: slide.url,
          google_id: slide.google_id,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        }
      );
      
      if (errorCrear) {
        console.error('❌ [Slide Debug] Error al crear slide:', errorCrear);
        return null;
      }
      
      if (!nuevo || nuevo.length === 0) {
        console.error('❌ [Slide Debug] No se pudo crear el slide');
        return null;
      }
      
      const id = nuevo[0].id;
      if (!id) {
        console.error('❌ [Slide Debug] No se pudo crear el slide, ID no definido');
        return null;
      }
      
      console.log('✅ [Slide Debug] Slide creado correctamente:', id);
      return id;
    } catch (error) {
      console.error('❌ [Slide Debug] Error general en guardarSlideCompleto:', error);
      return null;
    }
  }

  /**
   * Guarda un slide en la base de datos (versión simplificada)
   * @param slide Objeto Slide sin el ID
   * @returns ID del slide guardado o null si hay error
   */
  static async guardarSlide(slide: Omit<Slide, 'id'>): Promise<string | null> {
    try {
      console.log('🔄 [Slide Debug] Guardando slide:', slide);
      
      const { data, error } = await SupabaseService.insert<Slide>(
        'slides',
        slide
      );
      
      if (error) {
        console.error('❌ [Slide Debug] Error al crear slide:', error);
        throw new Error(error.message || 'Error al crear slide');
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ [Slide Debug] No se pudo crear el slide, respuesta vacía');
        return null;
      }
      
      const id = data[0].id;
      if (!id) {
        console.error('❌ [Slide Debug] No se pudo crear el slide, ID no definido');
        return null;
      }
      
      console.log('✅ [Slide Debug] Slide creado correctamente:', id);
      return id;
    } catch (error) {
      console.error('❌ [Slide Debug] Error al guardar slide:', error);
      return null;
    }
  }

  /**
   * Obtiene un slide por su ID de Google
   * @param googleId ID de Google del slide
   * @returns Objeto con id y título del slide, o null si no existe
   */
  static async obtenerSlidePorGoogleId(googleId: string): Promise<{ id: string, titulo: string } | null> {
    try {
      console.log('🔍 [Slide Debug] Buscando slide con Google ID:', googleId);
      
      const { data, error } = await SupabaseService.select(
        'slides',
        { google_id: googleId },
        { select: 'id, titulo' }
      );
      
      if (error) {
        console.error('❌ [Slide Debug] Error al buscar slide por Google ID:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ [Slide Debug] No se encontró slide con Google ID:', googleId);
        return null;
      }
      
      console.log('✅ [Slide Debug] Slide encontrado:', data[0].id);
      return {
        id: data[0].id,
        titulo: data[0].titulo
      };
    } catch (error) {
      console.error('❌ [Slide Debug] Error en obtenerSlidePorGoogleId:', error);
      return null;
    }
  }

  /**
   * Obtiene un slide por su ID
   * @param slideId ID del slide
   * @returns Objeto Slide o null si no existe
   */
  static async obtenerSlide(slideId: string): Promise<Slide | null> {
    try {
      console.log('🔍 [Slide Debug] Obteniendo slide:', slideId);
      
      const { data, error } = await SupabaseService.select(
        'slides',
        { id: slideId }
      );
      
      if (error) {
        console.error('❌ [Slide Debug] Error al obtener slide:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ [Slide Debug] No se encontró slide con ID:', slideId);
        return null;
      }
      
      console.log('✅ [Slide Debug] Slide obtenido:', data[0].id);
      return data[0] as Slide;
    } catch (error) {
      console.error('❌ [Slide Debug] Error en obtenerSlide:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las diapositivas de un slide
   * @param slideId ID del slide
   * @returns Array de diapositivas
   */
  static async obtenerDiapositivas(slideId: string): Promise<Diapositiva[]> {
    try {
      console.log('🔍 [Slide Debug] Obteniendo diapositivas para slide:', slideId);
      
      return await DiapositivasAPI.obtenerDiapositivasPorPresentacion(slideId);
    } catch (error) {
      console.error('❌ [Slide Debug] Error en obtenerDiapositivas:', error);
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
      console.log('🔄 [Slide Debug] Guardando diapositiva para slide:', diapositiva.slides_id);
      
      return await DiapositivasAPI.guardarDiapositiva(diapositiva);
    } catch (error) {
      console.error('❌ [Slide Debug] Error en guardarDiapositiva:', error);
      return null;
    }
  }
} 