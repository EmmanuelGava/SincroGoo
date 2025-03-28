import { createClient } from '@supabase/supabase-js';
import { AsociacionElementoSupabase, AsociacionElementoDB, ResultadoGuardarAsociaciones } from '@/tipos/asociaciones';
import { ElementoDiapositiva } from '@/tipos/diapositivas';

// Inicializar el cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Logs para verificar las variables de entorno
console.log('🔌 [Supabase] Configuración:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 8)}...${supabaseUrl.substring(supabaseUrl.length - 5)}` : 'No definida');
console.log('- API Key:', supabaseKey ? `${supabaseKey.substring(0, 3)}...${supabaseKey.substring(supabaseKey.length - 3)}` : 'No definida');
console.log('- URL disponible:', !!supabaseUrl);
console.log('- API Key disponible:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ [Supabase] ¡ADVERTENCIA! Variables de entorno para Supabase no configuradas correctamente.');
  console.error('- Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén definidas en el archivo .env');
}

// Implementar patrón singleton para el cliente de Supabase
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseInstance() {
  if (!supabaseInstance && supabaseUrl && supabaseKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance || createClient(supabaseUrl, supabaseKey); // Fallback si es null
}

const supabase = getSupabaseInstance();

// Nombre de la tabla donde se guardarán las asociaciones
const TABLA_ASOCIACIONES = 'asociaciones';

// Función para verificar la conexión a Supabase al inicio
(async function verificarConexionInicial() {
  try {
    console.log('🔍 [Supabase] Verificando conexión inicial a Supabase...');
    const { data, error } = await supabase.from('asociaciones').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ [Supabase] Error en la conexión inicial:', error.message);
      console.error('- Código:', error.code);
      console.error('- Detalles:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ [Supabase] Conexión inicial verificada exitosamente');
    }
  } catch (error) {
    console.error('❌ [Supabase] Error inesperado al verificar conexión inicial:', error);
  }
})();

/**
 * Guarda una asociación de elemento en Supabase
 */
