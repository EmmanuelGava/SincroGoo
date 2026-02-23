"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  FilaHoja, 
  FilaSeleccionada, 
  ColumnaHoja,
  ValorCelda 
} from '../../types'
import { useGoogleServices } from '../../hooks/useGoogleServices'
import { useUI } from '../UIContext'

interface SheetsContextType {
  // Datos
  filas: FilaHoja[]
  columnas: ColumnaHoja[]
  filaSeleccionada: FilaSeleccionada | null
  idHojaCalculo: string
  tituloHoja: string
  
  // Acciones
  setFilaSeleccionada: (fila: FilaSeleccionada | null) => void
  sincronizarHojas: () => Promise<void>
  actualizarFila: (filaId: string, nuevosValores: ValorCelda[]) => void
  guardarFila: (filaId: string, nuevosValores: ValorCelda[]) => Promise<boolean>
}

const SheetsContext = createContext<SheetsContextType | null>(null)

interface SheetsProviderProps {
  children: React.ReactNode
  idHojaCalculo: string
}

export function SheetsProvider({ children, idHojaCalculo }: SheetsProviderProps) {
  const [filas, setFilas] = useState<FilaHoja[]>([])
  const [columnas, setColumnas] = useState<ColumnaHoja[]>([])
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSeleccionada | null>(null)
  const [tituloHoja, setTituloHoja] = useState<string>('')
  
  const { cargarHojaCalculo, actualizarRangoHoja } = useGoogleServices()
  const { setCargando } = useUI()

  const cargarDatos = async () => {
    if (!idHojaCalculo) {
      console.log('❌ [SheetsContext] No hay ID de hoja de cálculo');
      return;
    }
    
    setCargando(true);
    try {
      console.log('🔄 [SheetsContext] Cargando datos de hoja:', idHojaCalculo);
      const resultado = await cargarHojaCalculo(idHojaCalculo);
      
      console.log('📦 [SheetsContext] Datos sin procesar:', resultado);
      
      // Verificar que el resultado sea exitoso y contenga datos
      if (resultado && resultado.exito && resultado.datos) {
        // Verificar la estructura de datos real
        console.log('🔍 [SheetsContext] Estructura de datos:', {
          tieneEncabezados: !!resultado.datos.encabezados,
          tieneFilas: !!resultado.datos.filas,
          datosCompletos: resultado.datos
        });
        
        // Acceder a encabezados y filas desde la propiedad 'datos'
        if (resultado.datos.encabezados && resultado.datos.filas) {
          // Procesar encabezados
          const columnasFormateadas: ColumnaHoja[] = resultado.datos.encabezados.map((titulo: string, index: number) => ({
            id: `col-${index + 1}`,
            titulo: titulo || `Columna ${index + 1}`
          }));

          // Procesar filas
          const filasFormateadas: FilaHoja[] = resultado.datos.filas.map((fila: any, rowIndex: number) => {
            // Crear los valores de las celdas
            const valoresFila: ValorCelda[] = fila.valores.map((valor: any, colIndex: number) => ({
              columnaId: `col-${colIndex + 1}`,
              valor: valor.valor?.toString() || '',
              tipo: valor.tipo
            }));

            return {
              id: `fila-${rowIndex + 1}`,
              numeroFila: fila.indice,
              valores: valoresFila,
              ultimaActualizacion: new Date()
            };
          });

          console.log('✅ [SheetsContext] Datos procesados:', {
            filas: filasFormateadas.length,
            columnas: columnasFormateadas.length,
            ejemploFila: filasFormateadas.length > 0 ? filasFormateadas[0] : null,
            ejemploColumna: columnasFormateadas.length > 0 ? columnasFormateadas[0] : null
          });
          
          setFilas(filasFormateadas);
          setColumnas(columnasFormateadas);
          if (resultado.datos.titulo) setTituloHoja(resultado.datos.titulo);
        } else {
          console.warn('⚠️ [SheetsContext] No se encontraron encabezados o filas en los datos');
          toast.error('No se pudieron cargar los datos de la hoja');
          setFilas([]);
          setColumnas([]);
        }
      } else {
        console.warn('⚠️ [SheetsContext] No se recibieron datos válidos');
        toast.error('No se pudieron cargar los datos de la hoja');
        setFilas([]);
        setColumnas([]);
      }
    } catch (error) {
      console.error('❌ [SheetsContext] Error al cargar datos:', error);
      toast.error('Error al cargar la hoja de cálculo');
      setFilas([]);
      setColumnas([]);
    } finally {
      setCargando(false);
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, [idHojaCalculo]);

  const sincronizarHojas = async () => {
    await cargarDatos();
  }

  const actualizarFila = (filaId: string, nuevosValores: ValorCelda[]) => {
    setFilas(prev =>
      prev.map(f =>
        f.id === filaId ? { ...f, valores: nuevosValores, ultimaActualizacion: new Date() } : f
      )
    )
    if (filaSeleccionada?.id === filaId) {
      setFilaSeleccionada({ ...filaSeleccionada, valores: nuevosValores })
    }
  }

  const columnaALetra = (n: number): string => {
    if (n < 26) return String.fromCharCode(65 + n)
    return columnaALetra(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26))
  }

  const guardarFila = async (filaId: string, nuevosValores: ValorCelda[]): Promise<boolean> => {
    const fila = filas.find(f => f.id === filaId)
    if (!fila || !idHojaCalculo) return false
    const rowSheets = (fila.numeroFila ?? 0) + 1
    const lastCol = columnaALetra(columnas.length - 1)
    const range = `A${rowSheets}:${lastCol}${rowSheets}`
    const valores = [nuevosValores.map(v => v.valor ?? '')]
    const ok = await actualizarRangoHoja(idHojaCalculo, range, valores)
    if (ok) actualizarFila(filaId, nuevosValores)
    return ok
  }

  const value: SheetsContextType = {
    filas,
    columnas,
    filaSeleccionada,
    idHojaCalculo,
    tituloHoja,
    setFilaSeleccionada,
    sincronizarHojas,
    actualizarFila,
    guardarFila
  }

  return (
    <SheetsContext.Provider value={value}>
      {children}
    </SheetsContext.Provider>
  )
}

export function useSheets() {
  const context = useContext(SheetsContext)
  if (!context) {
    throw new Error('useSheets debe ser usado dentro de un SheetsProvider')
  }
  return context
} 