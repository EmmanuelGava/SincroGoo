import { SupabaseService } from '@/servicios/supabase/globales/supabase-service';
import { Celda } from '../globales/tipos';
import { SheetsAPI } from './sheets-service';

/**
 * Operaciones relacionadas con la tabla de celdas utilizando el servicio centralizado
 */
export class CeldasAPI {
  /**
   * Guarda celdas en la base de datos usando el UUID del sheet
   * @param sheetId UUID del sheet
   * @param celdas Array of cells to save
   * @param checkExistentes Si es false, asume that no hay celdas existentes (para optimizar la carga inicial)
   * @returns Array of UUIDs of the saved cells or null if there's an error
   */
  static async guardarCeldas(sheetId: string, celdas: Celda[], checkExistentes: boolean = true): Promise<string[] | null> {
    try {
      console.log('🔄 [Celdas Debug] Iniciando guardado de celdas para sheet UUID:', sheetId)
      console.log('📊 [Celdas Debug] Total de celdas a guardar:', celdas.length)
      
      // Verificar que tengamos datos válidos
      if (!sheetId || !celdas || celdas.length === 0) {
        console.error('❌ [Celdas Debug] Datos inválidos para guardar celdas')
        return null
      }
      
      // Comprobación rápida para la carga inicial
      if (!checkExistentes) {
        console.log('🔄 [Celdas Debug] Omitiendo verificación de celdas existentes para optimizar')
        
        // Preparar los datos para la API de Supabase
        const datos = celdas.map(celda => ({
          fila: celda.fila,
          columna: celda.columna,
          referencia_celda: celda.referencia_celda,
          contenido: celda.contenido || '',
          tipo: celda.tipo || 'texto',
          formato: celda.formato || {},
          metadata: celda.metadata || {}
        }))
        
        // Llamar a la función RPC de Supabase a través del servicio centralizado
        const { data, error } = await SupabaseService.rpc(
          'guardar_celdas',
          {
            p_sheet_id: sheetId,
            p_celdas: datos
          }
        )
        
        if (error) {
          console.error('❌ [Celdas Debug] Error al guardar celdas:', error)
          throw new Error(error.message || 'Error al guardar celdas')
        }
        
        console.log('✅ [Celdas Debug] Celdas guardadas correctamente:', data)
        return data as string[] || []
      }
      
      // Obtener celdas existentes para comparar
      const celdasExistentes = await this.obtenerCeldas(sheetId)
      console.log('🔍 [Celdas Debug] Celdas existentes encontradas:', celdasExistentes.length)
      
      // Si no hay celdas existentes, creamos todas de una vez
      if (celdasExistentes.length === 0) {
        console.log('🔄 [Celdas Debug] No hay celdas existentes, creando todas de una vez')
        
        // Preparar los datos para la API de Supabase
        const datos = celdas.map(celda => ({
          fila: celda.fila,
          columna: celda.columna,
          referencia_celda: celda.referencia_celda,
          contenido: celda.contenido || '',
          tipo: celda.tipo || 'texto',
          formato: celda.formato || {},
          metadata: celda.metadata || {}
        }))
        
        // Llamar a la función RPC de Supabase a través del servicio centralizado
        const { data, error } = await SupabaseService.rpc(
          'guardar_celdas',
          {
            p_sheet_id: sheetId,
            p_celdas: datos
          }
        )
        
        if (error) {
          console.error('❌ [Celdas Debug] Error al guardar celdas:', error)
          throw new Error(error.message || 'Error al guardar celdas')
        }
        
        console.log('✅ [Celdas Debug] Celdas guardadas correctamente:', data)
        return data as string[] || []
      }
      
      // Filtrar celdas nuevas o modificadas
      const celdasAGuardar: Celda[] = []
      
      for (const celda of celdas) {
        // Buscar si la celda ya existe por su referencia
        const celdaExistente = celdasExistentes.find(c => 
          c.referencia_celda === celda.referencia_celda
        )
        
        // Si no existe, la agregamos para crear
        if (!celdaExistente) {
          celdasAGuardar.push(celda)
          continue
        }
        
        // Si existe, comparamos para ver si hay cambios
        const contenidoCambiado = celdaExistente.contenido !== celda.contenido
        const tipoCambiado = celdaExistente.tipo !== celda.tipo
        const formatoCambiado = JSON.stringify(celdaExistente.formato) !== JSON.stringify(celda.formato)
        const metadataCambiado = JSON.stringify(celdaExistente.metadata) !== JSON.stringify(celda.metadata)
        
        // Si hay algún cambio, agregamos para actualizar
        if (contenidoCambiado || tipoCambiado || formatoCambiado || metadataCambiado) {
          celda.id = celdaExistente.id // Asignamos el ID para actualizar
          celdasAGuardar.push(celda)
        }
      }
      
      // Si no hay celdas para guardar, retornamos las existentes
      if (celdasAGuardar.length === 0) {
        console.log('ℹ️ [Celdas Debug] No hay celdas nuevas o modificadas para guardar')
        return celdasExistentes.map(c => c.id as string)
      }
      
      console.log('📊 [Celdas Debug] Celdas nuevas o modificadas a guardar:', celdasAGuardar.length)
      
      // Preparar los datos para la API de Supabase
      const datos = celdasAGuardar.map(celda => ({
        id: celda.id, // Si tiene ID, actualizará; si no, creará nueva
        fila: celda.fila,
        columna: celda.columna,
        referencia_celda: celda.referencia_celda,
        contenido: celda.contenido || '',
        tipo: celda.tipo || 'texto',
        formato: celda.formato || {},
        metadata: celda.metadata || {}
      }))
      
      // Llamar a la función RPC de Supabase a través del servicio centralizado
      const { data, error } = await SupabaseService.rpc(
        'guardar_celdas',
        {
          p_sheet_id: sheetId,
          p_celdas: datos
        }
      )
      
      if (error) {
        console.error('❌ [Celdas Debug] Error al guardar celdas:', error)
        throw new Error(error.message || 'Error al guardar celdas')
      }
      
      console.log('✅ [Celdas Debug] Celdas guardadas correctamente:', data)
      
      // Combinar IDs de celdas guardadas con las que ya existían sin cambios
      const celdasSinCambios = celdasExistentes
        .filter(existente => !celdasAGuardar.some(aguardar => 
          aguardar.referencia_celda === existente.referencia_celda
        ))
        .map(c => c.id as string)
      
      const todosIds = [...(data as string[] || []), ...celdasSinCambios]
      console.log('✅ [Celdas Debug] Total de celdas en la base de datos:', todosIds.length)
      
      return todosIds
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en guardarCeldas:', error)
      return null
    }
  }
  
