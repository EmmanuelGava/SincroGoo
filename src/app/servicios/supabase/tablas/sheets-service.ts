import { SupabaseService } from '../../../lib/index-service';
import { Sheet } from '../globales/tipos';

/**
 * Operaciones relacionadas con la tabla de sheets utilizando el servicio centralizado
 */
export class SheetsAPI {
  /**
   * Crea un nuevo sheet en la base de datos
   * @param sheet Datos del sheet a crear
   * @returns Sheet creado o null si hay error
   */
  static async crearSheet(sheet: Omit<Sheet, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<Sheet | null> {
    try {
      console.log('🔄 [Sheets Debug] Iniciando creación de sheet:', sheet);
      
      // Verificar que tengamos datos válidos
      if (!sheet.proyecto_id || !sheet.sheets_id || !sheet.titulo) {
        console.error('❌ [Sheets Debug] Datos inválidos para crear sheet');
        return null;
      }
      
      // Verificar si ya existe un sheet con el mismo google_id
      if (sheet.google_id) {
        console.log(`🔍 [Sheets Debug] Verificando si ya existe un sheet con google_id: ${sheet.google_id}`);
        const sheetExistente = await SheetsAPI.obtenerSheetPorGoogleId(sheet.google_id);
        
        if (sheetExistente) {
          console.log(`✅ [Sheets Debug] Sheet ya existe, actualizando: ${sheetExistente.id}`);
          
          // Actualizar el sheet existente
          const { data: dataActualizado, error: errorActualizado } = await SupabaseService.update(
            'sheets',
            { id: sheetExistente.id },
            {
              nombre: sheet.nombre,
              titulo: sheet.titulo
            }
          );
          
          if (errorActualizado) {
            console.error('❌ [Sheets Debug] Error al actualizar sheet:', errorActualizado);
            throw new Error(errorActualizado.message || 'Error al actualizar sheet');
          }
          
          console.log('✅ [Sheets Debug] Sheet actualizado correctamente:', dataActualizado);
          return sheetExistente;
        }
      }
      
      // Ejecutar la consulta a través del servicio centralizado
      console.log('🔄 [Sheets Debug] Insertando nuevo sheet en la base de datos:', sheet);
      const { data, error } = await SupabaseService.insert<Sheet>(
        'sheets',
        {
          ...sheet,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        }
      );
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al crear sheet:', error);
        throw new Error(error.message || 'Error al crear sheet');
      }
      
      if (!data) {
        console.error('❌ [Sheets Debug] No se pudo crear el sheet, respuesta vacía');
        return null;
      }
      
      console.log('✅ [Sheets Debug] Sheet creado correctamente:', data);
      return data;
    } catch (error) {
      console.error('❌ [Sheets Debug] Error inesperado al crear sheet:', error);
      return null;
    }
  }
  
  /**
   * Obtiene un sheet por su UUID
   * @param sheetId UUID del sheet
   * @returns Sheet o null si no existe
   */
  static async obtenerSheet(sheetId: string): Promise<Sheet | null> {
    try {
      console.log('🔍 [Sheets Debug] Obteniendo sheet por ID:', sheetId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.from('sheets')
        .select('*')
        .eq('id', sheetId)
        .single();
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al obtener sheet:', error)
        throw new Error(error.message || 'Error al obtener sheet')
      }
      
      if (!data) {
        console.log('⚠️ [Sheets Debug] No se encontró el sheet con ID:', sheetId)
        return null
      }
      
      // Validar que el objeto tenga la estructura esperada
      if (!('proyecto_id' in data) || !('sheets_id' in data) || !('titulo' in data)) {
        console.error('❌ [Sheets Debug] La respuesta no tiene la estructura esperada:', data)
        return null
      }
      
      console.log('✅ [Sheets Debug] Sheet obtenido:', data)
      return data as Sheet;
    } catch (error) {
      console.error('❌ [Sheets Debug] Error en obtenerSheet:', error)
      return null
    }
  }
  
  /**
   * Obtiene un sheet por su ID de Google
   * @param googleId ID de Google del sheet
   * @returns Sheet o null si no existe
   */
  static async obtenerSheetPorGoogleId(googleId: string): Promise<Sheet | null> {
    try {
      console.log('🔍 [Sheets Debug] Obteniendo sheet por Google ID:', googleId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.from('sheets')
        .select('*')
        .eq('google_id', googleId)
        .single();
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al obtener sheet por Google ID:', error)
        throw new Error(error.message || 'Error al obtener sheet por Google ID')
      }
      
      if (!data) {
        console.log('⚠️ [Sheets Debug] No se encontró el sheet con Google ID:', googleId)
        return null
      }
      
      // Validar que el objeto tenga la estructura esperada
      if (!('proyecto_id' in data) || !('sheets_id' in data) || !('titulo' in data)) {
        console.error('❌ [Sheets Debug] La respuesta no tiene la estructura esperada:', data)
        return null
      }
      
      console.log('✅ [Sheets Debug] Sheet obtenido por Google ID:', data)
      return data as Sheet;
    } catch (error) {
      console.error('❌ [Sheets Debug] Error en obtenerSheetPorGoogleId:', error)
      return null
    }
  }
  
