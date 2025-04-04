import { supabase, getSupabaseClient } from '../client';
import { handleError } from '../utils/error-handler';
import type { 
  Slide,
  SlideItem,
  SlideElement,
  SlideElementAssociation,
  SlideCreateParams,
  SlideUpdateParams,
  SlideItemCreateParams,
  SlideItemUpdateParams,
  SlideElementCreateParams,
  SlideElementUpdateParams,
  SlideElementAssociationCreateParams,
  SlideListOptions,
  SlideItemListOptions
} from '../types/slides';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Servicio para gestionar presentaciones, diapositivas y elementos
 */
export class SlidesService {
  /**
   * Obtiene una lista de presentaciones con opciones de filtrado
   * @param options Opciones para filtrar y paginar resultados
   * @returns Array de presentaciones o array vacío si hay error
   */
  async listSlides(options: SlideListOptions = {}): Promise<Slide[]> {
    try {
      const { 
        proyecto_id, 
        busqueda, 
        ordenPor = 'created_at', 
        orden = 'desc',
        pagina = 1,
        porPagina = 20
      } = options;
      
      const client = getSupabaseClient();
      let query = client.from('slides').select('*');
      
      // Aplicar filtros
      if (proyecto_id) {
        query = query.eq('proyecto_id', proyecto_id);
      }
      
      if (busqueda) {
        // Buscar en título y nombre
        query = query.or(`titulo.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%`);
      }
      
      // Aplicar ordenamiento
      const columnaOrden = ordenPor === 'created_at' ? 'fecha_creacion' : 
                           ordenPor === 'updated_at' ? 'fecha_actualizacion' : 'titulo';
                           
      query = query.order(columnaOrden, { ascending: orden === 'asc' });
      
      // Aplicar paginación
      const desde = (pagina - 1) * porPagina;
      query = query.range(desde, desde + porPagina - 1);
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato Slide
      return data.map(item => ({
        id: item.id,
        proyecto_id: item.proyecto_id,
        google_presentation_id: item.google_presentation_id,
        google_id: item.google_id || undefined,
        titulo: item.titulo,
        nombre: item.nombre || undefined,
        url: item.url || undefined,
        ultima_sincronizacion: item.ultima_sincronizacion || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        metadata: item.metadata || {}
      }));
    } catch (error) {
      handleError('SlidesService.listSlides', error as PostgrestError);
      return [];
    }
  }