export async function guardarAsociacionElemento(asociacion: AsociacionElementoSupabase) {
  try {
    console.log('🔍 [guardarAsociacionElemento] Inicio');
    console.log('🔍 [guardarAsociacionElemento] Datos recibidos:', JSON.stringify(asociacion, null, 2));
    
    // Verificar que tengamos todos los datos necesarios
    if (!asociacion.id_elemento || !asociacion.id_hoja || !asociacion.columna) {
      console.error('❌ [guardarAsociacionElemento] Faltan datos obligatorios para guardar la asociación');
      console.error('- id_elemento:', asociacion.id_elemento ? '✅' : '❌');
      console.error('- id_hoja:', asociacion.id_hoja ? '✅' : '❌');
      console.error('- columna:', asociacion.columna ? '✅' : '❌');
      return { 
        exito: false, 
        mensaje: 'Faltan datos obligatorios para guardar la asociación'
      };
    }
    
    // Verificar si el ID de hoja es un UUID válido
    const idHojaEsUUID = esUUID(asociacion.id_hoja);
    console.log(`🔍 [guardarAsociacionElemento] ¿ID de hoja es UUID válido? ${idHojaEsUUID ? 'Sí' : 'No'}`);
    
    if (!idHojaEsUUID) {
      console.warn('⚠️ [guardarAsociacionElemento] El ID de hoja no tiene formato UUID válido:', asociacion.id_hoja);
      console.warn('⚠️ [guardarAsociacionElemento] Esto puede causar problemas con las restricciones de clave foránea en la base de datos');
      console.warn('⚠️ [guardarAsociacionElemento] Se intentará guardar de todas formas, pero es posible que falle');
    }
    
    // Mapear los campos de la asociación a los nombres de columnas en la base de datos
    const datosAsociacion = {
      elemento_id: asociacion.id_elemento,
      sheets_id: asociacion.id_hoja,
      columna: asociacion.columna,
      tipo: asociacion.tipo_asociacion || 'texto'
    };
    
    console.log('🔍 [guardarAsociacionElemento] Datos de asociación a guardar:', JSON.stringify(datosAsociacion, null, 2));
    
    // Verificar si ya existe una asociación para este elemento
    console.log('🔍 [guardarAsociacionElemento] Verificando si ya existe una asociación para este elemento...');
    try {
      console.log(`🔍 [guardarAsociacionElemento] Consultando tabla '${TABLA_ASOCIACIONES}' con filtros:`);
      console.log(`- elemento_id: ${asociacion.id_elemento}`);
      
      const { data: asociacionesExistentes, error: errorConsulta } = await supabase
      .from(TABLA_ASOCIACIONES)
      .select('id')
        .eq('elemento_id', asociacion.id_elemento)
        .eq('sheets_id', asociacion.id_hoja)
        .eq('columna', asociacion.columna);
      
      console.log('🔍 [guardarAsociacionElemento] Resultado de la consulta:', 
        asociacionesExistentes ? `${asociacionesExistentes.length} registros encontrados` : 'No hay datos');
      
      if (errorConsulta) {
        console.error('❌ [guardarAsociacionElemento] Error al consultar asociaciones existentes:', errorConsulta);
        console.error('- Código:', errorConsulta.code);
        console.error('- Mensaje:', errorConsulta.message);
        console.error('- Detalles:', JSON.stringify(errorConsulta, null, 2));
        
        // Verificar si el error es porque la tabla no existe
        if (errorConsulta.code === '42P01') {
          console.error(`❌ [guardarAsociacionElemento] La tabla '${TABLA_ASOCIACIONES}' no existe`);
          console.log('🔍 [guardarAsociacionElemento] Intentando crear la tabla...');
          
          const resultadoCreacion = await crearTablaAsociaciones();
          console.log('🔍 [guardarAsociacionElemento] Resultado de la creación de la tabla:', 
            resultadoCreacion.exito ? '✅ Éxito' : '❌ Error');
          
          if (resultadoCreacion.exito) {
            console.log('🔍 [guardarAsociacionElemento] Tabla creada, intentando guardar de nuevo...');
            // Intentar guardar de nuevo después de crear la tabla
            return guardarAsociacionElemento(asociacion);
          } else {
            return { 
              exito: false, 
              mensaje: `No se pudo crear la tabla: ${resultadoCreacion.mensaje}`
            };
          }
        }
        
        return { 
          exito: false, 
          mensaje: `Error al consultar asociaciones: ${errorConsulta.message}`
        };
      }
      
      // Si ya existe una asociación, actualizarla
      if (asociacionesExistentes && asociacionesExistentes.length > 0) {
        const asociacionExistente = asociacionesExistentes[0] as AsociacionElementoDB;
        if (!asociacionExistente.id) {
          console.error('❌ [guardarAsociacionElemento] La asociación existente no tiene ID');
          return { 
            exito: false, 
            mensaje: 'La asociación existente no tiene ID válido'
          };
        }
        console.log(`🔍 [guardarAsociacionElemento] Actualizando asociación existente con ID: ${asociacionExistente.id}`);
        
        try {
          console.log(`🔍 [guardarAsociacionElemento] Ejecutando UPDATE en tabla '${TABLA_ASOCIACIONES}'`);
          const { data, error } = await supabase
            .from(TABLA_ASOCIACIONES)
            .update({
              ...datosAsociacion,
              fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', asociacionExistente.id)
            .select();
          
          console.log('🔍 [guardarAsociacionElemento] Resultado del UPDATE:', 
            error ? '❌ Error' : (data ? `✅ Éxito (${data.length} registros)` : '⚠️ Sin datos'));
          
          if (error) {
            console.error('❌ [guardarAsociacionElemento] Error al actualizar asociación:', error);
            console.error('- Código:', error.code);
            console.error('- Mensaje:', error.message);
            console.error('- Detalles:', JSON.stringify(error, null, 2));
            return { 
              exito: false, 
              mensaje: `Error al actualizar asociación: ${error.message}`
            };
          }
          
          console.log('✅ [guardarAsociacionElemento] Asociación actualizada correctamente:', data);
          return { 
            exito: true, 
            id: asociacionExistente.id,
            mensaje: 'Asociación actualizada correctamente'
          };
        } catch (errorActualizar) {
          console.error('❌ [guardarAsociacionElemento] Error al actualizar asociación (excepción):', errorActualizar);
          if (errorActualizar instanceof Error) {
            console.error('- Mensaje:', errorActualizar.message);
            console.error('- Stack:', errorActualizar.stack);
          }
          return { 
            exito: false, 
            mensaje: 'Error al actualizar asociación' 
          };
        }
      }
      // Si no existe, crear una nueva
      else {
        console.log('🔍 [guardarAsociacionElemento] Creando nueva asociación');
        
        try {
          console.log(`🔍 [guardarAsociacionElemento] Ejecutando INSERT en tabla '${TABLA_ASOCIACIONES}'`);
          
          // Añadir log para verificar valores exactos antes de la inserción
          console.log('⚠️ [guardarAsociacionElemento] DATOS FINALES PARA POST:');
          console.log('- TABLA:', TABLA_ASOCIACIONES);
          console.log('- elemento_id:', datosAsociacion.elemento_id);
          console.log('- sheets_id:', datosAsociacion.sheets_id);
          console.log('- columna:', datosAsociacion.columna);
          console.log('- tipo:', datosAsociacion.tipo);
          
          // Realizar la inserción directa sin usar variables intermedias
          const { data, error } = await supabase
            .from(TABLA_ASOCIACIONES)
            .insert([{
              elemento_id: datosAsociacion.elemento_id,
              sheets_id: datosAsociacion.sheets_id,
              columna: datosAsociacion.columna,
              tipo: datosAsociacion.tipo,
              fecha_creacion: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString()
            }])
            .select();
          
          // Log detallado del resultado
          console.log('🔍 [guardarAsociacionElemento] Resultado completo del INSERT:');
          if (error) {
            console.error('❌ ERROR:', error);
            console.error('- Código:', error.code);
            console.error('- Mensaje:', error.message);
            if (error.details) console.error('- Detalles:', error.details);
          } else {
            console.log('✅ ÉXITO. Datos insertados:', data);
          }
          
          if (error) {
            console.error('❌ [guardarAsociacionElemento] Error al crear asociación:', error);
            console.error('- Código:', error.code);
            console.error('- Mensaje:', error.message);
            console.error('- Detalles:', JSON.stringify(error, null, 2));
            
            // Verificar si el error es por permisos
            if (error.code === '42501' || error.message?.includes('permission denied')) {
              console.error('❌ [guardarAsociacionElemento] Error de permisos en Supabase');
              console.error('- Verifica las políticas de seguridad (RLS) en la tabla');
            }
            
            return { 
              exito: false, 
              mensaje: `Error al crear asociación: ${error.message}`
            };
          }
          
          console.log('✅ [guardarAsociacionElemento] Asociación creada correctamente:', data);
          return { 
            exito: true, 
            id: data && data[0] ? data[0].id : null,
            mensaje: 'Asociación creada correctamente'
          };
        } catch (errorCrear) {
          console.error('❌ [guardarAsociacionElemento] Error al crear asociación (excepción):', errorCrear);
          if (errorCrear instanceof Error) {
            console.error('- Mensaje:', errorCrear.message);
            console.error('- Stack:', errorCrear.stack);
          }
          return { 
            exito: false, 
            mensaje: 'Error al crear asociación' 
          };
        }
      }
    } catch (errorConsultaExcepcion) {
      console.error('❌ [guardarAsociacionElemento] Error al consultar asociaciones existentes (excepción):', errorConsultaExcepcion);
      if (errorConsultaExcepcion instanceof Error) {
        console.error('- Mensaje:', errorConsultaExcepcion.message);
        console.error('- Stack:', errorConsultaExcepcion.stack);
      }
      return { 
        exito: false, 
        mensaje: 'Error al consultar asociaciones existentes' 
      };
    }
  } catch (error) {
    console.error('❌ [guardarAsociacionElemento] Error general al guardar asociación en Supabase:', error);
    if (error instanceof Error) {
      console.error('- Mensaje:', error.message);
      console.error('- Stack:', error.stack);
    } else {
      console.error('- Detalles:', JSON.stringify(error, null, 2));
    }
    return { 
      exito: false, 
      mensaje: 'Error al guardar asociación en Supabase' 
    };
  }
}

/**
 * Elimina una asociación de elemento en Supabase
 */
export async function eliminarAsociacionElemento(elementoId: string, sheetsId?: string) {
  try {
    console.log('🔍 [eliminarAsociacionElemento] Eliminando asociación para elemento:', elementoId);
    
    if (!elementoId) {
      console.error('❌ [eliminarAsociacionElemento] No se proporcionó ID de elemento');
      return { exito: false, mensaje: 'No se proporcionó ID de elemento' };
    }
    
    // Preparar la consulta base
    let query = supabase
      .from(TABLA_ASOCIACIONES)
      .delete()
      .eq('elemento_id', elementoId);
    
    // Si se proporciona sheetsId, filtrar también por ese campo
    if (sheetsId) {
      console.log('🔍 [eliminarAsociacionElemento] Filtrando también por sheets_id:', sheetsId);
      query = query.eq('sheets_id', sheetsId);
    }
    
    // Ejecutar la eliminación
    const { error } = await query;

    if (error) {
      console.error('❌ [eliminarAsociacionElemento] Error al eliminar asociación:', error);
      return { 
        exito: false, 
        mensaje: `Error al eliminar asociación: ${error.message}` 
      };
    }
    
    console.log('✅ [eliminarAsociacionElemento] Asociación eliminada correctamente');
    return { exito: true, mensaje: 'Asociación eliminada correctamente' };
  } catch (error) {
    console.error('❌ [eliminarAsociacionElemento] Error general:', error);
    return { 
      exito: false, 
      mensaje: `Error al eliminar asociación: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Obtiene las asociaciones de elementos para una hoja de cálculo
 */
export async function obtenerAsociacionesHoja(sheetsId: string): Promise<AsociacionElementoSupabase[]> {
  try {
    console.log('🔍 [obtenerAsociacionesHoja] Inicio');
    console.log('- sheetsId:', sheetsId);
    
    if (!sheetsId) {
      console.error('❌ [obtenerAsociacionesHoja] ID de hoja no proporcionado');
      return [];
    }
    
    // Intentar obtener las asociaciones
    const { data: asociacionesDB, error } = await supabase
      .from(TABLA_ASOCIACIONES)
      .select('*')
      .eq('sheets_id', sheetsId);
    
    if (error) {
      console.error('❌ [obtenerAsociacionesHoja] Error al obtener asociaciones:', error);
      
      if (error.code === '42P01') {
        console.error(`❌ [obtenerAsociacionesHoja] La tabla ${TABLA_ASOCIACIONES} no existe en la base de datos`);
      }
      
      return [];
    }
    
    if (!asociacionesDB || asociacionesDB.length === 0) {
      console.log('ℹ️ [obtenerAsociacionesHoja] No se encontraron asociaciones para la hoja');
      return [];
    }
    
    console.log(`✅ [obtenerAsociacionesHoja] Se encontraron ${asociacionesDB.length} asociaciones para la hoja`);
    
    // Convertir los datos de la BD al formato esperado por la aplicación
    const asociaciones: AsociacionElementoSupabase[] = asociacionesDB.map(asoc => ({
      id: asoc.id as string | undefined,
      id_elemento: asoc.elemento_id as string,
      columna: asoc.columna as string,
      tipo_asociacion: asoc.tipo as string,
      id_hoja: asoc.sheets_id as string | undefined,
      fecha_creacion: asoc.fecha_creacion as string | undefined,
      fecha_actualizacion: asoc.fecha_actualizacion as string | undefined
    }));
    
    return asociaciones;
  } catch (error) {
    console.error('❌ [obtenerAsociacionesHoja] Error al obtener asociaciones de Supabase:', error);
    return [];
  }
}

/**
 * Guarda asociaciones de elementos en Supabase
 */
export async function guardarAsociacionesElementos(
  idPresentacion: string,
  idDiapositiva: string,
  elementos: ElementoDiapositiva[],
  idHoja: string,
  idFila: string
): Promise<ResultadoGuardarAsociaciones> {
  try {
    console.log('🔍 [guardarAsociacionesElementos] Iniciando guardado de asociaciones en Supabase');
    console.log('- idPresentacion:', idPresentacion);
    console.log('- idDiapositiva:', idDiapositiva);
    console.log('- idHoja:', idHoja);
    console.log('- idFila:', idFila);
    console.log('- Elementos totales:', elementos.length);
    
    // Verificar que tengamos todos los datos necesarios
    if (!idPresentacion || !idDiapositiva || !idHoja || !idFila) {
      console.error('❌ [guardarAsociacionesElementos] Faltan datos obligatorios');
      console.error('- idPresentacion:', idPresentacion ? '✅' : '❌');
      console.error('- idDiapositiva:', idDiapositiva ? '✅' : '❌');
      console.error('- idHoja:', idHoja ? '✅' : '❌');
      console.error('- idFila:', idFila ? '✅' : '❌');
      return { 
        exito: false, 
        mensaje: 'Faltan datos obligatorios para guardar asociaciones'
      };
    }
    
    // Verificar que la tabla de asociaciones exista
    console.log('🔍 [guardarAsociacionesElementos] Verificando si existe la tabla de asociaciones...');
    
    try {
      const { data, error } = await supabase
      .from(TABLA_ASOCIACIONES)
      .select('id')
      .limit(1);
      
      if (error) {
        // La tabla podría no existir
        console.warn(`⚠️ [guardarAsociacionesElementos] La tabla ${TABLA_ASOCIACIONES} no existe. Intentando crearla...`);
        
        const resultadoCreacion = await crearTablaAsociaciones();
        
        if (!resultadoCreacion.exito) {
          console.error(`❌ [guardarAsociacionesElementos] No se pudo crear la tabla ${TABLA_ASOCIACIONES}:`, resultadoCreacion.mensaje);
          return {
            exito: false,
            mensaje: `No se pudo crear la tabla ${TABLA_ASOCIACIONES}: ${resultadoCreacion.mensaje}`
          };
        } else {
          console.log(`✅ [guardarAsociacionesElementos] Tabla ${TABLA_ASOCIACIONES} creada correctamente. Continuando con el guardado...`);
        }
      }
    } catch (error) {
      console.error('❌ [guardarAsociacionesElementos] Error al verificar tabla:', error);
      return {
        exito: false,
        mensaje: `Error al verificar la tabla ${TABLA_ASOCIACIONES}`
      };
    }
    
    // Filtrar elementos que tienen asociaciones
    const elementosConAsociaciones = elementos.filter(elemento => elemento.columnaAsociada);
    
    console.log(`🔍 [guardarAsociacionesElementos] Elementos con asociaciones: ${elementosConAsociaciones.length} de ${elementos.length}`);
    
    if (elementosConAsociaciones.length === 0) {
      console.log('ℹ️ [guardarAsociacionesElementos] No hay elementos con asociaciones para guardar');
      
      // Primero intentamos eliminar las asociaciones existentes para esta fila
      console.log('🔍 [guardarAsociacionesElementos] Verificando y eliminando asociaciones existentes para esta fila');
      try {
        const resultadoEliminacion = await eliminarAsociacionesPorFila(idPresentacion, idHoja, idFila);
        console.log('🔍 [guardarAsociacionesElementos] Resultado de eliminarAsociacionesPorFila:', resultadoEliminacion);
      } catch (error) {
        console.error('❌ [guardarAsociacionesElementos] Error al eliminar asociaciones existentes:', error);
      }
      
      return {
        exito: true,
        mensaje: 'No hay elementos con asociaciones para guardar',
        idsGuardados: []
      };
    }
    
    // Primero, eliminar las asociaciones existentes para esta fila
    console.log('🔍 [guardarAsociacionesElementos] Eliminando asociaciones existentes antes de guardar nuevas');
    try {
      const resultadoEliminacion = await eliminarAsociacionesPorFila(idPresentacion, idHoja, idFila);
      console.log('🔍 [guardarAsociacionesElementos] Resultado de eliminarAsociacionesPorFila:', resultadoEliminacion);
      
      if (!resultadoEliminacion.exito) {
        console.warn('⚠️ [guardarAsociacionesElementos] No se pudieron eliminar las asociaciones existentes, pero continuaremos intentando guardar las nuevas');
      }
    } catch (error) {
      console.error('❌ [guardarAsociacionesElementos] Error al eliminar asociaciones existentes:', error);
    }
    
    // Crear promesas para guardar todas las asociaciones
    console.log('🔍 [guardarAsociacionesElementos] Preparando guardado para', elementosConAsociaciones.length, 'elementos');
    
    const promesasAsociaciones = elementosConAsociaciones.map(elemento => {
      console.log('🔍 [guardarAsociacionesElementos] Preparando asociación para elemento:', elemento.id);
      
      // Verificar que tengamos un ID de elemento
      if (!elemento.id) {
        console.warn(`⚠️ [guardarAsociacionesElementos] Elemento sin ID, no se puede guardar asociación:`, elemento);
        return Promise.resolve(null);
      }
      
      // Crear objeto de asociación
      const asociacion: AsociacionElementoSupabase = {
        id_elemento: elemento.id,
        columna: elemento.columnaAsociada as string,
        tipo_asociacion: elemento.tipoAsociacion || 'texto',
        id_hoja: idHoja
      };
      
      console.log('🔍 [guardarAsociacionesElementos] Guardando asociación:', JSON.stringify(asociacion));
      
      // Guardar la asociación
      return guardarAsociacionElemento(asociacion);
    });
    
    console.log('🔍 [guardarAsociacionesElementos] Esperando a que se completen todos los guardados...');
    
    // Esperar a que todas las promesas se resuelvan
    const resultados = await Promise.all(promesasAsociaciones);
    
    console.log('🔍 [guardarAsociacionesElementos] Todos los guardados completados. Procesando resultados...');
    
    // Filtrar resultados exitosos y obtener sus IDs
    const idsGuardados = resultados
      .filter(resultado => resultado && resultado.exito && resultado.id)
      .map(resultado => resultado?.id as string);
    
    console.log(`✅ [guardarAsociacionesElementos] Guardadas ${idsGuardados.length} asociaciones de ${elementosConAsociaciones.length} intentadas`);
    
    // Verificar si hubo algún error
    const errores = resultados.filter(resultado => resultado && !resultado.exito);
    
    if (errores.length > 0) {
      console.warn(`⚠️ [guardarAsociacionesElementos] Se encontraron ${errores.length} errores al guardar asociaciones`);
      
      // Si tenemos algunos guardados pero también errores, informarlo como advertencia
      if (idsGuardados.length > 0) {
        return {
          exito: true,
          mensaje: `Guardadas ${idsGuardados.length} asociaciones de ${elementosConAsociaciones.length}`,
          idsGuardados,
          advertencia: `No se pudieron guardar ${errores.length} asociaciones`
        };
      } else {
        // Si no se guardó ninguno, es un error
        return {
          exito: false,
          mensaje: 'No se pudo guardar ninguna asociación',
          advertencia: `Fallaron ${errores.length} intentos de guardado`
        };
      }
    }
    
    // Si llegamos aquí, todo fue exitoso
    return {
      exito: true,
      mensaje: `Guardadas ${idsGuardados.length} asociaciones correctamente`,
      idsGuardados
    };
  } catch (error) {
    console.error('❌ [guardarAsociacionesElementos] Error general:', error);
    
    return {
      exito: false,
      mensaje: `Error general al guardar asociaciones: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Crea la tabla de asociaciones en Supabase si no existe
 */
export async function crearTablaAsociaciones() {
  try {
    console.log('🔍 [crearTablaAsociaciones] Iniciando creación de tabla de asociaciones...');
    console.log(`🔍 [crearTablaAsociaciones] Nombre de la tabla: '${TABLA_ASOCIACIONES}'`);
    
    // Verificar si la tabla existe consultando información del esquema
    const { error } = await supabase
      .from(TABLA_ASOCIACIONES)
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log(`✅ [crearTablaAsociaciones] La tabla ${TABLA_ASOCIACIONES} existe`);    
      return {
        exito: true,
        mensaje: 'La tabla ya existe'
      };
    }
    
    // Si llegamos aquí, la tabla no existe o hubo un error
    console.log(`⚠️ [crearTablaAsociaciones] La tabla '${TABLA_ASOCIACIONES}' no existe o hay un error:`, error);
    
    // Verificar el tipo específico de error para confirmar si la tabla no existe
    const tablaNExiste = error.code === '42P01';
    
    if (tablaNExiste) {
      console.log(`⚠️ [crearTablaAsociaciones] Confirmado: la tabla '${TABLA_ASOCIACIONES}' no existe`);
    } else {
      // Si no es este error específico, podría ser otro problema
      console.error('❌ [crearTablaAsociaciones] Error al verificar tabla:', error);
      console.error('- Código:', error.code);
      console.error('- Mensaje:', error.message);
      console.error('- Detalles:', JSON.stringify(error, null, 2));
      
      return {
        exito: false,
        mensaje: 'Error al verificar si la tabla existe: ' + error.message
      };
    }
    
    console.log(`🔍 [crearTablaAsociaciones] Preparando SQL para crear la tabla '${TABLA_ASOCIACIONES}'...`);
    const sqlCrearTabla = `
CREATE TABLE IF NOT EXISTS ${TABLA_ASOCIACIONES} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elemento_id UUID NOT NULL,
  sheets_id UUID NOT NULL,
  columna TEXT NOT NULL,
  tipo TEXT DEFAULT 'texto',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT asociaciones_elemento_id_fkey FOREIGN KEY (elemento_id) REFERENCES elementos (id) ON DELETE CASCADE,
  CONSTRAINT asociaciones_sheets_id_fkey FOREIGN KEY (sheets_id) REFERENCES sheets (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asociaciones_elemento_id ON ${TABLA_ASOCIACIONES} (elemento_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_sheets_id ON ${TABLA_ASOCIACIONES} (sheets_id);
    `;
    
    console.log('🔍 [crearTablaAsociaciones] SQL generado:');
    console.log(sqlCrearTabla);
    
    // Ejecutar la consulta para crear la tabla
    console.log('🔍 [crearTablaAsociaciones] Ejecutando SQL para crear la tabla...');
    
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: sqlCrearTabla
      });
      
      if (error) {
        console.error('❌ [crearTablaAsociaciones] Error al crear tabla:', error);
        console.error('- Código:', error.code);
        console.error('- Mensaje:', error.message);
        console.error('- Detalles:', JSON.stringify(error, null, 2));
        
        // Manejar error específico de permisos
        if (error.code === '42501') {
          console.error('❌ [crearTablaAsociaciones] Error de permisos al crear tabla');
          return {
            exito: false,
            mensaje: `Error de permisos al crear tabla: ${error.message}`
          };
        }
        
        return {
          exito: false,
          mensaje: `Error al crear tabla: ${error.message}`
        };
      }
      
      console.log('✅ [crearTablaAsociaciones] Tabla creada exitosamente');
      
      return {
        exito: true,
        mensaje: 'Tabla creada exitosamente'
      };
    } catch (errorRPC) {
      console.error('❌ [crearTablaAsociaciones] Error al ejecutar RPC para crear tabla:', errorRPC);
      
      return {
        exito: false,
        mensaje: `Error inesperado al crear tabla: ${errorRPC instanceof Error ? errorRPC.message : 'Error desconocido'}`
      };
    }
  } catch (error) {
    console.error('❌ [crearTablaAsociaciones] Error general:', error);
    
    return {
      exito: false,
      mensaje: `Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Intenta iniciar sesión anónima en Supabase
 * Nota: La autenticación anónima está actualmente deshabilitada
 */
export async function intentarInicioSesionAnonimo() {
  try {
    console.log('🔍 [intentarInicioSesionAnonimo] Verificando estado de autenticación...');
    
    // Verificar si ya hay una sesión
    const { data: { session: sesionActual } } = await supabase.auth.getSession();
    
    if (sesionActual) {
      console.log('✅ [intentarInicioSesionAnonimo] Ya existe una sesión activa');
      console.log('- Usuario:', sesionActual.user?.email || 'Anónimo');
      console.log('- ID:', sesionActual.user?.id);
      return { exito: true, sesion: sesionActual };
    }
    
    console.warn('⚠️ [intentarInicioSesionAnonimo] No hay sesión activa');
    console.warn('⚠️ [intentarInicioSesionAnonimo] La autenticación anónima está deshabilitada');
    console.warn('⚠️ [intentarInicioSesionAnonimo] Se requiere iniciar sesión con un proveedor de autenticación válido');
    
    return { 
      exito: false, 
      error: new Error('Autenticación anónima deshabilitada'),
      mensaje: 'La autenticación anónima está deshabilitada en esta aplicación'
    };
  } catch (error) {
    console.error('❌ [intentarInicioSesionAnonimo] Error inesperado al verificar sesión:', error);
    return { exito: false, error };
  }
}

/**
 * Verifica la configuración de Supabase y la conexión a la base de datos
 */
export async function verificarConexionSupabase() {
  try {
    console.log('🔍 [verificarConexionSupabase] Verificando conexión a Supabase...');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [verificarConexionSupabase] URL o API key de Supabase no configuradas');
      return {
        conectado: false,
        mensaje: 'URL o API key de Supabase no configuradas'
      };
    }
    
    if (!supabase) {
      console.error('❌ [verificarConexionSupabase] Cliente de Supabase no inicializado');
      return {
        conectado: false,
        mensaje: 'Cliente de Supabase no inicializado'
      };
    }
    
    // Intentar hacer una consulta simple para verificar la conexión
    console.log(`🔍 [verificarConexionSupabase] Intentando acceder a la tabla '${TABLA_ASOCIACIONES}'...`);
    const { data, error } = await supabase
      .from(TABLA_ASOCIACIONES)
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ [verificarConexionSupabase] Error al conectar a Supabase:', error);
      console.error('- Código:', error.code);
      console.error('- Mensaje:', error.message);
      
      if (error.code === '42P01') {
        // La tabla no existe, pero la conexión podría estar bien
        console.warn(`⚠️ [verificarConexionSupabase] La tabla '${TABLA_ASOCIACIONES}' no existe, pero la conexión parece estar funcionando`);
        
        // Intentar verificar con otra tabla o método
        try {
          const { error: errorAuth } = await supabase.auth.getSession();
          
          if (errorAuth) {
            console.error('❌ [verificarConexionSupabase] Error al verificar la sesión de auth:', errorAuth);
            return {
              conectado: false,
              mensaje: `Error de autenticación: ${errorAuth.message}`
            };
          } else {
            console.log('✅ [verificarConexionSupabase] Autenticación verificada correctamente');
            return {
              conectado: true,
              mensaje: 'Conexión verificada a través de la autenticación'
            };
          }
        } catch (e) {
          console.error('❌ [verificarConexionSupabase] Error al verificar con autenticación:', e);
          return {
            conectado: false,
            mensaje: 'Error al verificar la conexión usando autenticación'
          };
        }
      }
      
      // Otros tipos de errores
      return {
        conectado: false,
        mensaje: `Error de conexión: ${error.message} (${error.code})`
      };
    }
    
    console.log('✅ [verificarConexionSupabase] Conexión a Supabase verificada correctamente');
    return {
      conectado: true,
      mensaje: 'Conexión exitosa'
    };
  } catch (error) {
    console.error('❌ [verificarConexionSupabase] Error inesperado al verificar conexión:', error);
    return {
      conectado: false,
      mensaje: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Verifica si una cadena es un UUID válido
 */
function esUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Elimina todas las asociaciones para una presentación, hoja y fila específicas
 */
export async function eliminarAsociacionesPorFila(
  idPresentacion: string,
  idHoja: string,
  idFila: string
) {
  try {
    console.log('🔍 [eliminarAsociacionesPorFila] Iniciando eliminación de asociaciones');
    console.log('- idPresentacion:', idPresentacion);
    console.log('- idHoja:', idHoja);
    console.log('- idFila:', idFila);
    
    // Verificar que tengamos todos los datos necesarios
    if (!idPresentacion || !idFila) {
      console.error('❌ [eliminarAsociacionesPorFila] Faltan datos obligatorios');
      console.error('- idPresentacion:', idPresentacion ? '✅' : '❌');
      console.error('- idFila:', idFila ? '✅' : '❌');
      return { 
        exito: false, 
        mensaje: 'Faltan datos obligatorios para eliminar asociaciones'
      };
    }
    
    // Verificar si idHoja es un UUID válido
    const idHojaEsUUID = esUUID(idHoja);
    console.log(`🔍 [eliminarAsociacionesPorFila] ¿idHoja es UUID válido? ${idHojaEsUUID ? 'Sí' : 'No'}`);
    
    if (!idHojaEsUUID) {
      console.warn('⚠️ [eliminarAsociacionesPorFila] El ID de hoja no tiene formato UUID válido');
      console.warn('- idHoja:', idHoja);
      console.warn('⚠️ [eliminarAsociacionesPorFila] Se procederá sin filtrar por sheets_id');
    }
    
    // Verificar la conexión a Supabase
    console.log('🔍 [eliminarAsociacionesPorFila] Verificando conexión a Supabase...');
    const resultadoConexion = await verificarConexionSupabase();
    
    if (!resultadoConexion.conectado) {
      console.error('❌ [eliminarAsociacionesPorFila] Error en la conexión a Supabase:', resultadoConexion.mensaje);
      return { 
        exito: false, 
        mensaje: 'Error en la conexión a Supabase: ' + resultadoConexion.mensaje
      };
    }
    
    console.log('✅ [eliminarAsociacionesPorFila] Conexión a Supabase verificada');
    
    // Primero verificar si existen asociaciones para esta fila
    console.log('🔍 [eliminarAsociacionesPorFila] Verificando si existen asociaciones para esta fila...');
    
    // Construir la consulta base
    let query = supabase
      .from(TABLA_ASOCIACIONES)
      .select('id');
    
    // Añadir filtro por sheets_id solo si es un UUID válido
    if (idHojaEsUUID) {
      query = query.eq('sheets_id', idHoja);
    }
    
    const { data: asociacionesExistentes, error: errorConsulta } = await query;
    
    if (errorConsulta) {
      console.error('❌ [eliminarAsociacionesPorFila] Error al consultar asociaciones existentes:', errorConsulta);
      console.error('- Código:', errorConsulta.code);
      console.error('- Mensaje:', errorConsulta.message);
      
      // Si la tabla no existe, no hay nada que eliminar
      if (errorConsulta.code === '42P01') {
        console.log('ℹ️ [eliminarAsociacionesPorFila] La tabla no existe, no hay asociaciones para eliminar');
        return { 
          exito: true, 
          mensaje: 'No hay asociaciones para eliminar (la tabla no existe)'
        };
      }
      
      return { 
        exito: false, 
        mensaje: 'Error al consultar asociaciones existentes: ' + errorConsulta.message
      };
    }
    
    // Si no hay asociaciones, no hay nada que eliminar
    if (!asociacionesExistentes || asociacionesExistentes.length === 0) {
      console.log('ℹ️ [eliminarAsociacionesPorFila] No se encontraron asociaciones para esta fila');
      return { 
        exito: true, 
        mensaje: 'No hay asociaciones para eliminar'
      };
    }
    
    console.log(`🔍 [eliminarAsociacionesPorFila] Se encontraron ${asociacionesExistentes.length} asociaciones para eliminar`);
    
    // Eliminar las asociaciones
    console.log(`🔍 [eliminarAsociacionesPorFila] Eliminando ${asociacionesExistentes.length} asociaciones de la tabla '${TABLA_ASOCIACIONES}'...`);
    
    // Construir la consulta de eliminación
    // Nota: La tabla asociaciones no tiene las columnas id_presentacion e id_fila
    // Debemos usar las columnas que realmente existen en la tabla
    let deleteQuery = supabase
      .from(TABLA_ASOCIACIONES)
      .delete();
    
    // Añadir filtro por sheets_id solo si es un UUID válido
    if (idHojaEsUUID) {
      deleteQuery = deleteQuery.eq('sheets_id', idHoja);
    }
    
    // Obtener los IDs de las asociaciones a eliminar
    const idsAEliminar = asociacionesExistentes.map(a => a.id);
    
    // Eliminar por IDs
    if (idsAEliminar.length > 0) {
      deleteQuery = deleteQuery.in('id', idsAEliminar);
    }
    
    const { data, error } = await deleteQuery.select();
    
    if (error) {
      console.error('❌ [eliminarAsociacionesPorFila] Error al eliminar asociaciones:', error);
      console.error('- Código:', error.code);
      console.error('- Mensaje:', error.message);
      console.error('- Detalles:', JSON.stringify(error, null, 2));
      
      // Verificar si el error es por restricciones de clave foránea
      if (error.code === '23503') {
        console.error('❌ [eliminarAsociacionesPorFila] Error de restricción de clave foránea');
        console.error('- Es posible que los elementos o la hoja ya no existan en la base de datos');
        
        return { 
          exito: false, 
          mensaje: 'Error de restricción de clave foránea: es posible que los elementos o la hoja ya no existan'
        };
      }
      
      return { 
        exito: false, 
        mensaje: 'Error al eliminar asociaciones: ' + error.message
      };
    }
    
    console.log('✅ [eliminarAsociacionesPorFila] Asociaciones eliminadas correctamente');
    console.log(`- Se eliminaron ${data?.length || asociacionesExistentes.length} asociaciones`);
    
    return { 
      exito: true, 
      mensaje: `Asociaciones eliminadas correctamente (${data?.length || asociacionesExistentes.length})`
    };
  } catch (error) {
    console.error('❌ [eliminarAsociacionesPorFila] Error general al eliminar asociaciones:', error);
    if (error instanceof Error) {
      console.error('- Mensaje:', error.message);
      console.error('- Stack:', error.stack);
    } else {
      console.error('- Detalles:', JSON.stringify(error, null, 2));
    }
    return { 
      exito: false, 
      mensaje: 'Error al eliminar asociaciones: ' + (error instanceof Error ? error.message : JSON.stringify(error))
    };
  }
}

/**
 * Verifica si una tabla existe en la base de datos
 * @param tableName Nombre de la tabla a verificar
 * @returns true si la tabla existe, false en caso contrario
 */
export async function verificarTablaExiste(tableName: string): Promise<boolean> {
  try {
    console.log(`🔍 [Supabase] Verificando si existe la tabla ${tableName}`);
    
    // Intentar una consulta simple a la tabla
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log(`✅ [Supabase] La tabla ${tableName} existe`);
      return true;
    }
    
    // Si el error es 404, la tabla no existe
    if (error.code === '404' || error.message.includes('not found')) {
      console.log(`❌ [Supabase] La tabla ${tableName} no existe (404)`);
      return false;
    }
    
    // Para otros errores, asumimos que la tabla existe pero hay problemas de permisos
    console.log(`⚠️ [Supabase] Error al verificar tabla ${tableName}, asumiendo que existe: ${error.message}`);
    return true;
  } catch (error) {
    console.error(`❌ [Supabase] Error al verificar tabla ${tableName}:`, error);
    return false;
  }
}

/**
 * Crea la función RPC en Supabase para verificar si una tabla existe
 */
export async function crearFuncionVerificarTablaExiste(): Promise<void> {
  try {
    console.log('🔍 [Supabase] Creando función RPC para verificar existencia de tablas...');
    
    // Definición SQL de la función
    const sqlFuncion = `
      CREATE OR REPLACE FUNCTION public.verificar_tabla_existe(nombre_tabla text)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = nombre_tabla
        );
      END;
      $$;
      
      -- Asegurar que la función es accesible para todos los usuarios
      GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO anon;
      GRANT EXECUTE ON FUNCTION public.verificar_tabla_existe(text) TO service_role;
    `;
    
    // Ejecutar SQL directamente usando la función run_sql si está disponible
    const { data, error } = await supabase.rpc('run_sql', { sql: sqlFuncion });
    
    if (error) {
      console.error('❌ [Supabase] Error al crear función RPC:', error);
      
      // Intentar un método alternativo enviando una solicitud al endpoint de administración
      console.log('⚠️ [Supabase] Intentando método alternativo para crear la función...');
      
      // Aquí podrías implementar una llamada a tu propio endpoint API que use
      // credenciales de administrador para crear la función
      
      const respuesta = await fetch('/api/supabase/crear-funcion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: sqlFuncion,
          tipo: 'verificar_tabla_existe'
        })
      });
      
      if (!respuesta.ok) {
        console.error('❌ [Supabase] No se pudo crear la función RPC mediante API:', await respuesta.text());
        throw new Error('No se pudo crear la función RPC');
      }
      
      console.log('✅ [Supabase] Función RPC creada mediante API');
      return;
    }
    
    console.log('✅ [Supabase] Función RPC verificar_tabla_existe creada correctamente');
  } catch (error) {
    console.error('❌ [Supabase] Error al crear función RPC:', error);
    throw error;
  }
}

interface TableExistsResponse {
  exists: boolean;
} 