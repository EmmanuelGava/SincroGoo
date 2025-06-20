import { supabase, getSupabaseClient } from '../client';
import { handleError, formatErrorResponse } from '../utils/error-handler';
import type { 
  Sheet, 
  SheetCell,
  SheetCreateParams, 
  SheetUpdateParams,
  SheetCellCreateParams,
  SheetCellUpdateParams,
  SheetListOptions,
  SheetCellListOptions
} from '../types/sheets';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Servicio para gestionar hojas de cálculo y sus celdas
 */
export class SheetsService {
  /**
   * Formatea un error para logging
   */
  private formatError(method: string, error: unknown): string {
    if (error instanceof Error) {
      return `${method}: ${error.message}`;
    }
    return `${method}: ${String(error)}`;
  }

  /**
   * Obtiene la lista de hojas de cálculo con opciones de filtrado
   * @param options Opciones para filtrar y paginar resultados
   * @returns Array de hojas de cálculo o array vacío si hay error
   */
  async listSheets(options: SheetListOptions = {}): Promise<Sheet[]> {
    try {
      const { 
        proyecto_id, 
        busqueda, 
        ordenPor = 'created_at', 
        orden = 'desc',
        pagina = 1,
        porPagina = 20
      } = options;
      
      const { supabase } = await getSupabaseClient();
      let query = supabase.from('sheets').select('*');
      
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
      
      // Mapear resultados a formato Sheet
      return data.map(item => ({
        id: item.id,
        proyecto_id: item.proyecto_id,
        sheets_id: item.sheets_id,
        nombre: item.nombre || undefined,
        titulo: item.titulo || undefined,
        google_id: item.google_id || undefined,
        url: item.url || undefined,
        ultima_sincronizacion: item.ultima_sincronizacion || undefined,
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion,
        metadata: item.metadata || {}
      }));
    } catch (error) {
      handleError('SheetsService.listSheets', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Obtiene una hoja de cálculo por su ID
   * @param sheetId ID de la hoja de cálculo
   * @returns Hoja de cálculo o null si no existe o hay error
   */
  async getSheetById(sheetId: string): Promise<Sheet | null> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Consulta básica
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('id', sheetId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la hoja
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato Sheet
      return {
        id: data.id,
        proyecto_id: data.proyecto_id,
        sheets_id: data.sheets_id,
        nombre: data.nombre || undefined,
        titulo: data.titulo || undefined,
        google_id: data.google_id || undefined,
        url: data.url || undefined,
        ultima_sincronizacion: data.ultima_sincronizacion || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: data.metadata || {}
      };
    } catch (error) {
      handleError('SheetsService.getSheetById', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Obtiene una hoja de cálculo por su Google ID
   * @param googleId Google ID de la hoja
   * @returns Hoja de cálculo o null si no existe o hay error
   */
  async getSheetByGoogleId(googleId: string): Promise<Sheet | null> {
    try {
      if (!googleId) {
        throw new Error('Google ID no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Consulta por google_id
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('google_id', googleId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la hoja
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato Sheet
      return {
        id: data.id,
        proyecto_id: data.proyecto_id,
        sheets_id: data.sheets_id,
        nombre: data.nombre || undefined,
        titulo: data.titulo || undefined,
        google_id: data.google_id || undefined,
        url: data.url || undefined,
        ultima_sincronizacion: data.ultima_sincronizacion || undefined,
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion,
        metadata: data.metadata || {}
      };
    } catch (error) {
      handleError('SheetsService.getSheetByGoogleId', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Crea una nueva hoja de cálculo
   * @param params Datos de la hoja a crear
   * @returns ID de la hoja creada o null si hay error
   */
  async createSheet(params: SheetCreateParams): Promise<string | null> {
    try {
      // Verificar si ya existe una hoja con el mismo google_id (si se proporciona)
      if (params.google_id) {
        const existingSheet = await this.getSheetByGoogleId(params.google_id);
        if (existingSheet) {
          // Actualizar la hoja existente
          const updated = await this.updateSheet(existingSheet.id, {
            nombre: params.nombre,
            titulo: params.titulo,
            url: params.url,
            metadata: params.metadata
          });
          
          return updated ? existingSheet.id : null;
        }
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Preparar datos para inserción
      const sheetData = {
        proyecto_id: params.proyecto_id,
        sheets_id: params.sheets_id,
        nombre: params.nombre || null,
        titulo: params.titulo || null,
        google_id: params.google_id || null,
        url: params.url || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        metadata: params.metadata || null
      };
      
      // Insertar hoja
      const { data, error } = await supabase
        .from('sheets')
        .insert(sheetData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SheetsService.createSheet', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Actualiza una hoja de cálculo existente
   * @param sheetId ID de la hoja
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateSheet(sheetId: string, params: SheetUpdateParams): Promise<boolean> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Preparar datos para actualización
      const updateData: Record<string, any> = {
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Añadir campos opcionales si están definidos
      if (params.nombre !== undefined) updateData.nombre = params.nombre;
      if (params.titulo !== undefined) updateData.titulo = params.titulo;
      if (params.ultima_sincronizacion !== undefined) updateData.ultima_sincronizacion = params.ultima_sincronizacion;
      if (params.google_id !== undefined) updateData.google_id = params.google_id;
      if (params.url !== undefined) updateData.url = params.url;
      if (params.metadata !== undefined) updateData.metadata = params.metadata;
      
      // Actualizar hoja
      const { error } = await supabase
        .from('sheets')
        .update(updateData)
        .eq('id', sheetId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.updateSheet', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Elimina una hoja de cálculo
   * @param sheetId ID de la hoja
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteSheet(sheetId: string): Promise<boolean> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Eliminar hoja
      const { error } = await supabase
        .from('sheets')
        .delete()
        .eq('id', sheetId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.deleteSheet', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Obtiene las celdas de una hoja de cálculo
   * @param options Opciones para filtrar las celdas
   * @returns Array de celdas o array vacío si hay error
   */
  async listCells(options: SheetCellListOptions): Promise<SheetCell[]> {
    try {
      if (!options.sheet_id) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      let query = supabase
        .from('celdas')
        .select('*')
        .eq('sheet_id', options.sheet_id);
      
      // Aplicar filtros opcionales
      if (options.filaInicio !== undefined) {
        query = query.gte('fila', options.filaInicio);
      }
      
      if (options.filaFin !== undefined) {
        query = query.lte('fila', options.filaFin);
      }
      
      if (options.columnas && options.columnas.length > 0) {
        query = query.in('columna', options.columnas);
      }
      
      // Ordenar por fila y columna para resultados predecibles
      query = query.order('fila', { ascending: true }).order('columna', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SheetCell
      return data.map(item => ({
        id: item.id,
        sheet_id: item.sheet_id,
        fila: item.fila,
        columna: item.columna,
        referencia_celda: item.referencia_celda,
        contenido: item.contenido || undefined,
        tipo: item.tipo as any || 'texto',
        formato: item.formato || {},
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion
      }));
    } catch (error) {
      handleError('SheetsService.listCells', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Crea o actualiza múltiples celdas en una hoja de cálculo
   * @param sheetId ID de la hoja
   * @param cells Array de celdas a crear o actualizar
   * @returns Array de IDs de celdas creadas/actualizadas o null si hay error
   */
  async upsertCells(sheetId: string, cells: SheetCellCreateParams[]): Promise<string[] | null> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      if (!cells || cells.length === 0) {
        return [];
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Preparar datos para upsert
      const cellsData = cells.map(cell => ({
        sheet_id: sheetId,
        fila: cell.fila,
        columna: cell.columna,
        referencia_celda: cell.referencia_celda,
        contenido: cell.contenido || null,
        tipo: cell.tipo || 'texto',
        formato: cell.formato || {},
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      }));
      
      // Upsert celdas (usando ON CONFLICT)
      const { error } = await supabase
        .from('celdas')
        .upsert(cellsData, { 
          onConflict: 'sheet_id,fila,columna'
        });
      
      if (error) {
        throw error;
      }
      
      // Consultar las celdas que acabamos de insertar/actualizar
      const cellReferences = cells.map(c => c.referencia_celda);
      const { data: insertedCells, error: fetchError } = await supabase
        .from('celdas')
        .select('id')
        .eq('sheet_id', sheetId)
        .in('referencia_celda', cellReferences);
      
      if (fetchError) {
        throw fetchError;
      }
      
      return insertedCells ? insertedCells.map(cell => cell.id) : [];
    } catch (error) {
      handleError('SheetsService.upsertCells', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Actualiza una celda específica
   * @param cellId ID de la celda
   * @param params Datos a actualizar
   * @returns true si se actualizó correctamente, false si hay error
   */
  async updateCell(cellId: string, params: SheetCellUpdateParams): Promise<boolean> {
    try {
      if (!cellId) {
        throw new Error('ID de celda no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Preparar datos para actualización
      const updateData: Record<string, any> = {
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Añadir campos opcionales si están definidos
      if (params.contenido !== undefined) updateData.contenido = params.contenido;
      if (params.tipo !== undefined) updateData.tipo = params.tipo;
      if (params.formato !== undefined) updateData.formato = params.formato;
      
      // Actualizar celda
      const { error } = await supabase
        .from('celdas')
        .update(updateData)
        .eq('id', cellId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.updateCell', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Elimina todas las celdas de una hoja
   * @param sheetId ID de la hoja
   * @returns true si se eliminaron correctamente, false si hay error
   */
  async deleteCellsBySheetId(sheetId: string): Promise<boolean> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja de cálculo no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Eliminar celdas
      const { error } = await supabase
        .from('celdas')
        .delete()
        .eq('sheet_id', sheetId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.deleteCellsBySheetId', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Obtiene una celda específica por su ID
   * @param cellId ID de la celda
   * @returns Celda o null si no existe o hay error
   */
  async getCellById(cellId: string): Promise<SheetCell | null> {
    try {
      if (!cellId) {
        throw new Error('ID de celda no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('celdas')
        .select('*')
        .eq('id', cellId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la celda
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato SheetCell
      return {
        id: data.id,
        sheet_id: data.sheet_id,
        fila: data.fila,
        columna: data.columna,
        referencia_celda: data.referencia_celda,
        contenido: data.contenido || undefined,
        tipo: data.tipo || undefined,
        formato: data.formato || {},
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion
      };
    } catch (error) {
      handleError('SheetsService.getCellById', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Obtiene una celda por su referencia (A1, B2, etc.)
   * @param sheetId ID de la hoja
   * @param referencia Referencia de la celda (A1, B2, etc.)
   * @returns Celda o null si no existe o hay error
   */
  async getCellByReference(sheetId: string, referencia: string): Promise<SheetCell | null> {
    try {
      if (!sheetId || !referencia) {
        throw new Error('ID de hoja o referencia no proporcionados');
      }
      
      const { supabase } = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('celdas')
        .select('*')
        .eq('sheet_id', sheetId)
        .eq('referencia_celda', referencia)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la celda
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Mapear resultado a formato SheetCell
      return {
        id: data.id,
        sheet_id: data.sheet_id,
        fila: data.fila,
        columna: data.columna,
        referencia_celda: data.referencia_celda,
        contenido: data.contenido || undefined,
        tipo: data.tipo || undefined,
        formato: data.formato || {},
        created_at: data.fecha_creacion,
        updated_at: data.fecha_actualizacion
      };
    } catch (error) {
      handleError('SheetsService.getCellByReference', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Obtiene celdas por fila
   * @param sheetId ID de la hoja
   * @param fila Número de fila
   * @returns Array de celdas o array vacío si hay error
   */
  async getCellsByRow(sheetId: string, fila: number): Promise<SheetCell[]> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('celdas')
        .select('*')
        .eq('sheet_id', sheetId)
        .eq('fila', fila)
        .order('columna');
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SheetCell
      return (data || []).map(item => ({
        id: item.id,
        sheet_id: item.sheet_id,
        fila: item.fila,
        columna: item.columna,
        referencia_celda: item.referencia_celda,
        contenido: item.contenido || undefined,
        tipo: item.tipo || undefined,
        formato: item.formato || {},
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion
      }));
    } catch (error) {
      handleError('SheetsService.getCellsByRow', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Obtiene celdas por columna
   * @param sheetId ID de la hoja
   * @param columna Letra de columna (A, B, C, etc.)
   * @returns Array de celdas o array vacío si hay error
   */
  async getCellsByColumn(sheetId: string, columna: string): Promise<SheetCell[]> {
    try {
      if (!sheetId || !columna) {
        throw new Error('ID de hoja o columna no proporcionados');
      }
      
      const { supabase } = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('celdas')
        .select('*')
        .eq('sheet_id', sheetId)
        .eq('columna', columna)
        .order('fila');
      
      if (error) {
        throw error;
      }
      
      // Mapear resultados a formato SheetCell
      return (data || []).map(item => ({
        id: item.id,
        sheet_id: item.sheet_id,
        fila: item.fila,
        columna: item.columna,
        referencia_celda: item.referencia_celda,
        contenido: item.contenido || undefined,
        tipo: item.tipo || undefined,
        formato: item.formato || {},
        created_at: item.fecha_creacion,
        updated_at: item.fecha_actualizacion
      }));
    } catch (error) {
      handleError('SheetsService.getCellsByColumn', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Crea una nueva celda
   * @param params Datos de la celda a crear
   * @returns ID de la celda creada o null si hay error
   */
  async createCell(params: SheetCellCreateParams): Promise<string | null> {
    try {
      if (!params.sheet_id || !params.referencia_celda) {
        throw new Error('ID de hoja o referencia de celda no proporcionados');
      }
      
      const { supabase } = await getSupabaseClient();
      
      // Verificar si ya existe una celda con la misma referencia
      const existingCell = await this.getCellByReference(params.sheet_id, params.referencia_celda);
      
      if (existingCell) {
        // Actualizar la celda existente
        const updated = await this.updateCell(existingCell.id, {
          contenido: params.contenido,
          tipo: params.tipo,
          formato: params.formato
        });
        
        return updated ? existingCell.id : null;
      }
      
      // Preparar datos para inserción
      const cellData = {
        sheet_id: params.sheet_id,
        fila: params.fila,
        columna: params.columna,
        referencia_celda: params.referencia_celda,
        contenido: params.contenido || null,
        tipo: params.tipo || null,
        formato: params.formato || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Insertar celda
      const { data, error } = await supabase
        .from('celdas')
        .insert(cellData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      handleError('SheetsService.createCell', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Elimina una celda por su ID
   * @param cellId ID de la celda
   * @returns true si se eliminó correctamente, false si hay error
   */
  async deleteCell(cellId: string): Promise<boolean> {
    try {
      if (!cellId) {
        throw new Error('ID de celda no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      
      const { error } = await supabase
        .from('celdas')
        .delete()
        .eq('id', cellId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.deleteCell', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Elimina celdas por rango
   * @param sheetId ID de la hoja
   * @param filaInicio Fila de inicio
   * @param filaFin Fila de fin
   * @param columnasInicio Columna de inicio (A, B, etc.)
   * @param columnasFin Columna de fin (A, B, etc.)
   * @returns true si se eliminaron correctamente, false si hay error
   */
  async deleteCellsByRange(
    sheetId: string, 
    filaInicio: number, 
    filaFin: number,
    columnaInicio?: string,
    columnaFin?: string
  ): Promise<boolean> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja no proporcionado');
      }
      
      const { supabase } = await getSupabaseClient();
      let query = supabase
        .from('celdas')
        .delete()
        .eq('sheet_id', sheetId)
        .gte('fila', filaInicio)
        .lte('fila', filaFin);
      
      // Si se proporcionan columnas, filtrar por columnas
      if (columnaInicio && columnaFin) {
        query = query.gte('columna', columnaInicio).lte('columna', columnaFin);
      } else if (columnaInicio) {
        query = query.eq('columna', columnaInicio);
      }
      
      const { error } = await query;
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      handleError('SheetsService.deleteCellsByRange', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Exporta la hoja de cálculo como CSV
   * @param sheetId ID de la hoja
   * @returns Contenido CSV o null si hay error
   */
  async exportAsCSV(sheetId: string): Promise<string | null> {
    try {
      if (!sheetId) {
        throw new Error('ID de hoja no proporcionado');
      }
      
      // Obtener todas las celdas de la hoja
      const cells = await this.listCells({ sheet_id: sheetId });
      
      if (!cells || cells.length === 0) {
        return '';
      }
      
      // Agrupar por filas
      const rows: Record<number, Record<string, string>> = {};
      const columnas = new Set<string>();
      
      cells.forEach(cell => {
        if (!rows[cell.fila]) {
          rows[cell.fila] = {};
        }
        rows[cell.fila][cell.columna] = cell.contenido || '';
        columnas.add(cell.columna);
      });
      
      // Ordenar columnas
      const columnasOrdenadas = Array.from(columnas).sort();
      
      // Generar CSV
      let csv = columnasOrdenadas.join(',') + '\n';
      
      // Ordenar filas
      const filas = Object.keys(rows).map(Number).sort((a, b) => a - b);
      
      filas.forEach(fila => {
        const rowData = columnasOrdenadas.map(col => {
          const valor = rows[fila][col] || '';
          // Escapar comillas y valores con comas
          if (valor.includes('"') || valor.includes(',')) {
            return `"${valor.replace(/"/g, '""')}"`;
          }
          return valor;
        });
        csv += rowData.join(',') + '\n';
      });
      
      return csv;
    } catch (error) {
      handleError('SheetsService.exportAsCSV', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Obtiene el total de hojas que coinciden con los criterios de búsqueda
   * @param options Opciones de filtrado
   * @returns Total de hojas o 0 si hay error
   */
  async countSheets(options: Omit<SheetListOptions, 'pagina' | 'porPagina'> = {}): Promise<number> {
    try {
      const { proyecto_id, busqueda } = options;
      
      let query = supabase
        .from('sheets')
        .select('*', { count: 'exact', head: true });
      
      if (proyecto_id) {
        query = query.eq('proyecto_id', proyecto_id);
      }
      
      if (busqueda) {
        query = query.or(`titulo.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%`);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      handleError('SheetsService.countSheets', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Obtiene una hoja con todas sus celdas
   * @param sheetId ID de la hoja
   * @returns Hoja con array de celdas o null si hay error
   */
  async getSheetWithCells(sheetId: string): Promise<(Sheet & { celdas: SheetCell[] }) | null> {
    try {
      // Primero obtener la hoja
      const sheet = await this.getSheetById(sheetId);
      if (!sheet) return null;
      
      // Luego obtener todas las celdas
      const { data: celdas, error } = await supabase
        .from('celdas')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('fila', { ascending: true })
        .order('columna', { ascending: true });
      
      if (error) throw error;
      
      return {
        ...sheet,
        celdas: celdas || []
      };
    } catch (error) {
      handleError('SheetsService.getSheetWithCells', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Actualiza múltiples celdas en una sola operación
   * @param sheetId ID de la hoja
   * @param updates Array de actualizaciones de celdas
   * @returns true si todas las actualizaciones fueron exitosas
   */
  async bulkUpdateCells(
    sheetId: string, 
    updates: Array<{ referencia: string; cambios: SheetCellUpdateParams }>
  ): Promise<boolean> {
    try {
      const { supabase } = await getSupabaseClient();
      
      // Iniciar transacción
      const { error: txError } = await supabase.rpc('begin_transaction');
      if (txError) throw txError;
      
      try {
        for (const update of updates) {
          // Obtener celda por referencia
          const celda = await this.getCellByReference(sheetId, update.referencia);
          if (!celda) continue;
          
          // Actualizar celda
          const { error } = await supabase
            .from('celdas')
            .update({
              ...update.cambios,
              fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', celda.id);
          
          if (error) throw error;
        }
        
        // Confirmar transacción
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) throw commitError;
        
        return true;
      } catch (error) {
        // Revertir transacción en caso de error
        await supabase.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      handleError('SheetsService.bulkUpdateCells', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Importa datos desde un string CSV
   * @param sheetId ID de la hoja
   * @param csvContent Contenido CSV
   * @param options Opciones de importación
   * @returns true si la importación fue exitosa
   */
  async importFromCSV(
    sheetId: string, 
    csvContent: string,
    options: { 
      delimiter?: string;
      hasHeaders?: boolean;
      startRow?: number;
      startColumn?: string;
    } = {}
  ): Promise<boolean> {
    try {
      const {
        delimiter = ',',
        hasHeaders = true,
        startRow = 1,
        startColumn = 'A'
      } = options;
      
      // Parsear CSV
      const rows = csvContent
        .split('\n')
        .map(row => row.split(delimiter));
      
      // Preparar celdas para inserción
      const cells: SheetCellCreateParams[] = [];
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      
      dataRows.forEach((row, rowIndex) => {
        row.forEach((content, colIndex) => {
          const colLetter = String.fromCharCode(startColumn.charCodeAt(0) + colIndex);
          const rowNumber = startRow + rowIndex;
          
          cells.push({
            sheet_id: sheetId,
            fila: rowNumber,
            columna: colLetter,
            referencia_celda: `${colLetter}${rowNumber}`,
            contenido: content,
            tipo: isNaN(Number(content)) ? 'texto' : 'numero',
            valor: isNaN(Number(content)) ? content : Number(content)
          });
        });
      });
      
      // Insertar celdas
      const result = await this.upsertCells(sheetId, cells);
      return result !== null;
    } catch (error) {
      handleError('SheetsService.importFromCSV', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Valida el formato y contenido de una celda
   * @param params Datos de la celda a validar
   * @returns Objeto con resultado de validación
   */
  validateCell(params: SheetCellCreateParams | SheetCellUpdateParams): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];
    
    // Validar tipo de celda
    if (params.tipo && !['texto', 'numero', 'formula', 'fecha', 'boolean'].includes(params.tipo)) {
      errors.push('Tipo de celda inválido');
    }
    
    // Validar formato de referencia (si existe)
    if ('referencia_celda' in params) {
      const refRegex = /^[A-Z]+[1-9][0-9]*$/;
      if (!refRegex.test(params.referencia_celda)) {
        errors.push('Formato de referencia inválido');
      }
    }
    
    // Validar coherencia entre tipo y valor
    if (params.tipo === 'numero' && params.valor !== undefined) {
      if (typeof params.valor !== 'number') {
        errors.push('El valor debe ser numérico para celdas de tipo número');
      }
    }
    
    // Validar fórmula (si existe)
    if (params.formula) {
      if (!params.formula.startsWith('=')) {
        errors.push('Las fórmulas deben comenzar con =');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Exportar una instancia por defecto
export const sheetsService = new SheetsService(); 