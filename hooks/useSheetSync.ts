import { useState, useEffect } from "react"
import { SheetsService } from "@/lib/sheets-service"
import { SlidesService } from "@/lib/slides-service"
import { DataRow, SheetConfig } from "@/lib/types"

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
  loadData: () => Promise<void>
}

export function useSheetSync({ token, config }: UseSheetSyncProps): UseSheetSyncReturn {
  const [data, setData] = useState<DataRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const sheetsService = new SheetsService(token)
      const result = await sheetsService.fetchData(config)

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Error al cargar los datos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error cargando datos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, config])

  const sync = async (updates: DataRow[]) => {
    if (!data) {
      throw new Error('No hay datos disponibles para sincronizar');
    }

    setIsLoading(true)
    setError(null)

    try {
      const sheetsService = new SheetsService(token)
      const slidesService = new SlidesService(token)
      
      // Actualizar la hoja de cálculo
      const result = await sheetsService.updateData(config, updates, data)
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al sincronizar')
      }

      // Si hay una presentación conectada, actualizar los slides
      const connectedSlidesId = localStorage.getItem("connectedSlides")
      if (connectedSlidesId) {
        const slideUpdates = await Promise.all(
          updates
            .filter(row => row.slideLocation && row.slideElement)
            .map(async row => {
              // Obtener los elementos del slide actual
              const elements = await slidesService.getSlideElements(connectedSlidesId, row.slideLocation!);
              // Encontrar el elemento que queremos actualizar
              const element = elements.find(e => e.id === row.slideElement);
              
              if (!element) {
                console.warn(`No se encontró el elemento ${row.slideElement} en el slide ${row.slideLocation}`);
                return null;
              }

              return {
                slideId: row.slideLocation!,
                replacements: [{
                  searchText: element.content,
                  replaceText: String(row.values.id)
                }]
              };
            })
        );

        const validUpdates = slideUpdates.filter((update): update is NonNullable<typeof update> => update !== null);

        if (validUpdates.length > 0) {
          console.log('Actualizaciones de slides:', validUpdates);
          const slidesResult = await slidesService.updateSlideContent(connectedSlidesId, validUpdates)
          if (!slidesResult.success) {
            throw new Error(slidesResult.error || 'Error al actualizar las diapositivas')
          }
        }
      }

      // Recargar los datos después de sincronizar
      const fetchResult = await sheetsService.fetchData(config)
      if (fetchResult.success && fetchResult.data) {
        setData(fetchResult.data)
      } else {
        throw new Error(fetchResult.error || 'Error al recargar los datos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateSheet = async (updates: DataRow[]) => {
    if (!data) {
      throw new Error('No hay datos disponibles para actualizar');
    }

    setIsLoading(true)
    setError(null)

    try {
      const sheetsService = new SheetsService(token)
      const result = await sheetsService.updateData(config, updates, data)

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al actualizar')
      }

      // Actualizar los datos localmente
      const updatedData = data.map(row => {
        const update = updates.find(u => u.id === row.id)
        return update || row
      })

      setData(updatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    error,
    sync,
    updateSheet,
    loadData
  }
} 