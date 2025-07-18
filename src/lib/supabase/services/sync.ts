import { supabase, getSupabaseClient } from '../client';
import { handleError } from '../utils/error-handler';
import { 
  DatabaseInitResult, 
  TablesStatus, 
  RPCFunctionsStatus,
  SyncProjectParams,
  SyncProjectResult,
  SyncSheet,
  SyncSlide,
  SyncAssociationsParams,
  SyncAssociationsResult,
  SyncStatus,
  SyncHistory
} from '../types/sync';
import { projectsService } from './projects';
import { sheetsService } from './sheets';
import { slidesService } from './slides';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Servicio para gestionar la sincronización de datos con Supabase
 */
export class SyncService {
  /**
   * Inicializa la base de datos verificando que existan las tablas y funciones RPC necesarias
   * @returns Objeto con el estado de las tablas y funciones RPC
   */
  async initializeDatabase(): Promise<DatabaseInitResult> {
    try {
      console.log('🔄 [Supabase] Iniciando verificación de base de datos');
      
      // Verificar tablas
      const tables = await this.verifyTables();
      
      // Verificar funciones RPC (modo de compatibilidad)
      const rpcFunctions = await this.verifyRpcFunctions();
      
      console.log('✅ [Supabase] Verificación de base de datos completada');
      
      return {
        tables,
        rpcFunctions
      };
    } catch (error) {
      handleError('SyncService.initializeDatabase', error as PostgrestError);
      
      // En lugar de propagar el error, devolvemos un objeto con valores por defecto
      // para permitir que la aplicación continúe funcionando
      return {
        tables: {},
        rpcFunctions: {}
      };
    }
  }

  /**
   * Verifica que existan las tablas necesarias en la base de datos
   * @returns Objeto con el estado de cada tabla
   */
  async verifyTables(): Promise<TablesStatus> {
    try {
      console.log('🔍 [Supabase] Verificando tablas');
      
      const requiredTables = [
        'proyectos',
        'sheets',
        'slides',
        'diapositivas',
        'elementos',
        'celdas',
        'asociaciones'
      ];
      
      const result: TablesStatus = {};
      
      // Verificar cada tabla
      for (const table of requiredTables) {
        result[table] = await this.verifyTable(table);
      }
      
      console.log('✅ [Supabase] Verificación de tablas completada:', result);
      return result;
    } catch (error) {
      handleError('SyncService.verifyTables', error as PostgrestError);
      return {};
    }
  }

  /**
   * Verifica que existan las funciones RPC necesarias en la base de datos
   * @returns Objeto con el estado de cada función RPC
   */
  async verifyRpcFunctions(): Promise<RPCFunctionsStatus> {
    try {
      console.log('🔍 [Supabase] Verificando funciones RPC');
      
      const requiredFunctions = [
        'guardar_celdas',
        'guardar_celdas_google'
      ];
      
      const result: RPCFunctionsStatus = {};
      
      // Verificar cada función RPC
      for (const funcName of requiredFunctions) {
        try {
          // Intentar llamar a la función con parámetros mínimos
          const { supabase } = await getSupabaseClient();
          const { error } = await supabase.rpc(funcName, {
            p_sheet_id: '00000000-0000-0000-0000-000000000000',
            p_celdas: '[]',
            p_google_id: '00000000-0000-0000-0000-000000000000'
          });
          
          // Si no hay error de tipo "función no existe", consideramos que la función existe
          // Puede haber otros errores (como parámetros incorrectos) pero eso no significa que la función no exista
          result[funcName] = !error || !error.message.includes('function does not exist');
        } catch (e) {
          result[funcName] = false;
        }
      }
      
      console.log('✅ [Supabase] Verificación de funciones RPC completada:', result);
      return result;
    } catch (error) {
      handleError('SyncService.verifyRpcFunctions', error as PostgrestError);
      return {};
    }
  }

