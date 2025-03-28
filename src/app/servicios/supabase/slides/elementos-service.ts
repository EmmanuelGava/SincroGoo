import { SupabaseService } from '../globales/supabase-service';
import { Elemento, Asociacion } from '../globales/tipos';

/**
 * Operaciones relacionadas con la tabla de elementos utilizando el servicio centralizado
 */
export class ElementosAPI {
  /**
   * Guarda un elemento en la base de datos
   * @param elemento Datos del elemento a guardar
   * @returns ID del elemento guardado o null si hay error
   */
  static async guardarElemento(elemento: Omit<Elemento, 'id'>): Promise<string | null> {
    try {
      console.log('🔄 [Elemento Debug] Guardando elemento:', elemento);
      
      const { data, error } = await SupabaseService.insert<Elemento>(
        'elementos',
        elemento
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al crear elemento:', error);
        throw new Error(error.message || 'Error al crear elemento');
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('❌ [Elemento Debug] No se pudo crear el elemento, respuesta vacía');
        return null;
      }
      
      const id = data[0].id;
      if (!id) {
        console.error('❌ [Elemento Debug] No se pudo crear el elemento, ID no definido');
        return null;
      }
      
      console.log('✅ [Elemento Debug] Elemento creado correctamente:', id);
      return id;
    } catch (error) {
      console.error('❌ [Elemento Debug] Error al guardar elemento:', error);
      return null;
    }
  }