  /**
   * Guarda celdas en la base de datos usando el ID de Google Sheet
   * @param googleSheetId ID of Google Sheet
   * @param celdas Array of cells to save
   * @param checkExistentes Si es false, asume que no hay celdas existentes (para optimizar la carga inicial)
   * @returns Array of UUIDs of the saved cells or null if there's an error
   */
  static async guardarCeldasGoogle(googleSheetId: string, celdas: Celda[], checkExistentes: boolean = true): Promise<string[] | null> {
    try {
      console.log('🔄 [Celdas Debug] Iniciando guardado de celdas para Google Sheet ID:', googleSheetId)
      console.log('📊 [Celdas Debug] Total de celdas a guardar:', celdas.length)
      
      // Verificar que tengamos datos válidos
      if (!googleSheetId || !celdas || celdas.length === 0) {
        console.error('❌ [Celdas Debug] Datos inválidos para guardar celdas')
        return null
      }
      
      // Obtener el sheet por Google ID para después obtener sus celdas
      const sheet = await SheetsAPI.obtenerSheetPorGoogleId(googleSheetId)
      if (!sheet) {
        console.error('❌ [Celdas Debug] No se encontró el sheet con Google ID:', googleSheetId)
        return null
      }
      
      // Comprobación rápida para la carga inicial
      if (!checkExistentes) {
        console.log('🔄 [Celdas Debug] Omitiendo verificación de celdas existentes para optimizar')
        
        // Preparar los datos para la API de Supabase
        const datos = celdas.map(celda => ({
          fila: celda.fila,
          columna: celda.columna,
          referencia_celda: celda.referencia_celda,
          contenido: celda.contenido || '',
          tipo: celda.tipo || 'texto',
          formato: celda.formato || {},
          metadata: celda.metadata || {}
        }))
        
        // Llamar a la función RPC de Supabase a través del servicio centralizado
        const { data, error } = await SupabaseService.rpc(
          'guardar_celdas_google',
          {
            p_google_id: googleSheetId,
            p_celdas: JSON.stringify(datos)
          }
        )
        
        if (error) {
          console.error('❌ [Celdas Debug] Error al guardar celdas con Google ID:', error)
          throw new Error(error.message || 'Error al guardar celdas con Google ID')
        }
        
        console.log('✅ [Celdas Debug] Celdas guardadas correctamente con Google ID:', data)
        return data as string[] || []
      }
      
      // Obtener celdas existentes para comparar
      const celdasExistentes = await this.obtenerCeldas(sheet.id as string)
      console.log('🔍 [Celdas Debug] Celdas existentes encontradas:', celdasExistentes.length)
      
      // Si no hay celdas existentes, creamos todas de una vez
      if (celdasExistentes.length === 0) {
        console.log('🔄 [Celdas Debug] No hay celdas existentes, creando todas de una vez')
        
        // Preparar los datos para la API de Supabase
        const datos = celdas.map(celda => ({
          fila: celda.fila,
          columna: celda.columna,
          referencia_celda: celda.referencia_celda,
          contenido: celda.contenido || '',
          tipo: celda.tipo || 'texto',
          formato: celda.formato || {},
          metadata: celda.metadata || {}
        }))
        
        // Llamar a la función RPC de Supabase a través del servicio centralizado
        const { data, error } = await SupabaseService.rpc(
          'guardar_celdas_google',
          {
            p_google_id: googleSheetId,
            p_celdas: JSON.stringify(datos)
          }
        )
        
        if (error) {
          console.error('❌ [Celdas Debug] Error al guardar celdas con Google ID:', error)
          throw new Error(error.message || 'Error al guardar celdas con Google ID')
        }
        
        console.log('✅ [Celdas Debug] Celdas guardadas correctamente con Google ID:', data)
        return data as string[] || []
      }
      
      // Filtrar celdas nuevas o modificadas
      const celdasAGuardar: Celda[] = []
      
      for (const celda of celdas) {
        // Buscar si la celda ya existe por su referencia
        const celdaExistente = celdasExistentes.find(c => 
          c.referencia_celda === celda.referencia_celda
        )
        
        // Si no existe, la agregamos para crear
        if (!celdaExistente) {
          celdasAGuardar.push(celda)
          continue
        }
        
        // Si existe, comparamos para ver si hay cambios
        const contenidoCambiado = celdaExistente.contenido !== celda.contenido
        const tipoCambiado = celdaExistente.tipo !== celda.tipo
        const formatoCambiado = JSON.stringify(celdaExistente.formato) !== JSON.stringify(celda.formato)
        const metadataCambiado = JSON.stringify(celdaExistente.metadata) !== JSON.stringify(celda.metadata)
        
        // Si hay algún cambio, agregamos para actualizar
        if (contenidoCambiado || tipoCambiado || formatoCambiado || metadataCambiado) {
          celda.id = celdaExistente.id // Asignamos el ID para actualizar
          celdasAGuardar.push(celda)
        }
      }
      
      // Si no hay celdas para guardar, retornamos las existentes
      if (celdasAGuardar.length === 0) {
        console.log('ℹ️ [Celdas Debug] No hay celdas nuevas o modificadas para guardar')
        return celdasExistentes.map(c => c.id as string)
      }
      
      console.log('📊 [Celdas Debug] Celdas nuevas o modificadas a guardar:', celdasAGuardar.length)
      
      // Preparar los datos para la API de Supabase
      const datos = celdasAGuardar.map(celda => ({
        id: celda.id, // Si tiene ID, actualizará; si no, creará nueva
        fila: celda.fila,
        columna: celda.columna,
        referencia_celda: celda.referencia_celda,
        contenido: celda.contenido || '',
        tipo: celda.tipo || 'texto',
        formato: celda.formato || {},
        metadata: celda.metadata || {}
      }))
      
      // Llamar a la función RPC de Supabase a través del servicio centralizado
      const { data, error } = await SupabaseService.rpc(
        'guardar_celdas_google',
        {
          p_google_id: googleSheetId,
          p_celdas: JSON.stringify(datos)
        }
      )
      
      if (error) {
        console.error('❌ [Celdas Debug] Error al guardar celdas con Google ID:', error)
        throw new Error(error.message || 'Error al guardar celdas con Google ID')
      }
      
      console.log('✅ [Celdas Debug] Celdas guardadas correctamente con Google ID:', data)
      
      // Combinar IDs de celdas guardadas con las que ya existían sin cambios
      const celdasSinCambios = celdasExistentes
        .filter(existente => !celdasAGuardar.some(aguardar => 
          aguardar.referencia_celda === existente.referencia_celda
        ))
        .map(c => c.id as string)
      
      const todosIds = [...(data as string[] || []), ...celdasSinCambios]
      console.log('✅ [Celdas Debug] Total de celdas en la base de datos:', todosIds.length)
      
      return todosIds
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en guardarCeldasGoogle:', error)
      return null
    }
  }
  
