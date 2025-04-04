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
  
  // Acciones
  setFilaSeleccionada: (fila: FilaSeleccionada | null) => void
  sincronizarHojas: () => Promise<void>
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
  
  const { cargarHojaCalculo } = useGoogleServices()
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

  const value: SheetsContextType = {
    filas,
    columnas,
    filaSeleccionada,
    idHojaCalculo,
    setFilaSeleccionada,
    sincronizarHojas
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