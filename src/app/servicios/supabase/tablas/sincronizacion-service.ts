import { SupabaseService } from '../globales/supabase-service';
import { SheetsAPI } from './sheets-service';
import { SlidesAPI } from '../slides/slides-service';
import { CeldasAPI } from './celdas-service';
import { ElementosAPI } from '../slides/elementos-service';
import { Slide } from '../globales/tipos';
import { DiapositivasAPI } from '../slides/diapositivas-service';
import { ServicioAsociaciones } from './asociaciones-service';

/**
 * Operaciones relacionadas con la sincronización e inicialización de la base de datos
 * utilizando el servicio centralizado
 */
export class SincronizacionAPI {
  /**
   * Inicializa la base de datos verificando que existan las tablas y funciones RPC necesarias
   * @returns Objeto con el estado de las tablas y funciones RPC
   */
  static async inicializarBaseDatos(): Promise<{
    tablas: { [key: string]: boolean },
    funcionesRPC: { [key: string]: boolean }
  }> {
    try {
      console.log('🔄 [Supabase] Iniciando verificación de base de datos');
      
      // Verificar tablas
      const tablas = await this.verificarTablas();
      
      // Verificar funciones RPC (modo de compatibilidad)
      const resultadoRPC = await this.verificarFuncionesRPC();
      
      // Verificar tablas de elementos
      const elementosOK = await this.verificarTablasElementos();
      
      console.log('✅ [Supabase] Verificación de base de datos completada');
      
      return {
        tablas,
        funcionesRPC: resultadoRPC
      };
    } catch (error) {
      console.error('❌ [Supabase] Error al inicializar base de datos:', error);
      
      // En lugar de propagar el error, devolvemos un objeto con valores por defecto
      // para permitir que la aplicación continúe funcionando
      return {
        tablas: {},
        funcionesRPC: {}
      };
    }
  }

  /**
   * Verifica que existan las tablas necesarias en la base de datos
   * @returns Objeto con el estado de cada tabla
   */
  static async verificarTablas(): Promise<{ [key: string]: boolean }> {
    try {
      console.log('🔍 [Supabase] Verificando tablas');
      
      const tablasRequeridas = [
        'proyectos',
        'sheets',
        'slides',
        'diapositivas',
        'elementos',
        'celdas',
        'asociaciones'
      ];
      
      const resultado: { [key: string]: boolean } = {};
      
      // Verificar cada tabla
      for (const tabla of tablasRequeridas) {
        resultado[tabla] = await this.verificarTabla(tabla);
      }
      
      console.log('✅ [Supabase] Verificación de tablas completada:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Supabase] Error al verificar tablas:', error);
      return {};
    }
  }

  /**
   * Verifica que existan las funciones RPC necesarias en la base de datos
   * @returns Objeto con el estado de cada función RPC
   */
  static async verificarFuncionesRPC(): Promise<{ [key: string]: boolean }> {
    try {
      console.log('🔍 [Supabase] Verificando funciones RPC');
      
      const funcionesRequeridas = [
        'guardar_celdas',
        'guardar_celdas_google'
      ];
      
      const resultado: { [key: string]: boolean } = {};
      
      // Verificar cada función RPC
      for (const funcion of funcionesRequeridas) {
        try {
          // Intentar llamar a la función con parámetros mínimos
          const { error } = await SupabaseService.rpc(funcion, {
            p_sheet_id: '00000000-0000-0000-0000-000000000000',
            p_celdas: '[]',
            p_google_id: '00000000-0000-0000-0000-000000000000'
          });
          
          // Si no hay error de tipo "función no existe", consideramos que la función existe
          // Puede haber otros errores (como parámetros incorrectos) pero eso no significa que la función no exista
          resultado[funcion] = !error || !error.message.includes('function does not exist');
        } catch (e) {
          resultado[funcion] = false;
        }
      }
      
      console.log('✅ [Supabase] Verificación de funciones RPC completada:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Supabase] Error al verificar funciones RPC:', error);
      return {};
    }
  }