  /**
   * Verifica si existe una tabla específica en la base de datos
   * @param tableName Nombre de la tabla a verificar
   * @returns true si la tabla existe, false si no existe
   */
  async verifyTable(tableName: string): Promise<boolean> {
    try {
      console.log(`🔍 [Supabase] Verificando tabla: ${tableName}`);
      
      // Intentar hacer una consulta simple a la tabla
      const { supabase } = await getSupabaseClient();
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      // Si hay un error que indica que la tabla no existe, retornamos false
      if (error && (
        error.message.includes('relation') && 
        error.message.includes('does not exist')
      )) {
        console.log(`⚠️ [Supabase] Tabla ${tableName} no existe`);
        return false;
      }
      
      // Si hay otro tipo de error, asumimos que la tabla existe pero hay otro problema
      if (error) {
        console.warn(`⚠️ [Supabase] Error al verificar tabla ${tableName}:`, error);
        // Asumimos que la tabla existe pero hay otro problema
        return true;
      }
      
      console.log(`✅ [Supabase] Tabla ${tableName} existe`);
      return true;
    } catch (error) {
      handleError(`SyncService.verifyTable(${tableName})`, error as PostgrestError);
      return false;
    }
  }

  /**
   * Sincroniza un proyecto con sus hojas de cálculo y presentaciones
   * @param params Parámetros para la sincronización del proyecto
   * @returns Resultado de la sincronización
   */
  async syncProject(params: SyncProjectParams): Promise<SyncProjectResult> {
    try {
      console.log('🔄 [Supabase] Iniciando sincronización de proyecto:', params.projectId);
      
      // Verificar que el proyecto existe
      const project = await projectsService.getProjectById(params.projectId);
      
      if (!project) {
        throw new Error(`Proyecto no encontrado: ${params.projectId}`);
      }
      
      // Resultado que vamos a devolver
      const result: SyncProjectResult = {
        sheets: {},
        slides: {},
        cells: 0,
        elements: 0,
        associations: 0
      };
      
      // Sincronizar hojas de cálculo
      await this.syncSheets(params.projectId, params.sheets, result);
      
      // Sincronizar presentaciones
      await this.syncSlides(params.projectId, params.slides, result);
      
      // Actualizar la fecha de la última sincronización del proyecto
      await projectsService.updateProject(params.projectId, {
        last_sync: new Date().toISOString()
      });
      
      console.log('✅ [Supabase] Sincronización completada con éxito:', result);
      return result;
    } catch (error) {
      handleError('SyncService.syncProject', error as PostgrestError);
      // Devolver un resultado vacío
      return {
        sheets: {},
        slides: {},
        cells: 0,
        elements: 0,
        associations: 0
      };
    }
  }

  /**
   * Sincroniza hojas de cálculo de un proyecto
   * @param projectId ID del proyecto
   * @param sheets Hojas de cálculo a sincronizar
   * @param result Objeto de resultado para actualizar
   */
  private async syncSheets(projectId: string, sheets: SyncSheet[], result: SyncProjectResult): Promise<void> {
    try {
      for (const sheet of sheets) {
        console.log(`🔄 [Supabase] Sincronizando hoja: ${sheet.title} (${sheet.googleId})`);
        
        // Crear o actualizar la hoja de cálculo
        const sheetId = await sheetsService.createSheet({
          proyecto_id: projectId,
          sheets_id: sheet.googleId,
          google_id: sheet.googleId,
          titulo: sheet.title,
          url: `https://docs.google.com/spreadsheets/d/${sheet.googleId}/edit`
        });
        
        if (!sheetId) {
          console.error(`❌ [Supabase] Error al guardar hoja: ${sheet.title}`);
          continue;
        }
        
        result.sheets[sheet.googleId] = sheetId;
        console.log(`✅ [Supabase] Hoja guardada con ID: ${sheetId}`);
        
        // Sincronizar celdas
        if (sheet.cells && sheet.cells.length > 0) {
          const { supabase } = await getSupabaseClient();
          const { data, error } = await supabase.rpc('guardar_celdas', {
            p_sheet_id: sheetId,
            p_celdas: JSON.stringify(sheet.cells),
            p_google_id: sheet.googleId
          });
          
          if (error) {
            console.error(`❌ [Supabase] Error al guardar celdas:`, error);
          } else {
            result.cells += sheet.cells.length;
            console.log(`✅ [Supabase] Celdas guardadas: ${sheet.cells.length}`);
          }
        }
      }
    } catch (error) {
      handleError('SyncService.syncSheets', error as PostgrestError);
    }
  }

