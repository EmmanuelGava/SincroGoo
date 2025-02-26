import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSheetSync } from '@/hooks/useSheetSync'
import { SlidesService } from '@/lib/slides-service'
import { 
  DataRow, 
  SheetConfig, 
  SlidePreview, 
  CellData,
  ElementUpdate,
  SlideUpdate,
  ChangeHistory,
  ChangeHistoryEntry,
  ScheduledUpdate,
  VersionComparison
} from '@/lib/types'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { Loader2, ArrowUpDown, Search, Edit, History, Undo, Eye, Clock, ArrowLeftRight, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SlideSelector } from './SlideSelector'
import { ScrollArea } from "./ui/scroll-area"
import { format, addHours, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from "@/components/ui/calendar"

interface SheetSyncViewProps {
  token: string
  config: SheetConfig
}

interface PreviewChanges {
  cells: Array<{
    header: string;
    oldValue: string;
    newValue: string;
  }>;
  slides: Array<{
    elementId: string;
    oldValue: string;
    newValue: string;
  }>;
}

interface SlideElementUpdate {
  elementId: string;
  cellRef: string;
  content?: string;
}

interface Values {
  [key: string]: string | number;
}

interface SlideElement {
  id: string;
  content: string;
}

interface PriceUpdateOptions {
  operation: 'percentage' | 'fixed' | 'currency';
  value: number;
  fromCurrency?: string;
  toCurrency?: string;
}

interface CurrencyInfo {
  symbol: string;
  name: string;
  description: string;
  rate: number;
  region: string;
  symbolPosition: 'before' | 'after';
  iso: string;
}

interface FilterOptions {
  priceRange: {
    min: number | null;
    max: number | null;
  };
  currencies: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface SlideChange {
  elementId: string;
  oldValue: string;
  newValue: string;
}

// Definir la interfaz EditingValues
interface EditingValues {
  cells: Array<{
    cellRef: string;
    value: string;
    header: string;
    isPrice?: boolean;
  }>;
  slideLocation?: string;
  slideElements: Array<SlideElementUpdate>;
  slidePreview?: string;
}

const CURRENCIES: Record<string, CurrencyInfo> = {
  'EUR': {
    symbol: '€',
    name: 'Euro',
    description: 'Moneda oficial de la Unión Europea',
    rate: 1,
    region: 'Europa',
    symbolPosition: 'before',
    iso: 'EUR'
  },
  'USD': {
    symbol: '$',
    name: 'Dólar estadounidense',
    description: 'Moneda más utilizada en transacciones internacionales',
    rate: 1.1,
    region: 'América del Norte',
    symbolPosition: 'before',
    iso: 'USD'
  },
  'ARS': {
    symbol: '$',
    name: 'Peso argentino',
    description: 'Moneda oficial de Argentina',
    rate: 905.97,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'ARS'
  },
  'BRL': {
    symbol: 'R$',
    name: 'Real brasileño',
    description: 'Moneda oficial de Brasil',
    rate: 5.5,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'BRL'
  },
  'CLP': {
    symbol: '$',
    name: 'Peso chileno',
    description: 'Moneda oficial de Chile',
    rate: 980.45,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'CLP'
  },
  'COP': {
    symbol: '$',
    name: 'Peso colombiano',
    description: 'Moneda oficial de Colombia',
    rate: 3950.82,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'COP'
  },
  'PEN': {
    symbol: 'S/',
    name: 'Sol peruano',
    description: 'Moneda oficial de Perú',
    rate: 4.08,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'PEN'
  },
  'UYU': {
    symbol: '$',
    name: 'Peso uruguayo',
    description: 'Moneda oficial de Uruguay',
    rate: 39.42,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'UYU'
  },
  'VES': {
    symbol: 'Bs.',
    name: 'Bolívar venezolano',
    description: 'Moneda oficial de Venezuela',
    rate: 36.31,
    region: 'América del Sur',
    symbolPosition: 'before',
    iso: 'VES'
  },
  'GBP': {
    symbol: '£',
    name: 'Libra esterlina',
    description: 'Moneda oficial del Reino Unido',
    rate: 0.86,
    region: 'Europa',
    symbolPosition: 'before',
    iso: 'GBP'
  },
  'JPY': {
    symbol: '¥',
    name: 'Yen japonés',
    description: 'Moneda oficial de Japón',
    rate: 160,
    region: 'Asia',
    symbolPosition: 'before',
    iso: 'JPY'
  },
  'CHF': {
    symbol: 'Fr',
    name: 'Franco suizo',
    description: 'Moneda oficial de Suiza y Liechtenstein',
    rate: 0.95,
    region: 'Europa',
    symbolPosition: 'before',
    iso: 'CHF'
  },
  'CAD': {
    symbol: 'C$',
    name: 'Dólar canadiense',
    description: 'Moneda oficial de Canadá',
    rate: 1.45,
    region: 'América del Norte',
    symbolPosition: 'before',
    iso: 'CAD'
  },
  'AUD': {
    symbol: 'A$',
    name: 'Dólar australiano',
    description: 'Moneda oficial de Australia',
    rate: 1.65,
    region: 'Oceanía',
    symbolPosition: 'before',
    iso: 'AUD'
  },
  'CNY': {
    symbol: '¥',
    name: 'Yuan chino',
    description: 'Moneda oficial de China',
    rate: 7.15,
    region: 'Asia',
    symbolPosition: 'before',
    iso: 'CNY'
  }
};

// Interfaz para el sistema de caché
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface Cache {
  [key: string]: CacheItem<any>;
}

// Utilidad para el manejo de errores
interface ErrorMessages {
  [key: string]: {
    title: string;
    description: string;
    solution?: string;
  };
}

const ERROR_MESSAGES: ErrorMessages = {
  'NETWORK_ERROR': {
    title: 'Error de conexión',
    description: 'No se pudo establecer conexión con el servidor',
    solution: 'Verifica tu conexión a internet y vuelve a intentarlo'
  },
  'AUTH_ERROR': {
    title: 'Error de autenticación',
    description: 'Tu sesión ha expirado o no tienes permisos suficientes',
    solution: 'Inicia sesión nuevamente'
  },
  'RATE_LIMIT': {
    title: 'Límite de solicitudes excedido',
    description: 'Has realizado demasiadas solicitudes en poco tiempo',
    solution: 'Espera unos minutos antes de volver a intentarlo'
  },
  'INVALID_PRICE': {
    title: 'Formato de precio inválido',
    description: 'El precio ingresado no tiene un formato válido',
    solution: 'Utiliza el formato correcto (ej: 10.99€, €10.99)'
  },
  'SYNC_ERROR': {
    title: 'Error de sincronización',
    description: 'No se pudieron sincronizar los cambios con la presentación',
    solution: 'Verifica que la presentación esté conectada y vuelve a intentarlo'
  },
  'UPDATE_ERROR': {
    title: 'Error al actualizar',
    description: 'No se pudieron guardar los cambios',
    solution: 'Verifica los datos e inténtalo nuevamente'
  }
};

// Sistema de caché
const cache: Cache = {};

const setCacheItem = <T,>(key: string, data: T, expiresIn: number = 5 * 60 * 1000) => {
  cache[key] = {
    data,
    timestamp: Date.now(),
    expiresIn
  };
};

const getCacheItem = <T,>(key: string): T | null => {
  const item = cache[key];
  if (!item) return null;
  
  if (Date.now() - item.timestamp > item.expiresIn) {
    delete cache[key];
    return null;
  }
  
  return item.data as T;
};

export function SheetSyncView({ token, config }: SheetSyncViewProps) {
  // Estados locales
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [sorting, setSorting] = useState<{
    key: string
    direction: "asc" | "desc"
  }>({ key: config.columns[0]?.key || "id", direction: "asc" })
  const [availableSlides, setAvailableSlides] = useState<SlidePreview[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingValues, setEditingValues] = useState<EditingValues>({ 
    cells: [],
    slideElements: []
  })
  const [changeHistory, setChangeHistory] = useState<ChangeHistory>({
    entries: [],
    currentIndex: -1
  })
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewChanges, setPreviewChanges] = useState<PreviewChanges>({
    cells: [],
    slides: []
  })
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showCompareDialog, setShowCompareDialog] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledUpdates, setScheduledUpdates] = useState<ScheduledUpdate[]>([])
  const [versionComparison, setVersionComparison] = useState<VersionComparison | null>(null)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [priceUpdateOptions, setPriceUpdateOptions] = useState<PriceUpdateOptions>({
    operation: 'percentage',
    value: 0,
    fromCurrency: 'EUR',
    toCurrency: 'USD'
  })
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    priceRange: { min: null, max: null },
    currencies: [],
    dateRange: { start: null, end: null }
  });

  // Servicios
  const slidesService = useMemo(() => new SlidesService(token), [token])

  // Hook principal
  const { data, isLoading, error, sync, updateSheet, loadData } = useSheetSync({ token, config })

  // Función mejorada para mostrar errores
  const showError = useCallback((errorType: keyof ErrorMessages, error?: Error) => {
    const errorInfo = ERROR_MESSAGES[errorType];
    toast.error(errorInfo.title, {
      description: (
        <div className="mt-2 space-y-2">
          <p>{errorInfo.description}</p>
          {errorInfo.solution && (
            <p className="text-sm text-yellow-600">
              Sugerencia: {errorInfo.solution}
            </p>
          )}
          {error?.message && (
            <p className="text-xs text-gray-500">
              Detalles técnicos: {error.message}
            </p>
          )}
        </div>
      ),
      duration: 5000
    });
  }, []);

  // Función mejorada para cargar slides con caché
  const loadSlides = useCallback(async () => {
    const slidesId = localStorage.getItem("connectedSlides");
    if (!slidesId) {
      console.warn('No hay presentación conectada');
      return;
    }

    try {
      // Intentar obtener del caché primero
      const cachedSlides = getCacheItem<SlidePreview[]>(`slides_${slidesId}`);
      if (cachedSlides) {
        console.log('Usando slides desde caché');
        setAvailableSlides(cachedSlides);
        return;
      }

      const result = await slidesService.fetchSlidePreviews(slidesId);
      if (result.success && result.data) {
        console.log('Slides cargados desde el servidor');
        setAvailableSlides(result.data);
        // Guardar en caché por 5 minutos
        setCacheItem(`slides_${slidesId}`, result.data);
      } else {
        showError('SYNC_ERROR', new Error(result.error));
      }
    } catch (error) {
      console.error('Error cargando slides:', error);
      showError('NETWORK_ERROR', error as Error);
    }
  }, [slidesService, showError]);

  const handleSort = (key: string) => {
    setSorting({
      key,
      direction: sorting.key === key && sorting.direction === "asc" ? "desc" : "asc",
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedRows(filteredData.map(row => row.id))
    } else {
      setSelectedRows([])
    }
  }

  // Función mejorada para sincronizar con manejo de errores
  const handleSync = async () => {
    if (selectedRows.length === 0) {
      showError('UPDATE_ERROR', new Error('No hay filas seleccionadas'));
      return;
    }

    try {
      const updatesForSync = data?.filter(row => selectedRows.includes(row.id)) || [];
      await sync(updatesForSync);
      
      // Invalidar caché relacionada
      Object.keys(cache).forEach(key => {
        if (key.startsWith('slides_') || key.startsWith('data_')) {
          delete cache[key];
        }
      });
      
      toast.success('Datos sincronizados correctamente', {
        description: `Se sincronizaron ${updatesForSync.length} registros`
      });
      setSelectedRows([]);
    } catch (error) {
      console.error('Error syncing data:', error);
      showError('SYNC_ERROR', error as Error);
    }
  };

  const handleEdit = (row: DataRow) => {
    console.log('Editando fila:', row);
    
    // Si es la fila de headers (rowNumber === 1), no permitimos edición
    if (row.rowNumber === 1) {
      toast.error('No se puede editar la fila de headers');
      return;
    }

    // Obtener los headers de la primera fila de data
    const headerRow = data?.find(r => r.rowNumber === 1);
    
    // Obtener todas las celdas con valores
    const cellsWithValues = config.columns
      .filter(column => row.values[column.key])
      .map(column => {
        const value = row.values[column.key];
        const isPrice = typeof value === 'string' && value.includes('€');
        return {
          cellRef: `${String.fromCharCode(65 + column.index)}${row.rowNumber}`,
          value: isPrice ? formatPrice(value) : value,
          isPrice,
          header: headerRow ? headerRow.values[column.key] : column.key
        };
      });
    
    setSelectedRow(row);
    setEditingValues({
      cells: cellsWithValues,
      slideLocation: row.slideLocation,
      slideElements: [] // Inicializamos el array vacío
    });
    setShowEditDialog(true);
    loadSlides();
  }

  const handleSelectSlide = (slideId: string, element: string | null) => {
    console.log('Slide y elemento seleccionados:', { slideId, element });
    
    const selectedSlide = availableSlides.find(s => s.id === slideId);
    
    // Si solo se seleccionó el slide, actualizamos la ubicación sin añadir elementos
    if (!element) {
      setEditingValues(prev => ({
        ...prev,
        slideLocation: slideId,
        slidePreview: selectedSlide?.imageUrl
      }));
      return;
    }

    // Si se seleccionó un elemento, lo añadimos al array
    setEditingValues(prev => ({
      ...prev,
      slideLocation: slideId,
      slideElements: [
        ...prev.slideElements,
        {
          elementId: element,
          cellRef: '' // Se actualizará cuando el usuario seleccione la celda
        }
      ],
      slidePreview: selectedSlide?.imageUrl
    }));
  };

  const handleAssignCellToElement = (elementId: string, cellRef: string) => {
    setEditingValues(prev => ({
      ...prev,
      slideElements: prev.slideElements.map(el => 
        el.elementId === elementId ? { ...el, cellRef } : el
      )
    }));
  };

  // Función para añadir un cambio al historial
  const addToHistory = (entry: ChangeHistoryEntry) => {
    setChangeHistory(prev => {
      // Si estamos en medio del historial, eliminar los cambios futuros
      const newEntries = prev.entries.slice(0, prev.currentIndex + 1)
      return {
        entries: [...newEntries, entry],
        currentIndex: newEntries.length
      }
    })
  }

  // Función para deshacer el último cambio
  const handleUndo = async () => {
    if (changeHistory.currentIndex < 0 || !data) return

    const currentEntry = changeHistory.entries[changeHistory.currentIndex]
    try {
      // Revertir cambios en la hoja
      const rowToUpdate = data.find(row => row.rowNumber === currentEntry.rowNumber)
      if (!rowToUpdate) return

      const updatedRow = {
        ...rowToUpdate,
        values: currentEntry.previousValues,
        lastUpdate: new Date()
      }

      await updateSheet([updatedRow])

      // Revertir cambios en el slide si es necesario
      if (currentEntry.slideUpdates) {
        const presentationId = localStorage.getItem("connectedSlides")
        if (presentationId) {
          for (const update of currentEntry.slideUpdates) {
            // Invertir los reemplazos
            const reversedReplacements = update.replacements.map(r => ({
              searchText: r.replaceText,
              replaceText: r.searchText
            }))
            
            await slidesService.updateSlideContent(presentationId, [{
              slideId: update.slideId,
              replacements: reversedReplacements
            }])
          }
        }
      }

      // Actualizar el índice del historial
      setChangeHistory(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1
      }))

      toast.success('Cambio deshecho correctamente')
      await loadData() // Recargar datos
    } catch (error) {
      console.error('Error deshaciendo cambios:', error)
      toast.error('Error al deshacer los cambios')
    }
  }

  // Función para mostrar una notificación de progreso
  const showProgressNotification = (message: string, promise: Promise<any>) => {
    toast.promise(promise, {
      loading: message,
      success: (data) => {
        return 'Operación completada correctamente'
      },
      error: (err) => {
        return `Error: ${err.message}`
      },
    })
  }

  // Función para preparar la vista previa
  const preparePreview = async () => {
    if (!selectedRow) return;

    const cellChanges = editingValues.cells.map(cell => ({
      header: cell.header,
      oldValue: String(selectedRow.values[config.columns[cell.cellRef.charCodeAt(0) - 65].key] || ''),
      newValue: String(cell.value)
    })).filter(change => change.oldValue !== change.newValue);

    // Cargar contenido actual de los elementos del slide
    let slideChanges: SlideChange[] = [];
    if (editingValues.slideLocation) {
      const presentationId = localStorage.getItem("connectedSlides");
      if (presentationId) {
        try {
          const elements = await slidesService.getSlideElements(presentationId, editingValues.slideLocation);
          
          slideChanges = editingValues.slideElements.map(element => {
            const cell = editingValues.cells.find(c => c.cellRef === element.cellRef);
            const currentElement = elements.find(e => e.id === element.elementId);
            return {
              elementId: element.elementId,
              oldValue: currentElement?.content || '(No encontrado)',
              newValue: String(cell?.value || '')
            };
          });
        } catch (error) {
          console.error('Error al cargar elementos del slide:', error);
          toast.error('Error al cargar la vista previa');
        }
      }
    }

    setPreviewChanges({
      cells: cellChanges,
      slides: slideChanges
    });

    setShowPreviewDialog(true);
  };

  const handleSave = async () => {
    if (!selectedRow || !data) return;

    const previousValues = { ...selectedRow.values }
    const updatedValues = { ...selectedRow.values }
    editingValues.cells.forEach(cell => {
      const columnIndex = cell.cellRef.charCodeAt(0) - 65
      const columnKey = config.columns[columnIndex].key
      updatedValues[columnKey] = cell.value
    })

    try {
      // Notificar inicio del proceso
      toast.info('Iniciando actualización de datos...')

      // Primero actualizamos la hoja
      const updatedRow = {
        ...selectedRow,
        values: updatedValues,
        lastUpdate: new Date(),
        slideLocation: editingValues.slideLocation
      }

      await showProgressNotification(
        'Actualizando hoja de cálculo...',
        updateSheet([updatedRow])
      )

      let slideUpdates: SlideUpdate[] | undefined

      // Si hay elementos de slide seleccionados, actualizamos la presentación
      if (editingValues.slideLocation && editingValues.slideElements.length > 0) {
        const presentationId = localStorage.getItem("connectedSlides")
        if (!presentationId) {
          throw new Error('No hay presentación conectada')
        }

        // Obtener los elementos actuales del slide
        const slideElements = await slidesService.getSlideElements(
          presentationId,
          editingValues.slideLocation
        )

        toast.info(`Preparando actualización de ${editingValues.slideElements.length} elementos en el slide...`)

        // Crear los reemplazos para cada elemento seleccionado
        slideUpdates = [{
          slideId: editingValues.slideLocation,
          replacements: []
        }]

        for (const element of editingValues.slideElements) {
          const cell = editingValues.cells.find(c => c.cellRef === element.cellRef)
          const slideElement = slideElements.find(se => se.id === element.elementId)
          
          if (cell && slideElement) {
            slideUpdates[0].replacements.push({
              searchText: slideElement.content,
              replaceText: cell.value.toString()
            })
          }
        }

        if (slideUpdates[0].replacements.length > 0) {
          await showProgressNotification(
            'Actualizando presentación...',
            slidesService.updateSlideContent(presentationId, slideUpdates)
          )
        }
      }

      // Registrar el cambio en el historial
      addToHistory({
        timestamp: new Date(),
        rowNumber: selectedRow.rowNumber,
        previousValues,
        newValues: updatedValues,
        slideUpdates
      })

      setShowEditDialog(false)
      setSelectedRow(null)
      toast.success('¡Todos los cambios se aplicaron correctamente!')
    } catch (error) {
      console.error('Error updating data:', error)
      toast.error('Error al actualizar los datos')
    }
  }

  // Función para extraer el valor numérico de un precio
  const extractPriceValue = (price: string): number => {
    const numericValue = price.replace(/[^0-9.,]/g, '').replace(',', '.');
    return parseFloat(numericValue);
  };

  // Función para extraer el código ISO de la moneda de un precio
  const extractCurrencyISO = (price: string): string => {
    for (const [code, info] of Object.entries(CURRENCIES)) {
      if (price.includes(info.symbol)) {
        return code;
      }
    }
    return 'EUR'; // Valor por defecto
  };

  // Filtrado avanzado de datos
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    return data
      .filter(row => {
        // Filtro por término de búsqueda
        if (searchTerm && !Object.values(row.values)
          .some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))) {
          return false;
        }

        // Filtro por rango de precios
        const hasValidPriceFilter = filterOptions.priceRange.min !== null || filterOptions.priceRange.max !== null;
        if (hasValidPriceFilter) {
          const rowHasValidPrice = Object.values(row.values).some(value => {
            if (typeof value === 'string' && /[€$¥£FrBs.]/.test(value)) {
              const priceValue = extractPriceValue(value);
              if (filterOptions.priceRange.min !== null && priceValue < filterOptions.priceRange.min) return false;
              if (filterOptions.priceRange.max !== null && priceValue > filterOptions.priceRange.max) return false;
              return true;
            }
            return false;
          });
          if (!rowHasValidPrice) return false;
        }

        // Filtro por monedas (usando códigos ISO)
        if (filterOptions.currencies.length > 0) {
          const rowHasSelectedCurrency = Object.values(row.values).some(value => {
            if (typeof value === 'string') {
              const currencyISO = extractCurrencyISO(value);
              return filterOptions.currencies.includes(currencyISO);
            }
            return false;
          });
          if (!rowHasSelectedCurrency) return false;
        }

        // Filtro por rango de fechas
        if (filterOptions.dateRange.start || filterOptions.dateRange.end) {
          const rowDate = row.lastUpdate ? new Date(row.lastUpdate) : null;
          if (!rowDate) return false;
          if (filterOptions.dateRange.start && rowDate < filterOptions.dateRange.start) return false;
          if (filterOptions.dateRange.end && rowDate > filterOptions.dateRange.end) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sorting.key === 'rowNumber') {
          return sorting.direction === "asc" ? 
            a.rowNumber - b.rowNumber : 
            b.rowNumber - a.rowNumber;
        }

        const aValue = a.values[sorting.key];
        const bValue = b.values[sorting.key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sorting.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        const strA = String(aValue || '').toLowerCase();
        const strB = String(bValue || '').toLowerCase();
        return sorting.direction === "asc" 
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
  }, [data, searchTerm, sorting, filterOptions]);

  // Calcular datos paginados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Inicializar sorting por rowNumber
  useEffect(() => {
    setSorting({ key: 'rowNumber', direction: 'asc' });
  }, []);

  // Función para formatear los cambios para mostrarlos
  const formatChanges = (): PreviewChanges => {
    if (!selectedRow || !editingValues) return {
      cells: [],
      slides: []
    }

    const cells = editingValues.cells.map(cell => {
      const columnIndex = cell.cellRef.charCodeAt(0) - 65
      const columnKey = config.columns[columnIndex]?.key
      if (!columnKey) return null
      const oldValue = String(selectedRow.values[columnKey] || '')
      return {
        header: columnKey,
        oldValue,
        newValue: String(cell.value)
      }
    }).filter((cell): cell is NonNullable<typeof cell> => cell !== null)

    const slides = editingValues.slideElements.map(element => {
      const cell = editingValues.cells.find(c => c.cellRef === element.cellRef)
      return {
        elementId: element.elementId,
        oldValue: element.content || '',
        newValue: String(cell?.value || '')
      }
    })

    return { cells, slides }
  }

  // Efecto para verificar actualizaciones programadas
  useEffect(() => {
    const checkScheduledUpdates = async () => {
      const now = new Date()
      const pendingUpdates = scheduledUpdates.filter(
        update => update.status === 'pending' && isBefore(update.scheduledFor, now)
      )

      for (const update of pendingUpdates) {
        try {
          // Actualizar la hoja
          const rowToUpdate = data?.find(row => row.rowNumber === update.rowNumber)
          if (!rowToUpdate) continue

          const updatedRow = {
            ...rowToUpdate,
            values: update.newValues,
            lastUpdate: new Date()
          }

          await updateSheet([updatedRow])

          // Actualizar slides si es necesario
          if (update.slideUpdates) {
            const presentationId = localStorage.getItem("connectedSlides")
            if (presentationId) {
              for (const slideUpdate of update.slideUpdates) {
                await slidesService.updateSlideContent(presentationId, [slideUpdate])
              }
            }
          }

          // Actualizar estado de la actualización programada
          setScheduledUpdates(prev => prev.map(u => 
            u.id === update.id 
              ? { ...u, status: 'completed' }
              : u
          ))

          toast.success(`Actualización programada completada para la fila ${update.rowNumber}`)
        } catch (err) {
          const error = err as Error
          console.error('Error en actualización programada:', error)
          setScheduledUpdates(prev => prev.map(u => 
            u.id === update.id 
              ? { ...u, status: 'failed', error: error.message }
              : u
          ))
          toast.error(`Error en actualización programada para la fila ${update.rowNumber}`)
        }
      }
    }

    const interval = setInterval(checkScheduledUpdates, 60000)
    return () => clearInterval(interval)
  }, [scheduledUpdates, data])

  // Función para programar una actualización
  const handleScheduleUpdate = () => {
    if (!selectedRow || !scheduledDate) return;

    const newUpdate: ScheduledUpdate = {
      id: Math.random().toString(36).substr(2, 9),
      rowNumber: selectedRow.rowNumber,
      newValues: editingValues.cells.reduce<Values>((acc, cell) => {
        const columnIndex = cell.cellRef.charCodeAt(0) - 65;
        const columnKey = config.columns[columnIndex].key;
        acc[columnKey] = cell.value;
        return acc;
      }, {} as Values),
      scheduledFor: scheduledDate,
      status: 'pending'
    };

    if (editingValues.slideElements.length > 0) {
      newUpdate.slideUpdates = [{
        slideId: editingValues.slideLocation!,
        replacements: editingValues.slideElements.map(element => {
          const cell = editingValues.cells.find(c => c.cellRef === element.cellRef)
          return {
            searchText: element.elementId,
            replaceText: cell?.value.toString() || ''
          }
        })
      }]
    }

    setScheduledUpdates(prev => [...prev, newUpdate])
    setShowScheduleDialog(false)
    toast.success(`Actualización programada para ${format(scheduledDate, 'dd/MM/yyyy HH:mm', { locale: es })}`)
  }

  // Función para comparar versiones
  const handleCompareVersions = async () => {
    if (!selectedRow) return

    const comparison: VersionComparison = {
      current: {
        values: Object.entries(selectedRow.values as Values).reduce((acc, [key, value]) => {
          acc[key] = value?.toString() || ''
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Obtener contenido actual del slide si existe
    if (selectedRow.slideLocation) {
      const presentationId = localStorage.getItem("connectedSlides")
      if (presentationId) {
        const elements = await slidesService.getSlideElements(
          presentationId,
          selectedRow.slideLocation
        ) as SlideElement[]
        comparison.current.slideContent = elements.reduce((acc, el) => {
          acc[el.id] = el.content || ''
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Buscar versión anterior en el historial
    const previousEntry = changeHistory.entries
      .find(entry => entry.rowNumber === selectedRow.rowNumber)
    
    if (previousEntry) {
      comparison.previous = {
        values: Object.entries(previousEntry.previousValues).reduce((acc, [key, value]) => {
          acc[key] = value?.toString() || ''
          return acc
        }, {} as Record<string, string>),
        timestamp: previousEntry.timestamp
      }
    }

    // Buscar actualizaciones programadas
    const scheduledUpdate = scheduledUpdates
      .find(update => 
        update.rowNumber === selectedRow.rowNumber && 
        update.status === 'pending'
      )

    if (scheduledUpdate) {
      comparison.scheduled = {
        values: Object.entries(scheduledUpdate.newValues).reduce((acc, [key, value]) => {
          acc[key] = value?.toString() || ''
          return acc
        }, {} as Record<string, string>),
        scheduledFor: scheduledUpdate.scheduledFor
      }
    }

    setVersionComparison(comparison)
    setShowCompareDialog(true)
  }

  // Función para formatear los cambios para mostrarlos
  const formatHistoryEntry = (entry: ChangeHistoryEntry) => {
    const changes = Object.keys(entry.newValues).map(key => {
      const oldValue = entry.previousValues[key]
      const newValue = entry.newValues[key]
      if (oldValue !== newValue) {
        return `${key}: ${oldValue} → ${newValue}`
      }
      return null
    }).filter(Boolean)

    const slideChanges = entry.slideUpdates?.map(update => 
      update.replacements.map(r => `${r.searchText} → ${r.replaceText}`).join(', ')
    ).filter(Boolean)

    return {
      timestamp: format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
      rowNumber: entry.rowNumber,
      changes,
      slideChanges
    }
  }

  const formatPrice = (price: string, currency: string = '€'): string => {
    // Eliminar cualquier símbolo de moneda y espacios
    const cleanPrice = price.replace(/[€$¥£FrBs.\s]/g, '').replace(',', '.');
    const number = parseFloat(cleanPrice);
    const currencyInfo = Object.entries(CURRENCIES).find(([_, info]) => info.symbol === currency)?.[1];
    
    if (currencyInfo) {
      const formattedNumber = number.toFixed(2);
      const formattedPrice = currencyInfo.symbolPosition === 'before' 
        ? `${currency}${formattedNumber}`
        : `${formattedNumber}${currency}`;
      return `${formattedPrice} ${currencyInfo.iso}`;
    }
    
    return `${currency}${number.toFixed(2)}`;
  };

  // Función mejorada para actualizar precios con validación
  const updatePrices = async (options: PriceUpdateOptions) => {
    if (!data) return;

    const rowsToUpdate = selectedRows.length > 0 
      ? data.filter(row => selectedRows.includes(row.id))
      : [selectedRow!];

    try {
      const updatedRows = rowsToUpdate.map(row => {
        const updatedValues = { ...row.values };
        
        Object.entries(updatedValues).forEach(([key, value]) => {
          if (typeof value === 'string' && /[€$¥£FrBs.]/.test(value)) {
            const numericValue = parseFloat(value.replace(/[€$¥£FrBs.\s]/g, '').replace(',', '.'));
            if (isNaN(numericValue)) {
              throw new Error(`Valor inválido en la columna ${key}: ${value}`);
            }

            let newValue = numericValue;
            switch (options.operation) {
              case 'percentage':
                newValue = numericValue * (1 + options.value / 100);
                break;
              case 'fixed':
                newValue = numericValue + options.value;
                break;
              case 'currency':
                if (options.fromCurrency && options.toCurrency) {
                  const fromRate = CURRENCIES[options.fromCurrency].rate;
                  const toRate = CURRENCIES[options.toCurrency].rate;
                  newValue = (numericValue * toRate) / fromRate;
                }
                break;
            }

            if (newValue < 0) {
              throw new Error(`El precio resultante es negativo en la columna ${key}`);
            }

            const targetCurrency = options.operation === 'currency' 
              ? CURRENCIES[options.toCurrency!].symbol 
              : extractCurrencyISO(value);
            
            const formattedPrice = formatPrice(newValue.toString(), targetCurrency);
            const validation = validatePrice(formattedPrice);
            
            if (!validation.isValid) {
              throw new Error(`${validation.error} en la columna ${key}`);
            }
            
            updatedValues[key] = formattedPrice;
          }
        });

        return {
          ...row,
          values: updatedValues,
          lastUpdate: new Date()
        };
      });

      await updateSheet(updatedRows);
      
      // Invalidar caché de datos
      Object.keys(cache).forEach(key => {
        if (key.startsWith('data_')) {
          delete cache[key];
        }
      });
      
      toast.success('Precios actualizados correctamente', {
        description: `Se actualizaron ${updatedRows.length} registros`
      });
      
      loadData();
    } catch (error) {
      console.error('Error actualizando precios:', error);
      showError('INVALID_PRICE', error as Error);
    }
  };

  // Función mejorada para validar precios
  const validatePrice = (price: string): { isValid: boolean; error?: string } => {
    const priceRegex = /^[€$¥£FrBs.]?\d+([.,]\d{2})?[€$¥£FrBs.]?$/;
    if (!priceRegex.test(price.trim())) {
      return {
        isValid: false,
        error: 'El formato del precio no es válido'
      };
    }
    return { isValid: true };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se encontraron datos</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Filter className="h-4 w-4" />
            Filtros Avanzados
          </Button>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setShowHistoryDialog(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <p>Ver historial de cambios realizados</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={handleUndo}
                  disabled={changeHistory.currentIndex < 0}
                >
                  <Undo className="h-4 w-4 mr-2" />
                  Deshacer
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <p>Deshacer el último cambio realizado</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={loadData}
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Recargar
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <p>Recargar datos de la hoja</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSync}
                  disabled={selectedRows.length === 0}
                  className="bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-700 dark:hover:bg-violet-800"
                >
                  Sincronizar ({selectedRows.length})
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <p>Sincronizar filas seleccionadas con la presentación</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium mb-2">Filtros Avanzados</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango de Precios</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mínimo"
                  value={filterOptions.priceRange.min || ''}
                  onChange={(e) => setFilterOptions(prev => ({
                    ...prev,
                    priceRange: {
                      ...prev.priceRange,
                      min: e.target.value ? parseFloat(e.target.value) : null
                    }
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Máximo"
                  value={filterOptions.priceRange.max || ''}
                  onChange={(e) => setFilterOptions(prev => ({
                    ...prev,
                    priceRange: {
                      ...prev.priceRange,
                      max: e.target.value ? parseFloat(e.target.value) : null
                    }
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Monedas</label>
              <div className="flex flex-wrap gap-2" style={{ overflow: 'auto' }}>
                {Object.entries(CURRENCIES)
                  .sort((a, b) => a[1].region.localeCompare(b[1].region))
                  .map(([code, info]) => (
                    <Button
                      key={code}
                      variant={filterOptions.currencies.includes(code) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterOptions(prev => ({
                        ...prev,
                        currencies: prev.currencies.includes(code)
                          ? prev.currencies.filter(c => c !== code)
                          : [...prev.currencies, code]
                      }))}
                      className="flex items-center gap-1"
                      style={{ minWidth: 'fit-content' }}
                    >
                      <span style={{ minWidth: 0, overflow: 'auto' }}>{info.symbol}</span>
                      <span style={{ minWidth: 0, overflow: 'auto' }}>{code}</span>
                    </Button>
                  ))}
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Rango de Fechas</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Calendar
                    mode="single"
                    selected={filterOptions.dateRange.start || undefined}
                    onSelect={(date?: Date) => setFilterOptions((prev: FilterOptions) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: date || null }
                    }))}
                    className="rounded-md border"
                  />
                </div>
                <div className="flex-1">
                  <Calendar
                    mode="single"
                    selected={filterOptions.dateRange.end || undefined}
                    onSelect={(date?: Date) => setFilterOptions((prev: FilterOptions) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: date || null }
                    }))}
                    className="rounded-md border"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFilterOptions({
                priceRange: { min: null, max: null },
                currencies: [],
                dateRange: { start: null, end: null }
              })}
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.length === filteredData.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {config.columns
                .filter(column => 
                  filteredData.some(row => row.values[column.key])
                )
                .map(column => (
                  <TableHead key={column.key}>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {String.fromCharCode(65 + column.index)}
                      {sorting.key === column.key && (
                        <ArrowUpDown className={`h-4 w-4 ${
                          sorting.direction === "desc" ? "transform rotate-180" : ""
                        }`} />
                      )}
                    </Button>
                  </TableHead>
                ))}
              <TableHead className="w-12">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow 
                key={row.id}
                className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(row.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows([...selectedRows, row.id])
                      } else {
                        setSelectedRows(selectedRows.filter(id => id !== row.id))
                      }
                    }}
                  />
                </TableCell>
                {config.columns
                  .filter(column => 
                    filteredData.some(row => row.values[column.key])
                  )
                  .map(column => (
                    <TableCell key={column.key}>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-200">{row.values[column.key]}</span>
                        {row.values[column.key] && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {`${String.fromCharCode(65 + column.index)}${row.rowNumber}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(row)}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <select
            className="border rounded p-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5 por página</option>
            <option value="10">10 por página</option>
            <option value="20">20 por página</option>
            <option value="50">50 por página</option>
          </select>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Editar Registro</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Modifica los valores y selecciona los elementos a actualizar
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4" style={{ overflow: 'auto' }}>
            {editingValues.cells?.map((cell, index) => (
              <div key={cell.cellRef} className="grid grid-cols-4 items-center gap-4">
                <label htmlFor={`cell-${index}`} className="text-right font-medium ">
                  {cell.header}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">({cell.cellRef})</span>
                  {cell.isPrice && <span className="text-xs text-green-600 ml-1">(Precio)</span>}
                </label>
                <div className="col-span-3">
                  <Input
                    id={`cell-${index}`}
                    value={cell.value}
                    className={`${cell.isPrice ? "bg-green-50" : ""} max-w-full`}
                    onChange={(e) => {
                      const newCells = [...editingValues.cells];
                      newCells[index].value = e.target.value;
                      setEditingValues({
                        ...editingValues,
                        cells: newCells
                      });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Elementos Seleccionados en el Slide</h4>
              {editingValues.slideElements.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {editingValues.slideElements.map((el, idx) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-2">
                      <div className="text-box">Elemento {idx + 1}</div>
                      {el.cellRef && (
                        <div className="text-green-600 text-box">
                          → {editingValues.cells.find(c => c.cellRef === el.cellRef)?.header}
                        </div>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <SlideSelector
                token={token}
                presentationId={localStorage.getItem("connectedSlides") || ''}
                selectedSlideId={editingValues.slideLocation}
                selectedElements={editingValues.slideElements}
                onSelect={handleSelectSlide}
              />
            </div>

            {editingValues.slideElements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Asignar Valores a Elementos del Slide</h4>
                {editingValues.slideElements.map((el, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-md" style={{ overflow: 'auto' }}>
                    <span className="font-medium min-w-[120px]" style={{ overflow: 'auto' }}>Elemento {idx + 1}:</span>
                    <div className="flex-1 min-w-0" style={{ overflow: 'auto' }}>
                      <select 
                        value={el.cellRef}
                        onChange={(e) => handleAssignCellToElement(el.elementId, e.target.value)}
                        className="w-full border rounded p-2"
                        style={{ overflow: 'auto' }}
                      >
                        <option value="" style={{ overflow: 'auto' }}>Selecciona el valor a asignar</option>
                        {editingValues.cells.map(cell => (
                          <option key={cell.cellRef} value={cell.cellRef} style={{ overflow: 'auto' }}>
                            {cell.header || 'Sin nombre'} ({cell.value.toString().substring(0, 50)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingValues(prev => ({
                          ...prev,
                          slideElements: prev.slideElements.filter(elem => elem.elementId !== el.elementId)
                        }));
                      }}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={handleCompareVersions}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Comparar
              </Button>
              <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
                <Clock className="h-4 w-4 mr-2" />
                Programar
              </Button>
              <Button variant="outline" onClick={preparePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
              <Button onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa de Cambios</DialogTitle>
            <DialogDescription>
              Revisa los cambios antes de guardar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {previewChanges.cells.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Cambios en Celdas:</h4>
                <div className="space-y-2">
                  {previewChanges.cells.map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{change.header}:</span>
                      <span className="text-slate-500 dark:text-slate-400">{change.oldValue}</span>
                      <span>→</span>
                      <span className="text-green-600">{change.newValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewChanges.slides.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Cambios en Slide:</h4>
                <div className="space-y-2">
                  {previewChanges.slides.map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{change.elementId}:</span>
                      <span className="text-slate-500 dark:text-slate-400">{change.oldValue}</span>
                      <span>→</span>
                      <span className="text-green-600">{change.newValue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Cambios</DialogTitle>
            <DialogDescription>
              Lista de cambios realizados en orden cronológico inverso
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4">
              {changeHistory.entries.map((entry, index) => {
                const { timestamp, rowNumber, changes, slideChanges } = formatHistoryEntry(entry)
                return (
                  <div 
                    key={index} 
                    className={`p-4 border rounded-lg ${
                      index > changeHistory.currentIndex ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Fila {rowNumber}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {timestamp}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {changes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Cambios en celdas:</h4>
                          <ul className="text-sm space-y-1">
                            {changes.map((change, i) => (
                              <li key={i} className="text-slate-500 dark:text-slate-400">
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {slideChanges && slideChanges.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Cambios en slides:</h4>
                          <ul className="text-sm space-y-1">
                            {slideChanges.map((change, i) => (
                              <li key={i} className="text-slate-500 dark:text-slate-400">
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }).reverse()}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Programar Actualización</DialogTitle>
            <DialogDescription>
              Selecciona la fecha y hora para la actualización automática
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Calendar
              mode="single"
              selected={scheduledDate}
              onSelect={setScheduledDate}
              locale={es}
              disabled={(date) => isBefore(date, new Date())}
            />
            
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 6, 8, 12, 24].map(hours => (
                <Button
                  key={hours}
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduledDate(addHours(new Date(), hours))}
                >
                  +{hours}h
                </Button>
              ))}
            </div>

            {scheduledDate && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Programado para: {format(scheduledDate, 'dd/MM/yyyy HH:mm', { locale: es })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleScheduleUpdate}
              disabled={!scheduledDate}
            >
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comparación de Versiones</DialogTitle>
            <DialogDescription>
              Compara las diferentes versiones del registro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {versionComparison && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Versión Actual:</h4>
                  <div className="space-y-2">
                    {Object.entries(versionComparison.current.values).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {versionComparison.previous && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Versión Anterior ({format(versionComparison.previous.timestamp, 'dd/MM/yyyy HH:mm')}):
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(versionComparison.previous.values).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className={`
                            ${value !== versionComparison.current.values[key] 
                              ? 'text-yellow-600' 
                              : 'text-slate-500 dark:text-slate-400'
                            }
                          `}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {versionComparison.scheduled && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Versión Programada ({format(versionComparison.scheduled.scheduledFor, 'dd/MM/yyyy HH:mm')}):
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(versionComparison.scheduled.values).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{' '}
                          <span className={`
                            ${value !== versionComparison.current.values[key] 
                              ? 'text-green-600' 
                              : 'text-slate-500 dark:text-slate-400'
                            }
                          `}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Actualización de Precios</DialogTitle>
            <DialogDescription>
              Modifica los precios de los elementos seleccionados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Operación</label>
              <select
                className="w-full border rounded p-2"
                value={priceUpdateOptions.operation}
                onChange={(e) => setPriceUpdateOptions({
                  ...priceUpdateOptions,
                  operation: e.target.value as PriceUpdateOptions['operation']
                })}
              >
                <option value="percentage">Incremento/Decremento por Porcentaje</option>
                <option value="fixed">Ajuste por Valor Fijo</option>
                <option value="currency">Conversión entre Monedas</option>
              </select>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {priceUpdateOptions.operation === 'percentage' && 
                  'Aumenta o disminuye los precios por un porcentaje. Usa valores negativos para decrementar.'}
                {priceUpdateOptions.operation === 'fixed' && 
                  'Suma o resta una cantidad fija a los precios. Usa valores negativos para restar.'}
                {priceUpdateOptions.operation === 'currency' && 
                  'Convierte los precios a una moneda diferente usando tasas de cambio aproximadas.'}
              </p>
            </div>

            {priceUpdateOptions.operation === 'currency' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Moneda Origen</label>
                  <select
                    className="w-full border rounded p-2"
                    value={priceUpdateOptions.fromCurrency}
                    onChange={(e) => setPriceUpdateOptions({
                      ...priceUpdateOptions,
                      fromCurrency: e.target.value
                    })}
                  >
                    {Object.entries(CURRENCIES)
                      .sort((a, b) => a[1].region.localeCompare(b[1].region))
                      .map(([code, info]) => (
                        <option key={code} value={code}>
                          {info.region} - {info.name} ({info.symbol}) [{info.iso}]
                        </option>
                      ))}
                  </select>
                  {priceUpdateOptions.fromCurrency && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {CURRENCIES[priceUpdateOptions.fromCurrency].description}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Moneda Destino</label>
                  <select
                    className="w-full border rounded p-2"
                    value={priceUpdateOptions.toCurrency}
                    onChange={(e) => setPriceUpdateOptions({
                      ...priceUpdateOptions,
                      toCurrency: e.target.value
                    })}
                  >
                    {Object.entries(CURRENCIES).map(([code, info]) => (
                      <option key={code} value={code}>
                        {info.name} ({info.symbol})
                      </option>
                    ))}
                  </select>
                  {priceUpdateOptions.toCurrency && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {CURRENCIES[priceUpdateOptions.toCurrency].description}
                    </p>
                  )}
                </div>
                {priceUpdateOptions.fromCurrency && priceUpdateOptions.toCurrency && (
                  <div className="col-span-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    <p>Tasa de cambio aproximada:</p>
                    <p className="font-mono">
                      1 {CURRENCIES[priceUpdateOptions.fromCurrency].symbol} = {' '}
                      {(CURRENCIES[priceUpdateOptions.toCurrency].rate / CURRENCIES[priceUpdateOptions.fromCurrency].rate).toFixed(4)} {' '}
                      {CURRENCIES[priceUpdateOptions.toCurrency].symbol}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {priceUpdateOptions.operation === 'percentage' ? 'Porcentaje de Cambio' : 'Valor de Ajuste'}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={priceUpdateOptions.value}
                    onChange={(e) => setPriceUpdateOptions({
                      ...priceUpdateOptions,
                      value: parseFloat(e.target.value) || 0
                    })}
                  />
                  {priceUpdateOptions.operation === 'percentage' && <span>%</span>}
                  {priceUpdateOptions.operation === 'fixed' && <span>€</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {priceUpdateOptions.operation === 'percentage' 
                    ? 'Ejemplo: 10 para aumentar un 10%, -10 para reducir un 10%'
                    : 'Ejemplo: 5 para añadir 5€, -5 para restar 5€'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              updatePrices(priceUpdateOptions);
              setShowPriceDialog(false);
            }}>
              Actualizar Precios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 