  /**
   * Obtiene todas las celdas de un sheet
   * @param sheetId UUID del sheet
   * @returns Array of cells
   */
  static async obtenerCeldas(sheetId: string): Promise<Celda[]> {
    try {
      console.log('🔍 [Celdas Debug] Obteniendo celdas para sheet:', sheetId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.select(
        'celdas',
        { sheet_id: sheetId }
      )
      
      if (error) {
        console.error('❌ [Celdas Debug] Error al obtener celdas:', error)
        throw new Error(error.message || 'Error al obtener celdas')
      }
      
      console.log('✅ [Celdas Debug] Celdas obtenidas:', data?.length || 0)
      
      return (data || []) as Celda[]
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en obtenerCeldas:', error)
      return []
    }
  }
  
  /**
   * Obtiene una celda por su UUID
   * @param celdaId UUID of the cell
   * @returns Cell or null if it doesn't exist
   */
  static async obtenerCelda(celdaId: string): Promise<Celda | null> {
    try {
      console.log('🔍 [Celdas Debug] Obteniendo celda por ID:', celdaId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.select(
        'celdas',
        { id: celdaId }
      )
      
      if (error) {
        console.error('❌ [Celdas Debug] Error al obtener celda:', error)
        throw new Error(error.message || 'Error al obtener celda')
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ [Celdas Debug] No se encontró la celda con ID:', celdaId)
        return null
      }
      
      console.log('✅ [Celdas Debug] Celda obtenida:', data[0])
      
      return data[0] as Celda
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en obtenerCelda:', error)
      return null
    }
  }
  
  /**
   * Obtiene una celda por su referencia (ej: A1, B2, etc.)
   * @param sheetId UUID del sheet
   * @param referenciaCelda Reference of the cell (ej: A1, B2, etc.)
   * @returns Cell or null if it doesn't exist
   */
  static async obtenerCeldaPorReferencia(sheetId: string, referenciaCelda: string): Promise<Celda | null> {
    try {
      console.log('🔍 [Celdas Debug] Obteniendo celda por referencia:', referenciaCelda, 'en sheet:', sheetId)
      
      // Ejecutar la consulta a través del servicio centralizado
      const { data, error } = await SupabaseService.select(
        'celdas',
        { 
          sheet_id: sheetId,
          referencia_celda: referenciaCelda
        }
      )
      
      if (error) {
        console.error('❌ [Celdas Debug] Error al obtener celda por referencia:', error)
        throw new Error(error.message || 'Error al obtener celda por referencia')
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ [Celdas Debug] No se encontró la celda con referencia:', referenciaCelda)
        return null
      }
      
      console.log('✅ [Celdas Debug] Celda obtenida por referencia:', data[0])
      
      return data[0] as Celda
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en obtenerCeldaPorReferencia:', error)
      return null
    }
  }
  
  /**
   * Guarda celdas en la base de datos a partir de datos de Google Sheets
   * @param idHojaCalculo ID of the Google spreadsheet
   * @param idProyecto ID of the project
   * @param columnas Array of column names
   * @param filas Array of rows with data
   * @param primeraVez If true, assumes it's the first time cells are being saved (optimizes)
   * @returns Array of UUIDs of the saved cells or null if there's an error
   */
  static async guardarCeldasEnBaseDatos(
    idHojaCalculo: string, 
    idProyecto: string, 
    columnas: string[], 
    filas: any[],
    primeraVez: boolean = false
  ): Promise<string[] | null> {
    try {
      console.log('🔄 [Celdas Debug] Iniciando guardado de celdas desde Google Sheets')
      console.log('📊 [Celdas Debug] Datos a guardar:', { 
        idHojaCalculo, 
        idProyecto, 
        columnas: columnas.length, 
        filas: filas.length, 
        primeraVez 
      })
      
      // Verificar que tengamos datos válidos
      if (!idHojaCalculo || !idProyecto || !columnas || !filas || columnas.length === 0 || filas.length === 0) {
        console.error('❌ [Celdas Debug] Datos inválidos para guardar celdas')
        return null
      }
      
      // Obtener el UUID del sheet a partir del ID de Google
      console.log('🔄 [Celdas Debug] Obteniendo UUID del sheet para Google ID:', idHojaCalculo)
      const sheet = await SheetsAPI.obtenerSheetPorGoogleId(idHojaCalculo)
      
      if (!sheet) {
        console.error('❌ [Celdas Debug] No se encontró el sheet con Google ID:', idHojaCalculo)
        
        // Intentar crear el sheet si no existe
        console.log('🔄 [Celdas Debug] Intentando crear sheet para Google ID:', idHojaCalculo)
        
        const nuevoSheet = await SheetsAPI.crearSheet({
          proyecto_id: idProyecto,
          sheets_id: idHojaCalculo,
          titulo: 'Hoja sin título',
          nombre: 'Hoja sin título',
          google_id: idHojaCalculo,
          metadata: { columnas }
        });

        if (!nuevoSheet?.id) {
          console.error('❌ [Celdas Debug] No se pudo crear el sheet');
          return null;
        }

        // Convertir los datos a nuestro formato
        const celdas = this.convertirDatosGoogleSheets(nuevoSheet.id, columnas, filas);

        // Guardar las celdas
        return await this.guardarCeldas(nuevoSheet.id, celdas, false);
      }
      
      console.log('✅ [Celdas Debug] Sheet encontrado:', sheet.id)

      // Antes de convertir y guardar, verificar si ya existen celdas para este sheet y filas
      // Esto es especialmente útil para actualizaciones de una sola fila
      if (!primeraVez && filas.length > 0) {
        // Calcular el número total de celdas esperadas para estas filas
        const totalCeldasEsperadas = filas.length * columnas.length;
        
        // Para una sola fila, podemos verificar específicamente las celdas de esa fila
        if (filas.length === 1) {
          const fila = filas[0];
          const filaId = typeof fila.id === 'string' ? fila.id : String(fila.id);
          
          console.log(`🔍 [Celdas Debug] Verificando celdas existentes para la fila ${filaId}...`);
          
          // Obtener celdas existentes para esta fila específica
          const { data: celdasExistentes, error } = await SupabaseService.select(
            'celdas',
            { fila: parseInt(filaId), sheet_id: sheet.id },
            { select: 'id, referencia_celda, contenido' }
          );
          
          if (error) {
            console.error('❌ [Celdas Debug] Error al obtener celdas existentes:', error);
          }
          
          if (celdasExistentes && celdasExistentes.length > 0) {
            console.log(`🔍 [Celdas Debug] Encontradas ${celdasExistentes.length} celdas para la fila ${filaId}`);
            
            // Verificar si hay cambios en las celdas
            let cambiosDetectados = false;
            
            // Comparar el contenido de las celdas existentes con los nuevos valores
            for (const columna of columnas) {
              const celdaExistente = celdasExistentes.find((c: any) => 
                c.referencia_celda === `${columna}${filaId}`
              );
              
              const valorNuevo = fila.valores[columna]?.toString() || '';
              const valorExistente = celdaExistente?.contenido || '';
              
              if (valorNuevo !== valorExistente) {
                cambiosDetectados = true;
                console.log(`🔄 [Celdas Debug] Cambio detectado en columna ${columna}: '${valorExistente}' -> '${valorNuevo}'`);
                break;
              }
            }
            
            if (!cambiosDetectados) {
              console.log(`ℹ️ [Celdas Debug] No se detectaron cambios en la fila ${filaId}, omitiendo guardado`);
              return celdasExistentes.map((c: any) => c.id); // Retornar los IDs existentes
            }
            
            console.log(`🔄 [Celdas Debug] Se detectaron cambios en la fila ${filaId}, procediendo a guardar...`);
          }
        } else {
          // Para múltiples filas, verificar el recuento total de celdas
          // Usar una consulta para contar registros
          const { data, error } = await SupabaseService.select(
            'celdas',
            { sheet_id: sheet.id },
            { select: 'count' }
          );
          
          const count = data && data[0] ? parseInt(data[0].count) : 0;
          
          console.log(`🔍 [Celdas Debug] Total de celdas existentes: ${count}, esperadas: ${totalCeldasEsperadas}`);
          
          // Si ya tenemos aproximadamente la cantidad esperada y no es la primera vez, podemos saltar 
          // la operación (útil para recargas de página)
          if (count && count >= totalCeldasEsperadas * 0.9 && !primeraVez) {
            console.log('ℹ️ [Celdas Debug] Ya existen suficientes celdas, omitiendo guardado para optimizar');
            
            // Obtener los IDs de las celdas existentes (limitado para rendimiento)
            const { data: celdasExistentes } = await SupabaseService.select(
              'celdas',
              { sheet_id: sheet.id },
              { select: 'id' }
            );
            
            // Solo tomar los primeros 1000 para evitar problemas de rendimiento
            const celdasLimitadas = celdasExistentes && celdasExistentes.length > 0 
              ? celdasExistentes.slice(0, 1000) 
              : [];
            
            if (celdasLimitadas.length > 0) {
              return celdasLimitadas.map((c: any) => c.id);
            }
          }
        }
      }
      
      // Convertir datos a formato de celdas
      const celdas = sheet.id ? this.convertirDatosGoogleSheets(sheet.id, columnas, filas) : [];
      
      if (!sheet.id) {
        console.error('❌ [Celdas Debug] El sheet no tiene ID');
        return null;
      }

      // Guardar celdas (primera vez, más rápido sin verificación)
      const resultado = await this.guardarCeldas(sheet.id, celdas, !primeraVez);
      
      if (resultado) {
        console.log(`✅ [Celdas Debug] Guardadas/actualizadas ${resultado.length} celdas exitosamente`);
      } else {
        console.error(`❌ [Celdas Debug] No se pudieron guardar las celdas`);
      }
      
      return resultado;
    } catch (error) {
      console.error('❌ [Celdas Debug] Error en guardarCeldasEnBaseDatos:', error)
      return null
    }
  }
  
  /**
   * Convierte datos de Google Sheets a formato de celdas
   * @param sheetId UUID del sheet
   * @param columnas Array of column names
   * @param filas Array of rows with data
   * @returns Array of cells
   */
  static convertirDatosGoogleSheets(
    sheetId: string, 
    columnas: string[], 
    filas: any[]
  ): Celda[] {
    try {
      console.log('🔄 [Celdas Debug] Convirtiendo datos de Google Sheets a formato de celdas')
      console.log('📊 [Celdas Debug] Datos a convertir:', { sheetId, columnas, filas: filas.length })
      
      const celdas: Celda[] = []
      
      // Procesar cada fila
      filas.forEach((fila, indiceFila) => {
        // Procesar cada columna
        columnas.forEach((columna, indiceColumna) => {
          // Obtener el valor de la celda
          const valor = fila[columna]
          
          // Determinar el tipo de dato
          let tipo: 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen' = 'texto'
          if (typeof valor === 'number') {
            tipo = 'numero'
          } else if (typeof valor === 'string' && valor.startsWith('=')) {
            tipo = 'formula'
          }
          
          // Crear referencia de celda (A1, B2, etc.)
          const letraColumna = String.fromCharCode(65 + indiceColumna) // A, B, C, ...
          const numeroFila = indiceFila + 1
          const referenciaCelda = `${letraColumna}${numeroFila}`
          
          // Crear objeto de celda
          celdas.push({
            sheet_id: sheetId,
            fila: numeroFila,
            columna: letraColumna,
            referencia_celda: referenciaCelda,
            contenido: valor !== undefined ? String(valor) : '',
            tipo,
            formato: {},
            metadata: { nombre_columna: columna }
          })
        })
      })
      
      console.log('✅ [Celdas Debug] Datos convertidos correctamente:', celdas.length, 'celdas')
      
      return celdas
    } catch (error) {
      console.error('❌ [Celdas Debug] Error al convertir datos de Google Sheets:', error)
      return []
    }
  }
} 