  /**
   * Verifica si existe una tabla específica en la base de datos
   * @param nombreTabla Nombre de la tabla a verificar
   * @returns true si la tabla existe, false si no existe
   */
  static async verificarTabla(nombreTabla: string): Promise<boolean> {
    try {
      console.log(`🔍 [Supabase] Verificando tabla: ${nombreTabla}`);
      
      // Intentar hacer una consulta simple a la tabla
      const { data, error } = await SupabaseService.select(
        nombreTabla,
        {},
        { select: 'id', order: { column: 'id', ascending: true } }
      );
      
      // Si hay un error que indica que la tabla no existe, retornamos false
      if (error && (
        error.message.includes('relation') && 
        error.message.includes('does not exist')
      )) {
        console.log(`⚠️ [Supabase] Tabla ${nombreTabla} no existe`);
        return false;
      }
      
      // Si hay otro tipo de error, asumimos que la tabla existe pero hay otro problema
      if (error) {
        console.warn(`⚠️ [Supabase] Error al verificar tabla ${nombreTabla}:`, error);
        // Asumimos que la tabla existe pero hay otro problema
        return true;
      }
      
      console.log(`✅ [Supabase] Tabla ${nombreTabla} existe`);
      return true;
    } catch (error) {
      console.error(`❌ [Supabase] Error al verificar tabla ${nombreTabla}:`, error);
      return false;
    }
  }

  /**
   * Verifica que existan las tablas relacionadas con elementos
   * @returns true si todas las tablas existen, false si alguna no existe
   */
  static async verificarTablasElementos(): Promise<boolean> {
    try {
      console.log('🔍 [Supabase] Verificando tablas de elementos');
      
      const tablasRequeridas = [
        'elementos',
        'asociaciones'
      ];
      
      // Verificar cada tabla
      for (const tabla of tablasRequeridas) {
        const existe = await this.verificarTabla(tabla);
        if (!existe) {
          console.log(`⚠️ [Supabase] Tabla ${tabla} no existe`);
          return false;
        }
      }
      
      console.log('✅ [Supabase] Todas las tablas de elementos existen');
      return true;
    } catch (error) {
      console.error('❌ [Supabase] Error al verificar tablas de elementos:', error);
      return false;
    }
  }

