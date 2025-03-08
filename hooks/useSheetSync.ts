import { useState, useEffect, useCallback } from "react"
import { SheetsService } from "@/lib/sheets-service"
import { DataRow, SheetConfig } from "@/lib/types"

// Cache para almacenar los datos
const dataCache: { [key: string]: { data: DataRow[]; timestamp: number } } = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 2000 // 2 segundos entre solicitudes

interface UseSheetSyncProps {
  token: string
  config: SheetConfig
}

interface UseSheetSyncReturn {
  data: DataRow[] | null
  isLoading: boolean
  error: string | null
  sync: (updates: DataRow[]) => Promise<void>
  updateSheet: (updates: DataRow[]) => Promise<void>
  loadData: (force?: boolean) => Promise<void>
}

export function useSheetSync({ token, config }: UseSheetSyncProps): UseSheetSyncReturn {
  const [data, setData] = useState<DataRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  const getCachedData = (sheetId: string) => {
    const cached = dataCache[sheetId]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const setCachedData = (sheetId: string, data: DataRow[]) => {
    dataCache[sheetId] = {
      data,
      timestamp: Date.now()
    }
  }

  const canMakeRequest = () => {
    const now = Date.now()
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      return false
    }
    lastRequestTime = now
    return true
  }

  const loadData = useCallback(async (force: boolean = false) => {
    try {
      const sheetId = config.spreadsheetId || localStorage.getItem('connectedSheet')
      if (!sheetId) {
        console.warn('No hay hoja conectada. ID de hoja en config:', config.spreadsheetId)
        setError('No hay hoja conectada')
        setIsLoading(false)
        return
      }

      // Verificar caché si no es forzado
      if (!force) {
        const cachedData = getCachedData(sheetId)
        if (cachedData) {
          setData(cachedData)
          setIsLoading(false)
          setError(null)
          return
        }
      }

      // Rate limiting
      if (!canMakeRequest() && !force) {
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1)
          setTimeout(() => loadData(force), MIN_REQUEST_INTERVAL)
          return
        }
        console.warn('Máximo de reintentos alcanzado')
        return
      }

      setIsLoading(true)
      setError(null)

      const sheetsService = new SheetsService(token)
      const result = await sheetsService.fetchData(config)

      if (result.success && result.data) {
        setData(result.data)
        setCachedData(sheetId, result.data)
        setError(null)
      } else {
        setError(result.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error obteniendo datos:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
      setRetryCount(0)
    }
  }, [token, config, retryCount])

  const sync = useCallback(async (updates: DataRow[]) => {
    try {
      const sheetId = config.spreadsheetId || localStorage.getItem('connectedSheet')
      if (!sheetId) throw new Error('No hay hoja conectada')

      const sheetsService = new SheetsService(token)
      await sheetsService.updateData(config, updates, data || [])
      
      // Invalidar caché después de actualizar
      delete dataCache[sheetId]
      
      // Recargar datos
      await loadData(true)
    } catch (error) {
      console.error('Error sincronizando:', error)
      throw error
    }
  }, [token, config, data, loadData])

  const updateSheet = useCallback(async (updates: DataRow[]) => {
    try {
      const sheetId = config.spreadsheetId || localStorage.getItem('connectedSheet')
      if (!sheetId) throw new Error('No hay hoja conectada')

      const sheetsService = new SheetsService(token)
      await sheetsService.updateData(config, updates, data || [])
      
      // Actualizar caché localmente
      if (data) {
        const updatedData = data.map(row => {
          const update = updates.find(u => u.rowNumber === row.rowNumber)
          return update || row
        })
        setData(updatedData)
        setCachedData(sheetId, updatedData)
      }
    } catch (error) {
      console.error('Error actualizando:', error)
      throw error
    }
  }, [data, config])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    isLoading,
    error,
    sync,
    updateSheet,
    loadData
  }
} 