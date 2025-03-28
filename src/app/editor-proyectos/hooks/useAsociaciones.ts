import { useState, useCallback } from 'react';
import { ElementoDiapositiva as ElementoDiapositivaBase } from '@/tipos/diapositivas';
import { FilaSeleccionada } from '@/tipos/hojas';
import { toast } from 'sonner';
import { ServicioAsociaciones } from '@/servicios/supabase/tablas/asociaciones-service';
import { supabase } from '@/servicios/supabase/globales';

// Interfaz para resultado de operaciones
interface ResultadoOperacion {
  exito: boolean;
  mensaje: string;
  idsGuardados?: string[];
  errores?: string[];
}

// Interfaz local para elementos con propiedades de asociación
interface ElementoConAsociacion {
  id: string;
  tipo: string;
  contenido?: string;
  columnaAsociada?: string;
  tipoAsociacion?: string;
  marcadoParaAsociar?: boolean;
  // Otras propiedades necesarias del ElementoDiapositiva
  posicion?: any; // Hacerlo más flexible para aceptar cualquier estructura de posición
}

/**
 * Hook personalizado para gestionar las asociaciones entre elementos y hojas de cálculo
 */
export function useAsociaciones(
  idPresentacion: string | null | undefined,
  idHoja: string | null | undefined,
  idDiapositiva: string | null | undefined,
  filaSeleccionada: FilaSeleccionada | null
) {
  // Estado para controlar si las asociaciones han cambiado
  const [asociacionesCambiadas, setAsociacionesCambiadas] = useState(false);
  
  // Recuperar primero el UUID de la hoja desde Supabase
  const obtenerUuidHoja = async (googleSheetsId: string): Promise<string | null> => {
    try {
      console.log(`🔍 [useAsociaciones] Obteniendo UUID de hoja con Google Sheets ID: ${googleSheetsId}`);
      
      // Usar el cliente de Supabase para obtener el UUID
      const { data, error } = await supabase
        .from('sheets')
        .select('id')
        .eq('sheets_id', googleSheetsId)
        .single();
      
      if (error) {
        console.error('❌ [useAsociaciones] Error al obtener UUID de hoja:', error);
        return null;
      }
      
      if (!data || !data.id) {
        console.error('❌ [useAsociaciones] No se encontró hoja con Google Sheets ID:', googleSheetsId);
        return null;
      }
      
      console.log(`✅ [useAsociaciones] UUID de hoja obtenido: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ [useAsociaciones] Error al obtener UUID de hoja:', error);
      return null;
    }
  };

  /**
   * Guarda las asociaciones de los elementos con la fila seleccionada
   * Detecta elementos sin asociaciones para crearlas nuevas
   */
  const guardarAsociaciones = async (
    elementos: ElementoConAsociacion[],
    filaSeleccionada: FilaSeleccionada | null,
    idPresentacion: string,
    idHoja: string,
    idDiapositiva: string
  ): Promise<ResultadoOperacion> => {
    console.log('🔄 [useAsociaciones] Iniciando guardado de asociaciones...');
    console.log(`- Elementos a procesar: ${elementos.length}`);
    console.log(`- Fila seleccionada: ${filaSeleccionada ? `ID ${filaSeleccionada.id}` : 'Ninguna'}`);
    
    // Verificar datos necesarios
    if (!filaSeleccionada || !idPresentacion || !idHoja || !idDiapositiva) {
      console.error('❌ [useAsociaciones] Faltan datos necesarios para guardar asociaciones');
      console.error(`- Fila seleccionada: ${filaSeleccionada ? '✅' : '❌'}`);
      console.error(`- ID Presentación: ${idPresentacion ? '✅' : '❌'}`);
      console.error(`- ID Hoja: ${idHoja ? '✅' : '❌'}`);
      console.error(`- ID Diapositiva: ${idDiapositiva ? '✅' : '❌'}`);
      return { 
        exito: false, 
        mensaje: 'Faltan datos necesarios para guardar asociaciones' 
      };
    }
    
    // Obtener el UUID de la hoja (necesario para guardar en Supabase)
    console.log(`🔍 [useAsociaciones] Obteniendo UUID para hoja: ${idHoja}`);
    
    // Verificar si ya es un UUID válido
    const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idHoja);
    let hojaUuid = idHoja;
    
    // Si no es UUID, intentar obtenerlo desde la API
    if (!esUUID) {
      console.log('🔍 [useAsociaciones] El ID de hoja no es un UUID, buscando correspondencia...');
      const { data: hojaData } = await supabase
        .from('sheets')
        .select('id')
        .eq('sheets_id', idHoja)
        .single();
      
      if (hojaData?.id) {
        hojaUuid = hojaData.id;
        console.log(`✅ [useAsociaciones] UUID encontrado: ${hojaUuid}`);
      } else {
        console.error('❌ [useAsociaciones] No se pudo encontrar el UUID de la hoja');
        return { 
          exito: false, 
          mensaje: 'No se pudo obtener UUID de hoja' 
        };
      }
    }
    
    console.log(`✅ [useAsociaciones] UUID de hoja obtenido: ${hojaUuid}`);
    
    // Filtrar elementos que tienen asociaciones
    const elementosConAsociaciones = elementos.filter(elemento => elemento.columnaAsociada || elemento.marcadoParaAsociar);
    console.log(`🔍 [useAsociaciones] Elementos con asociaciones o marcados para asociar: ${elementosConAsociaciones.length}`);
    
    // Si no hay elementos con asociaciones pero el estado indica que hay cambios,
    // es posible que se hayan borrado asociaciones o que necesitemos forzar la sincronización
    if (elementosConAsociaciones.length === 0) {
      console.log('ℹ️ [useAsociaciones] No hay elementos con asociaciones para guardar');
      
      // Si el estado indica que hay cambios, verificamos si necesitamos forzar una sincronización
      if (asociacionesCambiadas) {
        console.log('⚠️ [useAsociaciones] Estado indica cambios aunque no hay elementos con asociaciones');
        
        // Forzar sincronización con una llamada a la API para actualizar el estado en Supabase
        try {
          console.log('🔄 [useAsociaciones] Forzando sincronización para actualizar el estado');
          
          // Intentar una sincronización forzada en Supabase para registrar la actividad
          const resultadoForzado = await ServicioAsociaciones.guardarAsociacion(
            'sincronizacion_forzada', // ID de elemento especial
            hojaUuid,                 // ID de la hoja (ya verificamos que no es null arriba)
            'sincronizacion',         // Columna especial
            'sincronizacion',         // Tipo especial
            true,                     // Forzar sincronización
            idDiapositiva             // ID de la diapositiva
          );
          
          if (resultadoForzado) {
            console.log('✅ [useAsociaciones] Sincronización forzada registrada en Supabase:', resultadoForzado);
          } else {
            console.warn('⚠️ [useAsociaciones] No se pudo registrar la sincronización forzada en Supabase');
          }
          
          // Notificar al sistema que hubo un cambio en las asociaciones, aunque fuera una eliminación
          const evento = new CustomEvent('actualizacion-asociaciones', {
            detail: {
              idPresentacion,
              idHoja,
              idDiapositiva,
              filaId: filaSeleccionada.id,
              accion: 'sincronizar'
            }
          });
          document.dispatchEvent(evento);
          
          // Resetear el estado de cambios ya que se ha registrado la sincronización
          setAsociacionesCambiadas(false);
          
          return { 
            exito: true, 
            mensaje: 'Sincronización forzada registrada correctamente' 
          };
        } catch (error) {
          console.error('❌ [useAsociaciones] Error al registrar sincronización forzada:', error);
          return { 
            exito: false, 
            mensaje: 'Error al registrar sincronización forzada' 
          };
        }
      }
      
      // Si no hay cambios pendientes, simplemente retornar éxito
      return { 
        exito: true, 
        mensaje: 'No hay asociaciones para guardar y no hay cambios pendientes' 
      };
    }
    
    // Guardar las asociaciones para cada elemento con columna asociada o marcado para asociar
    const idsGuardados: string[] = [];
    const erroresGuardados: string[] = [];
    
    console.log(`🔄 [useAsociaciones] Procesando ${elementosConAsociaciones.length} elementos con asociaciones`);
    
    // Iterar sobre cada elemento y guardar su asociación
    for (const elemento of elementosConAsociaciones) {
      // Si el elemento no tiene ID o no tiene columna asociada ni está marcado, omitirlo
      if (!elemento.id || (!elemento.columnaAsociada && !elemento.marcadoParaAsociar)) {
        console.log(`⚠️ [useAsociaciones] Elemento sin ID o sin asociación, omitiendo: ${elemento.id || 'ID no disponible'}`);
        continue;
      }
      
      const columna = elemento.columnaAsociada || (elemento.marcadoParaAsociar ? filaSeleccionada.columnaSeleccionada : null);
      
      if (!columna) {
        console.log(`⚠️ [useAsociaciones] Elemento sin columna asociada, omitiendo: ${elemento.id}`);
        continue;
      }
      
      try {
        console.log(`🔄 [useAsociaciones] Guardando asociación para elemento ${elemento.id}`);
        console.log(`- Columna: ${columna}`);
        console.log(`- Tipo: ${elemento.tipoAsociacion || 'texto'}`);
        
        // Llamar al servicio para guardar la asociación
        const idAsociacion = await ServicioAsociaciones.guardarAsociacion(
          elemento.id,
          hojaUuid,
          columna,
          elemento.tipoAsociacion || 'texto',
          false, // No forzar sincronización para elementos normales
          idDiapositiva
        );
        
        if (idAsociacion) {
          console.log(`✅ [useAsociaciones] Asociación guardada con ID: ${idAsociacion}`);
          idsGuardados.push(idAsociacion);
          
          // Si es un elemento que estaba marcado para asociar, actualizar su estado
          if (elemento.marcadoParaAsociar) {
            console.log(`🔄 [useAsociaciones] Actualizando estado del elemento ${elemento.id} después de asociar`);
            // Aquí podrías actualizar el estado del elemento en la UI si es necesario
          }
        } else {
          console.error(`❌ [useAsociaciones] No se pudo guardar la asociación para el elemento ${elemento.id}`);
          erroresGuardados.push(`Error al guardar asociación para elemento ${elemento.id}`);
        }
      } catch (error) {
        console.error(`❌ [useAsociaciones] Error al guardar asociación para elemento ${elemento.id}:`, error);
        erroresGuardados.push(`Error al guardar asociación para elemento ${elemento.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    
    console.log(`🔄 [useAsociaciones] Guardado finalizado. Éxitos: ${idsGuardados.length}, Errores: ${erroresGuardados.length}`);
    
    // Si se guardó al menos una asociación con éxito, consideramos la operación exitosa
    if (idsGuardados.length > 0) {
      // Notificar al sistema que hubo cambios en las asociaciones
      const evento = new CustomEvent('actualizacion-asociaciones', {
        detail: {
          idPresentacion,
          idHoja,
          idDiapositiva,
          filaId: filaSeleccionada.id,
          accion: 'guardar'
        }
      });
      document.dispatchEvent(evento);
      
      // Resetear el estado de cambios ya que se han guardado las asociaciones
      setAsociacionesCambiadas(false);
      
      // Si hubo algunos errores pero también éxitos, mostrar advertencia
      if (erroresGuardados.length > 0) {
        return { 
          exito: true, 
          mensaje: `Se guardaron ${idsGuardados.length} asociaciones con éxito, pero hubo ${erroresGuardados.length} errores` 
        };
      }
      
      return { 
        exito: true, 
        mensaje: `Se guardaron ${idsGuardados.length} asociaciones con éxito` 
      };
    }
    
    // Si no se guardó ninguna asociación y hay errores, reportar error
    if (erroresGuardados.length > 0) {
      const mensaje = `
        No se pudo guardar ninguna asociación.
        Errores: ${erroresGuardados.join(', ')}
      `;
      return { 
        exito: false, 
        mensaje 
      };
    }
    
    // Si no se guardó ninguna asociación pero tampoco hubo errores, reportar "no hay cambios"
    return { 
      exito: true, 
      mensaje: 'No se realizaron cambios en las asociaciones' 
    };
  };
  
  /**
   * Marca que hay cambios en las asociaciones
   */
  const marcarCambiosAsociaciones = useCallback((estado: boolean = true) => {
    console.log(`🔍 [useAsociaciones] ${estado ? 'Marcando' : 'Desmarcando'} cambios en asociaciones`);
    
    // Si hay un intento de desmarcar cambios pero realmente hay asociaciones modificadas, 
    // verificamos primero si la llamada proviene de un reset automático incorrecto
    if (!estado && asociacionesCambiadas) {
      console.log('⚠️ [useAsociaciones] Intento de desmarcar cambios cuando hay asociaciones modificadas');
      
      // Verificar si la llamada es desde BotonGuardarElementos después de un guardado exitoso
      const esResetDespuesDeGuardado = new Error().stack?.includes('guardarCambios');
      
      if (!esResetDespuesDeGuardado) {
        console.log('ℹ️ [useAsociaciones] Conservando estado de cambios por haber detectado modificaciones reales');
        return; // No cambiamos el estado si hay cambios reales y no estamos después de guardar
      }
    }
    
    setAsociacionesCambiadas(estado);
  }, [setAsociacionesCambiadas, asociacionesCambiadas]);
  
  /**
   * Verifica si hay cambios en las asociaciones
   */
  const hayAsociacionesCambiadas = useCallback(() => {
    console.log('🔍 [useAsociaciones] Valor actual de asociacionesCambiadas:', asociacionesCambiadas);
    return asociacionesCambiadas;
  }, [asociacionesCambiadas]);
  
  return {
    guardarAsociaciones,
    marcarCambiosAsociaciones,
    hayAsociacionesCambiadas,
    setAsociacionesCambiadas
  };
} 