  /**
   * Obtiene una presentación por su ID
   * @param slideId ID de la presentación
   * @returns Presentación o null si no existe o hay error
   */
  async getSlideById(slideId: string): Promise<Slide | null> {
    try {
      if (!slideId) {
        throw new Error('ID de presentación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Consulta básica
      const { data, error } = await client
        .from('slides')
        .select('*')
        .eq('id', slideId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la presentación
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato Slide
      return {
        id: data.id,
        proyecto_id: data.proyecto_id,
        google_presentation_id: data.google_presentation_id,
        google_id: data.google_id || undefined,
        titulo: data.titulo,
        nombre: data.nombre || undefined,
        url: data.url || undefined,
        ultima_sincronizacion: data.ultima_sincronizacion || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: data.metadata || {}
      };
    } catch (error) {
      handleError('SlidesService.getSlideById', error as PostgrestError);
      return null;
    }
  }

  /**
   * Obtiene una presentación por su Google ID
   * @param googleId Google ID de la presentación
   * @returns Presentación o null si no existe o hay error
   */
  async getSlideByGoogleId(googleId: string): Promise<Slide | null> {
    try {
      if (!googleId) {
        throw new Error('Google ID no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Consulta por google_id o google_presentation_id
      const { data, error } = await client
        .from('slides')
        .select('*')
        .or(`google_id.eq.${googleId},google_presentation_id.eq.${googleId}`)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la presentación
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato Slide
      return {
        id: data.id,
        proyecto_id: data.proyecto_id,
        google_presentation_id: data.google_presentation_id,
        google_id: data.google_id || undefined,
        titulo: data.titulo,
        nombre: data.nombre || undefined,
        url: data.url || undefined,
        ultima_sincronizacion: data.ultima_sincronizacion || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: data.metadata || {}
      };
    } catch (error) {
      handleError('SlidesService.getSlideByGoogleId', error as PostgrestError);
      return null;
    }
  }

  /**
   * Crea una nueva presentación
   * @param params Datos de la presentación a crear
   * @returns ID de la presentación creada o null si hay error
   */
  async createSlide(params: SlideCreateParams): Promise<string | null> {
    try {
      // Verificar si ya existe una presentación con el mismo google_id
      if (params.google_id || params.google_presentation_id) {
        const googleId = params.google_id || params.google_presentation_id;
        const existingSlide = await this.getSlideByGoogleId(googleId!);
        
        if (existingSlide) {
          // Actualizar la presentación existente
          const updated = await this.updateSlide(existingSlide.id, {
            titulo: params.titulo,
            nombre: params.nombre,
            url: params.url,
            metadata: params.metadata
          });
          
          return updated ? existingSlide.id : null;
        }
      }
      
      const client = getSupabaseClient();
      
      // Preparar datos para inserción
      const slideData = {
        proyecto_id: params.proyecto_id,
        google_presentation_id: params.google_presentation_id,
        google_id: params.google_id || params.google_presentation_id,
        slides_id: params.slides_id,
        titulo: params.titulo,
        nombre: params.nombre || null,
        url: params.url || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        metadata: params.metadata || null
      };
      
      // Insertar presentación
      const { data, error } = await client
        .from('slides')
        .insert(slideData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SlidesService.createSlide', error as PostgrestError);
      return null;
    }
  }

  /**
   * Actualiza una presentación existente
   * @param slideId ID de la presentación a actualizar
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateSlide(slideId: string, params: SlideUpdateParams): Promise<boolean> {
    try {
      if (!slideId) {
        throw new Error('ID de presentación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Preparar datos para actualización
      const slideData = {
        ...params,
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Actualizar presentación
      const { error } = await client
        .from('slides')
        .update(slideData)
        .eq('id', slideId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.updateSlide', error as PostgrestError);
      return false;
    }
  }

  /**
   * Elimina una presentación
   * @param slideId ID de la presentación
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteSlide(slideId: string): Promise<boolean> {
    try {
      if (!slideId) {
        throw new Error('ID de presentación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Primero, eliminar todas las diapositivas relacionadas y sus elementos
      // Obtener las diapositivas
      const { data: slideItems } = await client
        .from('diapositivas')
        .select('id')
        .eq('slides_id', slideId);
      
      if (slideItems && slideItems.length > 0) {
        const diapositivaIds = slideItems.map(item => item.id);
        
        // Eliminar elementos de las diapositivas
        await client
          .from('elementos')
          .delete()
          .in('diapositiva_id', diapositivaIds);
        
        // Eliminar diapositivas
        await client
          .from('diapositivas')
          .delete()
          .eq('slides_id', slideId);
      }
      
      // Eliminar la presentación
      const { error } = await client
        .from('slides')
        .delete()
        .eq('id', slideId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.deleteSlide', error as PostgrestError);
      return false;
    }
  }

  /**
   * Obtiene las diapositivas de una presentación
   * @param options Opciones para filtrar las diapositivas
   * @returns Array de diapositivas o array vacío si hay error
   */
  async listSlideItems(options: SlideItemListOptions): Promise<SlideItem[]> {
    try {
      if (!options.slides_id) {
        throw new Error('ID de presentación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      let query = client
        .from('diapositivas')
        .select('*')
        .eq('slides_id', options.slides_id);
      
      // Aplicar ordenamiento
      const ordenarPor = options.ordenarPor || 'orden';
      const orden = options.orden || 'asc';
      
      query = query.order(ordenarPor, { ascending: orden === 'asc' });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SlideItem
      return data.map(item => ({
        id: item.id,
        slides_id: item.slides_id,
        orden: item.orden,
        titulo: item.titulo || undefined,
        configuracion: item.configuracion || {},
        diapositiva_id: item.diapositiva_id || undefined,
        google_presentation_id: item.google_presentation_id || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        thumbnail_url: item.thumbnail_url || undefined
      }));
    } catch (error) {
      handleError('SlidesService.listSlideItems', error as PostgrestError);
      return [];
    }
  }

  /**
   * Crea una nueva diapositiva
   * @param params Datos de la diapositiva a crear
   * @returns ID de la diapositiva creada o null si hay error
   */
  async createSlideItem(params: SlideItemCreateParams): Promise<string | null> {
    try {
      if (!params.slides_id) {
        throw new Error('ID de presentación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Verificar si ya existe una diapositiva con el mismo diapositiva_id
      if (params.diapositiva_id) {
        const { data: existingSlideItem } = await client
          .from('diapositivas')
          .select('id')
          .eq('slides_id', params.slides_id)
          .eq('diapositiva_id', params.diapositiva_id)
          .single();
          
        if (existingSlideItem) {
          // Actualizar la diapositiva existente
          const updated = await this.updateSlideItem(existingSlideItem.id, {
            orden: params.orden,
            titulo: params.titulo,
            configuracion: params.configuracion,
            google_presentation_id: params.google_presentation_id,
            thumbnail_url: params.thumbnail_url
          });
          
          return updated ? existingSlideItem.id : null;
        }
      }
      
      // Obtener el orden de la última diapositiva si no se proporciona uno
      if (params.orden === undefined) {
        const { data: lastSlideItem } = await client
          .from('diapositivas')
          .select('orden')
          .eq('slides_id', params.slides_id)
          .order('orden', { ascending: false })
          .limit(1);
          
        const lastOrden = lastSlideItem && lastSlideItem.length > 0 ? lastSlideItem[0].orden || 0 : 0;
        params.orden = lastOrden + 1;
      }
      
      // Preparar datos para inserción
      const slideItemData = {
        slides_id: params.slides_id,
        orden: params.orden,
        titulo: params.titulo || null,
        configuracion: params.configuracion || null,
        diapositiva_id: params.diapositiva_id || null,
        google_presentation_id: params.google_presentation_id || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        thumbnail_url: params.thumbnail_url || null
      };
      
      // Insertar diapositiva
      const { data, error } = await client
        .from('diapositivas')
        .insert(slideItemData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SlidesService.createSlideItem', error as PostgrestError);
      return null;
    }
  }

  /**
   * Actualiza una diapositiva existente
   * @param slideItemId ID de la diapositiva
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateSlideItem(slideItemId: string, params: SlideItemUpdateParams): Promise<boolean> {
    try {
      if (!slideItemId) {
        throw new Error('ID de diapositiva no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Preparar datos para actualización
      const updateData: Record<string, any> = {
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Añadir campos opcionales si están definidos
      if (params.orden !== undefined) updateData.orden = params.orden;
      if (params.titulo !== undefined) updateData.titulo = params.titulo;
      if (params.configuracion !== undefined) updateData.configuracion = params.configuracion;
      if (params.diapositiva_id !== undefined) updateData.diapositiva_id = params.diapositiva_id;
      if (params.google_presentation_id !== undefined) updateData.google_presentation_id = params.google_presentation_id;
      if (params.thumbnail_url !== undefined) updateData.thumbnail_url = params.thumbnail_url;
      
      // Actualizar diapositiva
      const { error } = await client
        .from('diapositivas')
        .update(updateData)
        .eq('id', slideItemId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.updateSlideItem', error as PostgrestError);
      return false;
    }
  }

  /**
   * Elimina una diapositiva
   * @param slideItemId ID de la diapositiva
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteSlideItem(slideItemId: string): Promise<boolean> {
    try {
      if (!slideItemId) {
        throw new Error('ID de diapositiva no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Primero, eliminar todos los elementos relacionados
      await client
        .from('elementos')
        .delete()
        .eq('diapositiva_id', slideItemId);
      
      // Eliminar diapositiva
      const { error } = await client
        .from('diapositivas')
        .delete()
        .eq('id', slideItemId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.deleteSlideItem', error as PostgrestError);
      return false;
    }
  }

  /**
   * Obtiene los elementos de una diapositiva
   * @param slideItemId ID de la diapositiva
   * @returns Array de elementos o array vacío si hay error
   */
  async getSlideElements(slideItemId: string): Promise<SlideElement[]> {
    try {
      if (!slideItemId) {
        throw new Error('ID de diapositiva no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('elementos')
        .select('*')
        .eq('diapositiva_id', slideItemId);
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SlideElement
      return data.map(item => ({
        id: item.id,
        diapositiva_id: item.diapositiva_id,
        elemento_id: item.elemento_id,
        tipo: item.tipo,
        contenido: item.contenido || undefined,
        posicion: item.posicion || undefined,
        estilo: item.estilo || {},
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        celda_asociada: item.celda_asociada || undefined,
        tipo_asociacion: item.tipo_asociacion || undefined
      }));
    } catch (error) {
      handleError('SlidesService.getSlideElements', error as PostgrestError);
      return [];
    }
  }

  /**
   * Crea un nuevo elemento en una diapositiva
   * @param params Datos del elemento a crear
   * @returns ID del elemento creado o null si hay error
   */
  async createSlideElement(params: SlideElementCreateParams): Promise<string | null> {
    try {
      if (!params.diapositiva_id || !params.elemento_id || !params.tipo) {
        throw new Error('Faltan datos requeridos para crear elemento');
      }
      
      const client = getSupabaseClient();
      
      // Verificar si ya existe un elemento con el mismo elemento_id en la misma diapositiva
      const { data: existingElement } = await client
        .from('elementos')
        .select('id')
        .eq('diapositiva_id', params.diapositiva_id)
        .eq('elemento_id', params.elemento_id)
        .single();
        
      if (existingElement) {
        // Actualizar el elemento existente
        const updated = await this.updateSlideElement(existingElement.id, {
          tipo: params.tipo,
          contenido: params.contenido,
          posicion: params.posicion,
          estilo: params.estilo,
          celda_asociada: params.celda_asociada,
          tipo_asociacion: params.tipo_asociacion
        });
        
        return updated ? existingElement.id : null;
      }
      
      // Preparar datos para inserción
      const elementData = {
        diapositiva_id: params.diapositiva_id,
        elemento_id: params.elemento_id,
        tipo: params.tipo,
        contenido: params.contenido || null,
        posicion: params.posicion || null,
        estilo: params.estilo || null,
        celda_asociada: params.celda_asociada || null,
        tipo_asociacion: params.tipo_asociacion || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Insertar elemento
      const { data, error } = await client
        .from('elementos')
        .insert(elementData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SlidesService.createSlideElement', error as PostgrestError);
      return null;
    }
  }

  /**
   * Actualiza un elemento existente
   * @param elementId ID del elemento
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateSlideElement(elementId: string, params: SlideElementUpdateParams): Promise<boolean> {
    try {
      if (!elementId) {
        throw new Error('ID de elemento no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Preparar datos para actualización
      const updateData: Record<string, any> = {
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Añadir campos opcionales si están definidos
      if (params.tipo !== undefined) updateData.tipo = params.tipo;
      if (params.contenido !== undefined) updateData.contenido = params.contenido;
      if (params.posicion !== undefined) updateData.posicion = params.posicion;
      if (params.estilo !== undefined) updateData.estilo = params.estilo;
      if (params.celda_asociada !== undefined) updateData.celda_asociada = params.celda_asociada;
      if (params.tipo_asociacion !== undefined) updateData.tipo_asociacion = params.tipo_asociacion;
      
      // Actualizar elemento
      const { error } = await client
        .from('elementos')
        .update(updateData)
        .eq('id', elementId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.updateSlideElement', error as PostgrestError);
      return false;
    }
  }

  /**
   * Elimina un elemento
   * @param elementId ID del elemento
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteSlideElement(elementId: string): Promise<boolean> {
    try {
      if (!elementId) {
        throw new Error('ID de elemento no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Primero, eliminar todas las asociaciones relacionadas
      await client
        .from('asociaciones')
        .delete()
        .eq('elemento_id', elementId);
      
      // Eliminar elemento
      const { error } = await client
        .from('elementos')
        .delete()
        .eq('id', elementId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.deleteSlideElement', error as PostgrestError);
      return false;
    }
  }

  /**
   * Crea una asociación entre un elemento y una celda de hoja de cálculo
   * @param params Datos de la asociación a crear
   * @returns ID de la asociación creada o null si hay error
   */
  async createElementAssociation(params: SlideElementAssociationCreateParams): Promise<string | null> {
    try {
      if (!params.elemento_id || !params.sheets_id || !params.columna) {
        throw new Error('Faltan datos requeridos para crear asociación');
      }
      
      const client = getSupabaseClient();
      
      // Verificar si ya existe una asociación con los mismos datos
      const { data: existingAssociation } = await client
        .from('asociaciones')
        .select('id')
        .eq('elemento_id', params.elemento_id)
        .eq('sheets_id', params.sheets_id)
        .eq('columna', params.columna)
        .single();
        
      if (existingAssociation) {
        // Ya existe, devolver su ID
        return existingAssociation.id;
      }
      
      // Preparar datos para inserción
      const associationData = {
        elemento_id: params.elemento_id,
        sheets_id: params.sheets_id,
        columna: params.columna,
        tipo: params.tipo || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Insertar asociación
      const { data, error } = await client
        .from('asociaciones')
        .insert(associationData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SlidesService.createElementAssociation', error as PostgrestError);
      return null;
    }
  }

  /**
   * Obtiene las asociaciones de un elemento
   * @param elementId ID del elemento
   * @returns Array de asociaciones o array vacío si hay error
   */
  async getElementAssociations(elementId: string): Promise<SlideElementAssociation[]> {
    try {
      if (!elementId) {
        throw new Error('ID de elemento no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      const { data, error } = await client
        .from('asociaciones')
        .select('*')
        .eq('elemento_id', elementId);
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SlideElementAssociation
      return data.map(item => ({
        id: item.id,
        elemento_id: item.elemento_id,
        sheets_id: item.sheets_id,
        columna: item.columna,
        tipo: item.tipo || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion
      }));
    } catch (error) {
      handleError('SlidesService.getElementAssociations', error as PostgrestError);
      return [];
    }
  }

  /**
   * Elimina una asociación
   * @param associationId ID de la asociación
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteElementAssociation(associationId: string): Promise<boolean> {
    try {
      if (!associationId) {
        throw new Error('ID de asociación no proporcionado');
      }
      
      const client = getSupabaseClient();
      
      // Eliminar asociación
      const { error } = await client
        .from('asociaciones')
        .delete()
        .eq('id', associationId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.deleteElementAssociation', error as PostgrestError);
      return false;
    }
  }

  /**
   * Cuenta el total de presentaciones según los filtros aplicados
   * @param options Opciones de filtrado
   * @returns Total de presentaciones o 0 si hay error
   */
  async countSlides(options: SlideListOptions = {}): Promise<number> {
    try {
      const { proyecto_id, busqueda } = options;
      const client = getSupabaseClient();
      
      let query = client.from('slides').select('*', { count: 'exact', head: true });
      
      if (proyecto_id) {
        query = query.eq('proyecto_id', proyecto_id);
      }
      
      if (busqueda) {
        query = query.or(`titulo.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%`);
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      handleError('SlidesService.countSlides', error as PostgrestError);
      return 0;
    }
  }

  /**
   * Obtiene una presentación con sus diapositivas
   * @param slideId ID de la presentación
   * @returns Presentación con array de diapositivas o null si hay error
   */
  async getSlideWithItems(slideId: string): Promise<(Slide & { items: SlideItem[] }) | null> {
    try {
      const slide = await this.getSlideById(slideId);
      if (!slide) return null;

      const items = await this.listSlideItems({ slides_id: slideId });
      
      return {
        ...slide,
        items
      };
    } catch (error) {
      handleError('SlidesService.getSlideWithItems', error as PostgrestError);
      return null;
    }
  }

  /**
   * Crea múltiples diapositivas en lote
   * @param items Array de diapositivas a crear
   * @returns Array con los IDs de las diapositivas creadas o null si hay error
   */
  async bulkCreateSlideItems(items: SlideItemCreateParams[]): Promise<string[] | null> {
    try {
      if (!items.length) {
        throw new Error('No se proporcionaron diapositivas para crear');
      }

      const client = getSupabaseClient();
      
      // Preparar datos para inserción
      const slideItems = items.map(item => ({
        slides_id: item.slides_id,
        orden: item.orden || null,
        titulo: item.titulo || null,
        configuracion: item.configuracion || null,
        diapositiva_id: item.diapositiva_id || null,
        google_presentation_id: item.google_presentation_id || null,
        thumbnail_url: item.thumbnail_url || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      }));
      
      // Insertar diapositivas
      const { data, error } = await client
        .from('diapositivas')
        .insert(slideItems)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      return data ? data.map(item => item.id) : null;
    } catch (error) {
      handleError('SlidesService.bulkCreateSlideItems', error as PostgrestError);
      return null;
    }
  }

  /**
   * Reordena las diapositivas de una presentación
   * @param slideId ID de la presentación
   * @param itemIds Array de IDs de diapositivas en el nuevo orden
   * @returns true si se actualizó correctamente, false si hubo error
   */
  async reorderSlideItems(slideId: string, itemIds: string[]): Promise<boolean> {
    try {
      if (!itemIds.length) {
        throw new Error('No se proporcionaron diapositivas para reordenar');
      }

      const client = getSupabaseClient();
      
      // Actualizar el orden de cada diapositiva
      const updates = itemIds.map((id, index) => ({
        id,
        orden: index + 1,
        fecha_actualizacion: new Date().toISOString()
      }));
      
      const { error } = await client
        .from('slide_items')
        .upsert(updates)
        .eq('slide_id', slideId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SlidesService.reorderSlideItems', error as PostgrestError);
      return false;
    }
  }

  /**
   * Duplica una presentación existente
   * @param slideId ID de la presentación a duplicar
   * @param newTitle Título opcional para la nueva presentación
   * @returns ID de la nueva presentación o null si hay error
   */
  async duplicateSlide(slideId: string, newTitle?: string): Promise<string | null> {
    try {
      const slideWithItems = await this.getSlideWithItems(slideId);
      if (!slideWithItems) {
        throw new Error('Presentación no encontrada');
      }

      // Crear nueva presentación
      const newSlideId = await this.createSlide({
        proyecto_id: slideWithItems.proyecto_id,
        google_presentation_id: slideWithItems.google_presentation_id,
        titulo: newTitle || `Copia de ${slideWithItems.titulo}`,
        nombre: slideWithItems.nombre,
        url: slideWithItems.url,
        metadata: slideWithItems.metadata
      });

      if (newSlideId && slideWithItems.items.length > 0) {
        // Crear copias de las diapositivas
        const newItems = slideWithItems.items.map(item => ({
          slides_id: newSlideId,
          orden: item.orden,
          titulo: item.titulo,
          configuracion: item.configuracion,
          diapositiva_id: item.diapositiva_id,
          google_presentation_id: item.google_presentation_id,
          thumbnail_url: item.thumbnail_url
        }));

        await this.bulkCreateSlideItems(newItems);
      }

      return newSlideId;
    } catch (error) {
      handleError('SlidesService.duplicateSlide', error as PostgrestError);
      return null;
    }
  }
}

// Exportar una instancia por defecto
export const slidesService = new SlidesService(); 