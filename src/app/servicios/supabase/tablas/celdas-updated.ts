import { SupabaseService } from '../globales/supabase-service';

// Interfaces
export interface Celda {
  id?: string
  sheet_id: string
  fila: number
  columna: string
  referencia_celda: string
  contenido?: string
  tipo?: 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen'
  formato?: Record<string, any>
  metadata?: Record<string, any>
}

export class ServicioCeldas {
  // Método para guardar múltiples celdas usando UUID
  static async guardarCeldas(sheetId: string, celdas: Celda[]): Promise<string[] | null> {
    try {
      console.log('Guardando celdas para sheet UUID:', sheetId)
      console.log('Total de celdas a guardar:', celdas.length)
      
      // Verificar que tengamos datos válidos
      if (!sheetId || !celdas || celdas.length === 0) {
        console.error('Datos inválidos para guardar celdas')
        return null
      }
      
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
      
      // Llamar a la función RPC de Supabase directamente
      const { data, error } = await SupabaseService.rpc(
        'guardar_celdas',
        {
          p_sheet_id: sheetId,
          p_celdas: JSON.stringify(datos)
        }
      )
      
      if (error) {
        console.error('Error al guardar celdas:', error)
        throw new Error(error.message || 'Error al guardar celdas')
      }
      
      console.log('Celdas guardadas correctamente:', data)
      
      return data as string[] || []
    } catch (error) {
      console.error('Error en guardarCeldas:', error)
      return null
    }
  }
  
  // Método para guardar múltiples celdas usando Google ID
  static async guardarCeldasGoogle(googleSheetId: string, celdas: Celda[]): Promise<string[]> {
    try {
      console.log('Guardando celdas para Google Sheet ID:', googleSheetId)
      console.log('Total de celdas a guardar:', celdas.length)
      
      // Verificar que tengamos datos válidos
      if (!googleSheetId || !celdas || celdas.length === 0) {
        console.error('Datos inválidos para guardar celdas')
        return []
      }
      
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
      
      // Llamar a la función RPC de Supabase directamente
      const { data, error } = await SupabaseService.rpc(
        'guardar_celdas_google',
        {
          p_google_id: googleSheetId,
          p_celdas: JSON.stringify(datos)
        }
      )
      
      if (error) {
        console.error('Error al guardar celdas con Google ID:', error)
        throw new Error(error.message || 'Error al guardar celdas con Google ID')
      }
      
      console.log('Celdas guardadas correctamente con Google ID:', data)
      
      return data as string[] || []
    } catch (error) {
      console.error('Error en guardarCeldasGoogle:', error)
      return []
    }
  }
  
  // Método para obtener celdas por sheet_id
  static async obtenerCeldas(sheetId: string, referencia?: string): Promise<Celda[]> {
    try {
      console.log('Obteniendo celdas para sheet:', sheetId)
      
      // Construir la consulta
      let query: any = { sheet_id: sheetId };
      
      // Añadir filtro por referencia si se proporciona
      if (referencia) {
        query.referencia_celda = referencia;
      }
      
      // Ejecutar la consulta
      const { data, error } = await SupabaseService.select('celdas', query);
      
      if (error) {
        console.error('Error al obtener celdas:', error)
        throw new Error(error.message || 'Error al obtener celdas')
      }
      
      console.log('Celdas obtenidas:', data?.length || 0)
      
      return (data || []).map((item: Celda) => ({
        id: item.id,
        sheet_id: item.sheet_id,
        fila: item.fila,
        columna: item.columna,
        referencia_celda: item.referencia_celda,
        contenido: item.contenido,
        tipo: item.tipo,
        formato: item.formato,
        metadata: item.metadata
      })) as Celda[]
    } catch (error) {
      console.error('Error en obtenerCeldas:', error)
      return []
    }
  }
  
  // Método para guardar una celda individual
  static async guardarCelda(celda: Celda): Promise<string | null> {
    try {
      const resultado = await this.guardarCeldas(celda.sheet_id, [celda])
      return resultado && resultado.length > 0 ? resultado[0] : null
    } catch (error) {
      console.error('Error en guardarCelda:', error)
      return null
    }
  }
  
  // Método para obtener una celda por referencia
  static async obtenerCelda(sheetId: string, referencia: string): Promise<Celda | null> {
    try {
      const celdas = await this.obtenerCeldas(sheetId, referencia)
      return celdas && celdas.length > 0 ? celdas[0] : null
    } catch (error) {
      console.error('Error en obtenerCelda:', error)
      return null
    }
  }
  
  // Método para convertir datos de Google Sheets a formato de celdas
  static convertirDatosGoogleSheets(
    sheetId: string, 
    columnas: string[], 
    filas: any[]
  ): Celda[] {
    try {
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
      
      return celdas
    } catch (error) {
      console.error('Error al convertir datos de Google Sheets:', error)
      return []
    }
  }
} 