  /**
   * Guarda múltiples elementos en la base de datos
   * @param elementos Array de elementos a guardar
   * @param checkExistentes Si es true, verifica si los elementos ya existen antes de guardarlos
   * @returns Array con los IDs de los elementos guardados
   */
  static async guardarElementos(elementos: Elemento[], checkExistentes: boolean = true): Promise<string[]> {
    try {
      console.log(`🔄 [Elementos] Guardando ${elementos.length} elementos`);
      
      if (!elementos || elementos.length === 0) {
        console.log('ℹ️ [Elementos] No hay elementos para guardar');
        return [];
      }
      
      // Si sabemos que los datos no han cambiado o es carga inicial, podemos omitir verificación
      if (!checkExistentes) {
        console.log('🔄 [Elementos] Omitiendo verificación de elementos existentes para optimizar');
        
        // Comprobar si los elementos ya tienen IDs (es una recarga sin cambios)
        const elementosConId = elementos.filter(e => e.id).map(e => e.id as string);
        if (elementosConId.length === elementos.length) {
          console.log('ℹ️ [Elementos] Todos los elementos ya tienen ID, retornando los IDs existentes');
          return elementosConId;
        }
        
        // Si no tienen IDs, debemos crearlos
        const promesas = elementos.map(elemento => this.guardarElemento(elemento));
        const resultados = await Promise.all(promesas);
        
        // Filtrar los resultados para eliminar los null
        const elementosIds = resultados.filter(id => id !== null) as string[];
        console.log(`✅ [Elementos] Guardados ${elementosIds.length} elementos sin verificación`);
        
        return elementosIds;
      }
      
      // Agrupar elementos por diapositiva para optimizar las consultas
      const elementosPorDiapositiva: Record<string, Elemento[]> = {};
      
      elementos.forEach(elemento => {
        if (!elementosPorDiapositiva[elemento.diapositiva_id]) {
          elementosPorDiapositiva[elemento.diapositiva_id] = [];
        }
        elementosPorDiapositiva[elemento.diapositiva_id].push(elemento);
      });
      
      const todosIds: string[] = [];
      
      // Procesar cada diapositiva por separado
      for (const [diapositivaId, elementosDiapositiva] of Object.entries(elementosPorDiapositiva)) {
        // Obtener elementos existentes de esta diapositiva
        const elementosExistentes = await this.obtenerElementosPorDiapositiva(diapositivaId);
        console.log(`🔍 [Elementos] ${elementosExistentes.length} elementos existentes para diapositiva ${diapositivaId}`);
        
        // Filtrar elementos para crear o actualizar
        const elementosAGuardar: Elemento[] = [];
        const elementosSinCambios: string[] = [];
        
        for (const elemento of elementosDiapositiva) {
          // Buscar si el elemento ya existe
          const elementoExistente = elementosExistentes.find(e => 
            e.elemento_id === elemento.elemento_id && e.diapositiva_id === elemento.diapositiva_id
          );
          
          // Si no existe, se crea
          if (!elementoExistente) {
            elementosAGuardar.push(elemento);
            continue;
          }
          
          // Verificar si hay cambios
          const contenidoCambiado = elementoExistente.contenido !== elemento.contenido;
          const posicionCambiada = JSON.stringify(elementoExistente.posicion) !== JSON.stringify(elemento.posicion);
          const estiloCambiado = JSON.stringify(elementoExistente.estilo) !== JSON.stringify(elemento.estilo);
          const celdaAsociadaCambiada = elementoExistente.celda_asociada !== elemento.celda_asociada;
          const tipoAsociacionCambiada = elementoExistente.tipo_asociacion !== elemento.tipo_asociacion;
          
          // Si hay cambios, se actualiza
          if (contenidoCambiado || posicionCambiada || estiloCambiado || celdaAsociadaCambiada || tipoAsociacionCambiada) {
            // Asignar el ID para actualizar en lugar de crear
            elemento.id = elementoExistente.id;
            elementosAGuardar.push(elemento);
          } else {
            // Si no hay cambios, guardamos su ID
            elementosSinCambios.push(elementoExistente.id as string);
          }
        }
        
        console.log(`📊 [Elementos] ${elementosAGuardar.length} elementos a guardar para diapositiva ${diapositivaId}`);
        console.log(`ℹ️ [Elementos] ${elementosSinCambios.length} elementos sin cambios para diapositiva ${diapositivaId}`);
        
        // Guardar elementos con cambios
        if (elementosAGuardar.length > 0) {
          const promesas = elementosAGuardar.map(elemento => this.guardarElemento(elemento));
          const resultados = await Promise.all(promesas);
          
          // Filtrar los resultados para eliminar los null
          const elementosGuardadosIds = resultados.filter(id => id !== null) as string[];
          todosIds.push(...elementosGuardadosIds);
        }
        
        // Agregar IDs de elementos sin cambios
        todosIds.push(...elementosSinCambios);
      }
      
      console.log(`✅ [Elementos] Total de elementos: ${todosIds.length}`);
      return todosIds;
    } catch (error) {
      console.error('❌ [Elementos] Error al guardar elementos:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los elementos de una diapositiva
   * @param diapositivaId ID de la diapositiva
   * @returns Array de elementos o array vacío si hay error
   */
  static async obtenerElementosPorDiapositiva(diapositivaId: string): Promise<Elemento[]> {
    try {
      console.log('🔍 [Elemento Debug] Obteniendo elementos para diapositiva:', diapositivaId);
      
      const { data, error } = await SupabaseService.select(
        'elementos',
        { diapositiva_id: diapositivaId }
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al obtener elementos:', error);
        return [];
      }
      
      console.log(`✅ [Elemento Debug] Se encontraron ${data?.length || 0} elementos`);
      return data || [];
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en obtenerElementosPorDiapositiva:', error);
      return [];
    }
  }

  /**
   * Obtiene un elemento por su ID de Google
   * @param elementoId ID de Google del elemento
   * @param diapositivaId ID de la diapositiva (opcional para filtrar)
   * @returns Elemento o null si no existe
   */
  static async obtenerElementoPorGoogleId(elementoId: string, diapositivaId?: string): Promise<Elemento | null> {
    try {
      console.log('🔍 [Elemento Debug] Buscando elemento con ID:', elementoId);
      
      // Construir el filtro
      const filtro: any = { elemento_id: elementoId };
      if (diapositivaId) {
        filtro.diapositiva_id = diapositivaId;
      }
      
      const { data, error } = await SupabaseService.select(
        'elementos',
        filtro
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al buscar elemento:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ [Elemento Debug] No se encontró elemento con ID:', elementoId);
        return null;
      }
      
      console.log('✅ [Elemento Debug] Elemento encontrado:', data[0].id);
      return data[0];
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en obtenerElementoPorGoogleId:', error);
      return null;
    }
  }

  /**
   * Elimina un elemento de la base de datos
   * @param elementoId ID del elemento a eliminar
   * @returns true si se eliminó correctamente, false si hubo error
   */
  static async eliminarElemento(elementoId: string): Promise<boolean> {
    try {
      console.log('🔄 [Elemento Debug] Eliminando elemento:', elementoId);
      
      const { error } = await SupabaseService.delete(
        'elementos',
        { id: elementoId }
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al eliminar elemento:', error);
        return false;
      }
      
      console.log('✅ [Elemento Debug] Elemento eliminado correctamente');
      return true;
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en eliminarElemento:', error);
      return false;
    }
  }

  /**
   * Guarda una asociación entre un elemento y una columna de una hoja de cálculo
   * @param asociacion Datos de la asociación
   * @returns ID de la asociación guardada o null si hay error
   */
  static async guardarAsociacion(asociacion: Asociacion): Promise<string | null> {
    try {
      console.log('🔄 [Elemento Debug] Guardando asociación:', asociacion);
      
      if (!asociacion.elemento_id || !asociacion.sheets_id || !asociacion.columna || !asociacion.tipo) {
        console.error('❌ [Elemento Debug] Datos incompletos para guardar asociación');
        return null;
      }
      
      // Verificar si ya existe una asociación para este elemento
      const { data: existente, error: errorBusqueda } = await SupabaseService.select(
        'asociaciones',
        { elemento_id: asociacion.elemento_id }
      );
      
      if (errorBusqueda) {
        console.warn('⚠️ [Elemento Debug] Error al buscar asociación existente:', errorBusqueda);
        // Continuamos de todos modos
      }
      
      if (existente && existente.length > 0) {
        console.log('🔄 [Elemento Debug] Actualizando asociación existente');
        
        // Verificar si hay cambios antes de actualizar
        if (existente[0].sheets_id === asociacion.sheets_id && 
            existente[0].columna === asociacion.columna && 
            existente[0].tipo === asociacion.tipo) {
          console.log('ℹ️ [Elemento Debug] No hay cambios en la asociación, omitiendo actualización');
          return existente[0].id;
        }
        
        // Actualizar asociación existente
        const { data: actualizado, error: errorActualizar } = await SupabaseService.update(
          'asociaciones',
          { id: existente[0].id },
          {
            sheets_id: asociacion.sheets_id,
            columna: asociacion.columna,
            tipo: asociacion.tipo
          }
        );
        
        if (errorActualizar) {
          console.error('❌ [Elemento Debug] Error al actualizar asociación:', errorActualizar);
          return null;
        }
        
        console.log('✅ [Elemento Debug] Asociación actualizada correctamente');
        return existente[0].id;
      }
      
      // Si no existe, crear nueva asociación
      const { data: nuevo, error: errorCrear } = await SupabaseService.insert(
        'asociaciones',
        asociacion
      );
      
      if (errorCrear) {
        console.error('❌ [Elemento Debug] Error al crear asociación:', errorCrear);
        return null;
      }
      
      if (!nuevo || nuevo.length === 0) {
        console.error('❌ [Elemento Debug] No se pudo crear la asociación');
        return null;
      }
      
      const id = nuevo[0].id;
      if (!id) {
        console.error('❌ [Elemento Debug] No se pudo crear la asociación, ID no definido');
        return null;
      }
      
      console.log('✅ [Elemento Debug] Asociación creada correctamente:', id);
      return id;
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en guardarAsociacion:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las asociaciones de un elemento
   * @param elementoId ID del elemento
   * @returns Array de asociaciones o array vacío si hay error
   */
  static async obtenerAsociacionesPorElemento(elementoId: string): Promise<Asociacion[]> {
    try {
      console.log('🔍 [Elemento Debug] Obteniendo asociaciones para elemento:', elementoId);
      
      const { data, error } = await SupabaseService.select(
        'asociaciones',
        { elemento_id: elementoId }
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al obtener asociaciones:', error);
        return [];
      }
      
      console.log(`✅ [Elemento Debug] Se encontraron ${data?.length || 0} asociaciones`);
      return data || [];
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en obtenerAsociacionesPorElemento:', error);
      return [];
    }
  }

  /**
   * Elimina una asociación de la base de datos
   * @param asociacionId ID de la asociación a eliminar
   * @returns true si se eliminó correctamente, false si hubo error
   */
  static async eliminarAsociacion(asociacionId: string): Promise<boolean> {
    try {
      console.log('🔄 [Elemento Debug] Eliminando asociación:', asociacionId);
      
      const { error } = await SupabaseService.delete(
        'asociaciones',
        { id: asociacionId }
      );
      
      if (error) {
        console.error('❌ [Elemento Debug] Error al eliminar asociación:', error);
        return false;
      }
      
      console.log('✅ [Elemento Debug] Asociación eliminada correctamente');
      return true;
    } catch (error) {
      console.error('❌ [Elemento Debug] Error general en eliminarAsociacion:', error);
      return false;
    }
  }

  /**
   * Actualiza elementos en Google Slides
   * @param presentacionId ID de la presentación en Google
   * @param diapositivaId ID de la diapositiva
   * @param elementos Elementos a actualizar
   * @param sheetId ID de la hoja de cálculo
   * @param filaSeleccionada Fila seleccionada o número
   * @param sheetUUID UUID de la hoja en Supabase
   * @param esRecarga Si es true, asume que es una recarga sin cambios
   * @returns Resultado de la actualización
   */
  static async actualizarElementosEnGoogleSlides(
    presentacionId: string,
    diapositivaId: string,
    elementos: any[],
    sheetId: string,
    filaSeleccionada: any,
    sheetUUID?: string,
    esRecarga: boolean = false
  ): Promise<any> {
    try {
      console.log('🔄 [Elementos] Actualizando elementos en Google Slides:', {
        presentacionId,
        diapositivaId,
        elementos: elementos.length,
        sheetId,
        filaSeleccionada: typeof filaSeleccionada === 'object' ? filaSeleccionada.id : filaSeleccionada,
        sheetUUID,
        esRecarga
      });
      
      // Guardar elementos en la base de datos
      const elementosGuardados = await this.guardarElementos(elementos, !esRecarga);
      
      console.log(`✅ [Elementos] Elementos actualizados en Google Slides: ${elementosGuardados.length}`);
      return {
        exito: true,
        elementosIds: elementosGuardados
      };
    } catch (error) {
      console.error('❌ [Elementos] Error al actualizar elementos en Google Slides:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Guarda elementos de una diapositiva
   * @param diapositivaId ID de la diapositiva
   * @param elementos Elementos a guardar
   * @param esRecarga Si es true, los elementos se guardarán sin verificar los existentes
   * @returns Resultado de la operación
   */
  static async guardarElementosDiapositiva(
    diapositivaId: string,
    elementos: any[],
    esRecarga: boolean = false
  ): Promise<any> {
    try {
      console.log(`🔄 [Elementos] Guardando ${elementos.length} elementos para diapositiva ${diapositivaId}`);
      console.log(`🔄 [Elementos] Modo de guardado: ${esRecarga ? 'recarga rápida' : 'normal con verificación'}`);
      
      // Preparar elementos con el ID de diapositiva
      const elementosConDiapositiva = elementos.map(elemento => ({
        ...elemento,
        diapositiva_id: diapositivaId
      }));
      
      // Guardar elementos (sin verificar existentes si es recarga)
      const elementosGuardados = await this.guardarElementos(elementosConDiapositiva, !esRecarga);
      
      console.log(`✅ [Elementos] Guardados ${elementosGuardados.length} elementos para diapositiva ${diapositivaId}`);
      return {
        exito: true,
        elementosIds: elementosGuardados
      };
    } catch (error) {
      console.error(`❌ [Elementos] Error al guardar elementos para diapositiva ${diapositivaId}:`, error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
} 