  /**
   * Obtiene todos los sheets de un proyecto
   * @param proyectoId UUID del proyecto
   * @returns Array de sheets
   */
  static async obtenerSheetsPorProyecto(proyectoId: string): Promise<Sheet[]> {
    try {
      console.log('🔍 [Sheets Debug] Obteniendo sheets para proyecto:', proyectoId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.from('sheets')
        .select('*')
        .eq('proyecto_id', proyectoId);
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al obtener sheets por proyecto:', error)
        throw new Error(error.message || 'Error al obtener sheets por proyecto')
      }
      
      if (!data || !Array.isArray(data)) {
        console.log('⚠️ [Sheets Debug] No se encontraron sheets para el proyecto:', proyectoId)
        return []
      }
      
      // Validar que cada objeto tenga la estructura esperada
      const sheetsValidos = data.filter(item => 
        item && 
        typeof item === 'object' && 
        'proyecto_id' in item && 
        'sheets_id' in item && 
        'titulo' in item
      );
      
      console.log('✅ [Sheets Debug] Sheets obtenidos:', sheetsValidos.length)
      return sheetsValidos as Sheet[];
    } catch (error) {
      console.error('❌ [Sheets Debug] Error en obtenerSheetsPorProyecto:', error)
      return []
    }
  }
  
  /**
   * Actualiza un sheet en la base de datos
   * @param sheetId UUID del sheet
   * @param datos Datos a actualizar
   * @returns Sheet actualizado o null si hay error
   */
  static async actualizarSheet(sheetId: string, datos: Partial<Omit<Sheet, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>): Promise<Sheet | null> {
    try {
      console.log('🔄 [Sheets Debug] Iniciando actualización de sheet:', sheetId)
      console.log('📊 [Sheets Debug] Datos a actualizar:', datos)
      
      // Verificar que tengamos datos válidos
      if (!sheetId || Object.keys(datos).length === 0) {
        console.error('❌ [Sheets Debug] Datos inválidos para actualizar sheet')
        return null
      }
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.from('sheets')
        .update(datos)
        .eq('id', sheetId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al actualizar sheet:', error)
        throw new Error(error.message || 'Error al actualizar sheet')
      }
      
      if (!data) {
        console.error('❌ [Sheets Debug] No se pudo actualizar el sheet')
        return null
      }
      
      // Validar que el objeto tenga la estructura esperada
      if (!('proyecto_id' in data) || !('sheets_id' in data) || !('titulo' in data)) {
        console.error('❌ [Sheets Debug] La respuesta no tiene la estructura esperada:', data)
        return null
      }
      
      console.log('✅ [Sheets Debug] Sheet actualizado correctamente:', data)
      return data as Sheet;
    } catch (error) {
      console.error('❌ [Sheets Debug] Error en actualizarSheet:', error)
      return null
    }
  }
  
  /**
   * Elimina un sheet de la base de datos
   * @param sheetId UUID del sheet
   * @returns true si se eliminó correctamente, false si hubo error
   */
  static async eliminarSheet(sheetId: string): Promise<boolean> {
    try {
      console.log('🔄 [Sheets Debug] Iniciando eliminación de sheet:', sheetId)
      
      // Verificar que tengamos datos válidos
      if (!sheetId) {
        console.error('❌ [Sheets Debug] ID inválido para eliminar sheet')
        return false
      }
      
      // Ejecutar la consulta a través del servicio centralizado
      const { error } = await SupabaseService.from('sheets').delete().eq('id', sheetId)
      
      if (error) {
        console.error('❌ [Sheets Debug] Error al eliminar sheet:', error)
        throw new Error(error.message || 'Error al eliminar sheet')
      }
      
      console.log('✅ [Sheets Debug] Sheet eliminado correctamente')
      
      return true
    } catch (error) {
      console.error('❌ [Sheets Debug] Error en eliminarSheet:', error)
      return false
    }
  }

  /**
   * Guarda un nuevo sheet en la base de datos
   * @param sheet Datos del sheet a guardar
   * @returns ID del sheet creado o null si hay error
   */
  static async guardarSheet(sheet: Omit<Sheet, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<string | null> {
    try {
      console.log('🔄 [Sheets Debug] Guardando sheet:', sheet);
      
      // Verificar que tengamos datos válidos
      if (!sheet.proyecto_id || !sheet.sheets_id || !sheet.titulo) {
        console.error('❌ [Sheets Debug] Datos inválidos para guardar sheet');
        return null;
      }

      // Preparar los datos para la inserción
      const sheetData = {
        ...sheet,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      };

      const result = await SupabaseService.insert('sheets', sheetData);
      
      if (result.error) {
        console.error('❌ [Sheets Debug] Error al guardar sheet:', result.error);
        throw new Error(result.error.message || 'Error al guardar sheet');
      }
      
      const sheetGuardado = result.data?.[0] as Sheet | undefined;
      
      if (!sheetGuardado?.id) {
        console.error('❌ [Sheets Debug] No se pudo guardar el sheet, respuesta vacía o sin ID');
        return null;
      }
      
      console.log('✅ [Sheets Debug] Sheet guardado correctamente:', sheetGuardado.id);
      return sheetGuardado.id;
    } catch (error) {
      console.error('❌ [Sheets Debug] Error al guardar sheet:', error);
      return null;
    }
  }
} 