  /**
   * Sincroniza presentaciones de un proyecto
   * @param projectId ID del proyecto
   * @param slides Presentaciones a sincronizar
   * @param result Objeto de resultado para actualizar
   */
  private async syncSlides(projectId: string, slides: SyncSlide[], result: SyncProjectResult): Promise<void> {
    try {
      for (const slide of slides) {
        console.log(`🔄 [Supabase] Sincronizando presentación: ${slide.title} (${slide.googleId})`);
        
        // Crear o actualizar la presentación
        const slideId = await slidesService.createSlide({
          proyecto_id: projectId,
          google_presentation_id: slide.googleId,
          slides_id: slide.googleId,
          google_id: slide.googleId,
          titulo: slide.title,
          url: `https://docs.google.com/presentation/d/${slide.googleId}/edit`
        });
        
        if (!slideId) {
          console.error(`❌ [Supabase] Error al guardar presentación: ${slide.title}`);
          continue;
        }
        
        result.slides[slide.googleId] = slideId;
        console.log(`✅ [Supabase] Presentación guardada con ID: ${slideId}`);
        
        // Sincronizar elementos
        if (slide.elements && slide.elements.length > 0) {
          const { supabase } = await getSupabaseClient();
          const { data, error } = await supabase
            .from('elementos')
            .upsert(
              slide.elements.map(element => ({
                slide_id: slideId,
                elemento_id: element.elementId,
                tipo: element.type,
                contenido: element.content,
                posicion: element.position,
                estilo: element.style
              }))
            );
          
          if (error) {
            console.error(`❌ [Supabase] Error al guardar elementos:`, error);
          } else {
            result.elements += slide.elements.length;
            console.log(`✅ [Supabase] Elementos guardados: ${slide.elements.length}`);
          }
        }
      }
    } catch (error) {
      handleError('SyncService.syncSlides', error as PostgrestError);
    }
  }

  /**
   * Sincroniza asociaciones entre elementos y celdas
   * @param params Parámetros para la sincronización de asociaciones
   * @returns Resultado de la sincronización
   */
  async syncAssociations(params: SyncAssociationsParams): Promise<SyncAssociationsResult> {
    try {
      console.log('🔄 [Supabase] Iniciando sincronización de asociaciones');
      
      const result: SyncAssociationsResult = {
        created: 0,
        updated: 0,
        deleted: 0,
        errors: []
      };
      
      // Si se solicita eliminar asociaciones existentes
      if (params.deleteExisting) {
        const { supabase } = await getSupabaseClient();
        const { error: deleteError } = await supabase
          .from('asociaciones')
          .delete()
          .eq('sheet_id', params.sheetId);
          
        if (deleteError) {
          console.error('❌ [Supabase] Error al eliminar asociaciones:', deleteError);
          result.errors.push({
            message: 'Error al eliminar asociaciones existentes',
            details: deleteError.message
          });
        }
      }
      
      // Procesar cada elemento
      for (const element of params.elements) {
        try {
          // Buscar si ya existe la asociación
          const { supabase } = await getSupabaseClient();
          const { data: existing, error: searchError } = await supabase
            .from('asociaciones')
            .select('id')
            .eq('sheet_id', params.sheetId)
            .eq('elemento_id', element.elementId)
            .single();
            
          if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no se encontró el registro
            throw searchError;
          }
          
          // Datos de la asociación
          const associationData = {
            sheet_id: params.sheetId,
            elemento_id: element.elementId,
            celda_id: element.cellId || null,
            fila_id: params.rowId || null,
            tipo_asociacion: element.type || 'manual',
            configuracion: element.config || {},
            ultima_actualizacion: new Date().toISOString()
          };
          
          if (existing) {
            // Actualizar asociación existente
            const { error: updateError } = await supabase
              .from('asociaciones')
              .update(associationData)
              .eq('id', existing.id);
              
            if (updateError) {
              throw updateError;
            }
            
            result.updated++;
          } else {
            // Crear nueva asociación
            const { error: insertError } = await supabase
              .from('asociaciones')
              .insert(associationData);
              
            if (insertError) {
              throw insertError;
            }
            
            result.created++;
          }
        } catch (error) {
          console.error(`❌ [Supabase] Error al procesar elemento ${element.elementId}:`, error);
          result.errors.push({
            message: `Error al procesar elemento ${element.elementId}`,
            details: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      
      console.log('✅ [Supabase] Sincronización de asociaciones completada:', result);
      return result;
    } catch (error) {
      handleError('SyncService.syncAssociations', error as PostgrestError);
      return {
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [{
          message: 'Error general en sincronización',
          details: error instanceof Error ? error.message : 'Error desconocido'
        }]
      };
    }
  }
}

// Exportar una instancia por defecto
export const syncService = new SyncService(); 