  /**
   * Sincroniza un proyecto con la base de datos
   * @param proyectoId ID del proyecto
   * @param datosSheets Datos de hojas de cálculo
   * @param datosSlides Datos de presentaciones
   * @returns Objeto con los resultados de la sincronización
   */
  static async sincronizarProyecto(
    proyectoId: string,
    datosSheets: Array<{
      googleId: string,
      titulo: string,
      celdas: Array<{
        fila: number,
        columna: string,
        referencia: string,
        contenido: string,
        tipo?: 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen',
        formato?: Record<string, any>
      }>
    }>,
    datosSlides: Array<{
      googleId: string,
      titulo: string,
      slides_id?: string,
      nombre?: string,
      url?: string,
      diapositivas: Array<{
        id: string,
        titulo?: string,
        orden?: number,
        elementos: Array<{
          id: string,
          tipo: string,
          contenido?: string,
          posicion?: Record<string, any>,
          estilo?: Record<string, any>,
          asociaciones?: Array<{
            sheetId: string,
            columna: string,
            tipo: string
          }>
        }>
      }>
    }>
  ): Promise<{
    sheets: { [key: string]: string },
    slides: { [key: string]: string },
    celdas: number,
    elementos: number,
    asociaciones: number
  }> {
    try {
      console.log('🔄 [Supabase] Iniciando sincronización de proyecto:', proyectoId);
      console.log(`📊 [Supabase] Datos a sincronizar: ${datosSheets.length} hojas, ${datosSlides.length} presentaciones`);
      
      // Resultados
      const resultado = {
        sheets: {} as { [key: string]: string },
        slides: {} as { [key: string]: string },
        celdas: 0,
        elementos: 0,
        asociaciones: 0
      };
      
      // Sincronizar hojas de cálculo
      for (const sheet of datosSheets) {
        console.log(`🔄 [Supabase] Sincronizando hoja: ${sheet.titulo} (${sheet.googleId})`);
        
        try {
          // Guardar sheet
          const sheetObj = await SheetsAPI.crearSheet({
            proyecto_id: proyectoId,
            sheets_id: sheet.googleId,
            titulo: sheet.titulo,
            nombre: sheet.titulo,
            google_id: sheet.googleId
          });
          
          if (!sheetObj || !sheetObj.id) {
            console.error(`❌ [Supabase] Error al guardar hoja: ${sheet.titulo}`);
            continue;
          }
          
          const sheetId = sheetObj.id;
          resultado.sheets[sheet.googleId] = sheetId;
          console.log(`✅ [Supabase] Hoja guardada con ID: ${sheetId}`);
          
          // También llamar al API REST para asegurar la sincronización
          try {
            const apiResult = await fetch('/api/sheets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proyectoId: proyectoId,
                sheetsId: sheet.googleId,
                titulo: sheet.titulo,
                url: `https://docs.google.com/spreadsheets/d/${sheet.googleId}/edit`
              })
            });
            
            if (!apiResult.ok) {
              console.warn(`⚠️ [Supabase] Advertencia en API REST para sheet: ${await apiResult.text()}`);
            } else {
              console.log(`✅ [Supabase] Sincronización via API REST exitosa para sheet`);
            }
          } catch (apiError) {
            console.warn(`⚠️ [Supabase] Error al sincronizar con API REST para sheet:`, apiError);
          }
          
          // Guardar celdas
          if (sheet.celdas && sheet.celdas.length > 0) {
            console.log(`🔄 [Supabase] Guardando ${sheet.celdas.length} celdas para hoja: ${sheet.titulo}`);
            
            const celdasFormateadas = sheet.celdas.map(celda => ({
              sheet_id: sheetId,
              fila: celda.fila,
              columna: celda.columna,
              referencia_celda: celda.referencia,
              contenido: celda.contenido,
              tipo: celda.tipo || 'texto',
              formato: celda.formato || {}
            }));
            
            try {
              const celdasIds = await CeldasAPI.guardarCeldas(sheetId, celdasFormateadas);
              
              if (celdasIds) {
                resultado.celdas += celdasIds.length;
                console.log(`✅ [Supabase] Guardadas ${celdasIds.length} celdas para hoja: ${sheet.titulo}`);
              }
            } catch (celdasError) {
              console.error(`❌ [Supabase] Error al guardar celdas:`, celdasError);
            }
          }
        } catch (sheetError) {
          console.error(`❌ [Supabase] Error procesando hoja ${sheet.titulo}:`, sheetError);
        }
      }
      
      // Sincronizar presentaciones
      for (const slide of datosSlides) {
        console.log(`🔄 [Supabase] Sincronizando presentación: ${slide.titulo} (${slide.googleId})`);
        
        try {
          // Guardar slide
          const slideData: Omit<Slide, 'id'> = {
            proyecto_id: proyectoId,
            google_presentation_id: slide.googleId,
            titulo: slide.titulo || 'Presentación sin título',
            nombre: slide.nombre || null,
            url: slide.url || null,
            google_id: slide.googleId,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          };
          
          const slideId = await SlidesAPI.guardarSlide(slideData);
          
          if (!slideId) {
            console.error(`❌ [Supabase] Error al guardar presentación: ${slide.titulo}`);
            continue;
          }
          
          resultado.slides[slide.googleId] = slideId;
          console.log(`✅ [Supabase] Presentación guardada con ID: ${slideId}`);
          
          // También llamar al API REST para asegurar la sincronización
          try {
            const apiResult = await fetch('/api/slides', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proyectoId: proyectoId,
                slidesId: slide.googleId,
                titulo: slide.titulo,
                url: `https://docs.google.com/presentation/d/${slide.googleId}/edit`
              })
            });
            
            if (!apiResult.ok) {
              console.warn(`⚠️ [Supabase] Advertencia en API REST para slide: ${await apiResult.text()}`);
            } else {
              console.log(`✅ [Supabase] Sincronización via API REST exitosa para slide`);
            }
          } catch (apiError) {
            console.warn(`⚠️ [Supabase] Error al sincronizar con API REST para slide:`, apiError);
          }
          
          // Guardar diapositivas y elementos
          if (slide.diapositivas && slide.diapositivas.length > 0) {
            console.log(`🔄 [Supabase] Guardando ${slide.diapositivas.length} diapositivas para presentación: ${slide.titulo}`);
            
            for (const diapositiva of slide.diapositivas) {
              try {
                // Guardar diapositiva
                console.log(`🔄 [Supabase] Guardando diapositiva: ${diapositiva.id} para slide ${slideId}`);
                
                const diapositivaData = {
                  slides_id: slideId,
                  diapositiva_id: diapositiva.id,
                  titulo: diapositiva.titulo || `Diapositiva ${diapositiva.orden || 0}`,
                  orden: diapositiva.orden,
                  google_presentation_id: slide.googleId // Añadir google_presentation_id para referencias
                };
                
                const diapositivaId = await SlidesAPI.guardarDiapositiva(diapositivaData);
                
                if (!diapositivaId) {
                  console.error(`❌ [Supabase] Error al guardar diapositiva: ${diapositiva.id}`);
                  continue;
                }
                
                console.log(`✅ [Supabase] Diapositiva guardada con ID: ${diapositivaId}`);
                
                // Guardar elementos
                if (diapositiva.elementos && diapositiva.elementos.length > 0) {
                  console.log(`🔄 [Supabase] Guardando ${diapositiva.elementos.length} elementos para diapositiva: ${diapositiva.id}`);
                  
                  for (const elemento of diapositiva.elementos) {
                    try {
                      // Guardar elemento
                      console.log(`🔄 [Supabase] Guardando elemento: ${elemento.id} para diapositiva ${diapositivaId}`);
                      
                      const elementoData = {
                        diapositiva_id: diapositivaId,
                        elemento_id: elemento.id,
                        tipo: elemento.tipo,
                        contenido: elemento.contenido || '',
                        posicion: elemento.posicion || {},
                        estilo: elemento.estilo || {}
                      };
                      
                      const elementoId = await ElementosAPI.guardarElemento(elementoData);
                      
                      if (!elementoId) {
                        console.error(`❌ [Supabase] Error al guardar elemento: ${elemento.id}`);
                        continue;
                      }
                      
                      console.log(`✅ [Supabase] Elemento guardado con ID: ${elementoId}`);
                      resultado.elementos++;
                      
                      // Guardar asociaciones
                      if (elemento.asociaciones && elemento.asociaciones.length > 0) {
                        console.log(`🔄 [Supabase] Guardando ${elemento.asociaciones.length} asociaciones para elemento: ${elemento.id}`);
                        
                        for (const asociacion of elemento.asociaciones) {
                          try {
                            // Obtener el UUID del sheet a partir del googleId
                            const sheetId = resultado.sheets[asociacion.sheetId];
                            
                            if (!sheetId) {
                              console.error(`❌ [Supabase] No se encontró UUID para sheet: ${asociacion.sheetId}`);
                              continue;
                            }
                            
                            // Guardar asociación
                            console.log(`🔄 [Supabase] Guardando asociación: elemento ${elementoId} con sheet ${sheetId}, columna ${asociacion.columna}`);
                            
                            const asociacionId = await ElementosAPI.guardarAsociacion({
                              elemento_id: elementoId,
                              sheets_id: sheetId,
                              columna: asociacion.columna,
                              tipo: asociacion.tipo || 'texto'
                            });
                            
                            if (asociacionId) {
                              console.log(`✅ [Supabase] Asociación guardada con ID: ${asociacionId}`);
                              resultado.asociaciones++;
                            } else {
                              console.error(`❌ [Supabase] Error al guardar asociación`);
                            }
                          } catch (asociacionError) {
                            console.error(`❌ [Supabase] Error procesando asociación:`, asociacionError);
                          }
                        }
                      }
                    } catch (elementoError) {
                      console.error(`❌ [Supabase] Error procesando elemento ${elemento.id}:`, elementoError);
                    }
                  }
                }
              } catch (diapositivaError) {
                console.error(`❌ [Supabase] Error procesando diapositiva ${diapositiva.id}:`, diapositivaError);
              }
            }
          }
        } catch (slideError) {
          console.error(`❌ [Supabase] Error procesando presentación ${slide.titulo}:`, slideError);
        }
      }
      
      console.log('✅ [Supabase] Sincronización completada:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Supabase] Error al sincronizar proyecto:', error);
      // En caso de error, devolvemos un objeto con valores por defecto
      return {
        sheets: {},
        slides: {},
        celdas: 0,
        elementos: 0,
        asociaciones: 0
      };
    }
  }
}