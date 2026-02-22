"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableContainer,
  TableRow,
  Paper,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Tooltip
} from "@mui/material"
import { Search, Edit, Save, ChevronUp, ChevronDown, Link, Presentation, X as Close } from "lucide-react"
import { toast } from "sonner"
import { useSheets } from "../../contexts"
import { useUI } from "../../contexts"
import { useSlides } from "../../contexts/SlidesContext"
import { BotonSincronizar } from "./BotonSincronizar"
import { SidebarSlides } from "../slides/SidebarSlides"
import { 
  FilaHoja, 
  FilaSeleccionada, 
  ColumnaHoja as Columna,
  ValorCelda,
  type ValoresFila
} from '../../types/sheets'

interface CeldasEnlazadasMap {
  [key: string]: boolean
}

export function TablaHojas() {
  const { filas, columnas, filaSeleccionada, setFilaSeleccionada, tituloHoja: tituloHojaContext, guardarFila } = useSheets()
  const { cargando, tituloHoja: tituloHojaUI } = useUI()
  const tituloHoja = tituloHojaContext || tituloHojaUI || 'Hoja de cálculo'
  const { 
    diapositivas,
    diapositivaSeleccionada,
    diapositivasConAsociaciones,
    cargandoDiapositivas,
    idPresentacion,
    manejarSeleccionDiapositiva,
    elementosActuales
  } = useSlides()

  const [busqueda, setBusqueda] = useState("")
  const [columnaOrden, setColumnaOrden] = useState<string | null>(null)
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [filasFiltradas, setFilasFiltradas] = useState<FilaHoja[]>(filas)
  const [editandoFila, setEditandoFila] = useState<string | null>(null)
  const [valoresEditados, setValoresEditados] = useState<ValorCelda[]>([])
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const [filaParaSlides, setFilaParaSlides] = useState<FilaSeleccionada | null>(null)

  // Crear mapa de celdas enlazadas
  const celdasEnlazadas = elementosActuales.reduce((acc: CeldasEnlazadasMap, elemento) => {
    if (elemento.columnaAsociada && filaSeleccionada?.id) {
      const key = `${filaSeleccionada.id}-${elemento.columnaAsociada}`
      acc[key] = true
    }
    return acc
  }, {})

  // Efecto para seleccionar la primera diapositiva cuando se abre el sidebar
  useEffect(() => {
    if (sidebarAbierto && diapositivas.length > 0 && filaParaSlides) {
      manejarSeleccionDiapositiva(diapositivas[0].id, filaParaSlides)
    }
  }, [sidebarAbierto, diapositivas])

  // Log inicial de datos
  useEffect(() => {
    console.log('📊 [TablaHojas] Estado inicial:', {
      filas: filas.length,
      columnas: columnas.length,
      cargando,
      datosFilas: filas.map(f => ({
        id: f.id,
        valores: f.valores
      })),
      datosColumnas: columnas
    })
    
    // Inicializar filasFiltradas con las filas actuales
    setFilasFiltradas(filas)
  }, [filas, columnas, cargando])

  useEffect(() => {
    console.log('🔄 [TablaHojas] Actualizando filas filtradas:', {
      totalFilas: filas.length,
      busqueda,
      columnaOrden,
      datosFilas: filas.map(f => ({
        id: f.id,
        valores: f.valores
      }))
    })

    let filasActualizadas = [...filas]
    
    // Solo aplicar filtros si hay búsqueda o ordenamiento
    if (!busqueda && !columnaOrden) {
      setFilasFiltradas(filasActualizadas)
      return
    }
    
    if (busqueda) {
      filasActualizadas = filasActualizadas.filter(fila => 
        fila.valores.some(valor => 
          valor.valor.toLowerCase().includes(busqueda.toLowerCase())
        )
      )
    }
    
    if (columnaOrden) {
      filasActualizadas.sort((a, b) => {
        const valorA = a.valores.find(v => v.columnaId === columnaOrden)?.valor || ''
        const valorB = b.valores.find(v => v.columnaId === columnaOrden)?.valor || ''
        return ordenAscendente 
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA)
      })
    }
    
    console.log('✅ [TablaHojas] Filas filtradas actualizadas:', {
      total: filasActualizadas.length,
      datos: filasActualizadas.map(f => ({
        id: f.id,
        valores: f.valores
      }))
    })
    setFilasFiltradas(filasActualizadas)
  }, [filas, busqueda, columnaOrden, ordenAscendente])

  const ordenarPorColumna = (columnaId: string) => {
    console.log('🔄 [TablaHojas] Ordenando por columna:', {
      columnaId,
      ordenActual: ordenAscendente
    })
    if (columnaOrden === columnaId) {
      setOrdenAscendente(!ordenAscendente)
    } else {
      setColumnaOrden(columnaId)
      setOrdenAscendente(true)
    }
  }

  const iniciarEdicion = (fila: FilaHoja) => {
    setEditandoFila(fila.id)
    setValoresEditados([...fila.valores])
  }

  const guardarCambios = async (fila: FilaHoja) => {
    const ok = await guardarFila(fila.id, valoresEditados)
    if (ok) {
      setEditandoFila(null)
      setValoresEditados([])
      toast.success('Cambios guardados correctamente')
    }
  }

  const abrirSidebarSlides = (fila: FilaHoja) => {
    console.log('📊 [TablaHojas] Abriendo sidebar con fila:', {
      id: fila.id,
      numeroFila: fila.numeroFila,
      valores: fila.valores
    })

    const filaSeleccionada: FilaSeleccionada = {
      id: fila.id,
      indice: fila.numeroFila || 0,
      valores: fila.valores,
      numeroFila: fila.numeroFila,
      ultimaActualizacion: fila.ultimaActualizacion
    }

    console.log('📊 [TablaHojas] Fila seleccionada:', filaSeleccionada)
    setFilaParaSlides(filaSeleccionada)
    setFilaSeleccionada(filaSeleccionada)
    setSidebarAbierto(true)
  }

  const handleDiapositivaSeleccionada = (idDiapositiva: string) => {
    if (filaParaSlides) {
      manejarSeleccionDiapositiva(idDiapositiva, filaParaSlides)
    }
  }

  // Verificar si una celda está enlazada
  const estaCeldaEnlazada = (filaId: string, columnaId: string): boolean => {
    return elementosActuales.some(elemento => 
      elemento.columnaAsociada === columnaId && 
      filaSeleccionada?.id === filaId
    )
  }

  const actualizarValorEditado = (columnaId: string, nuevoValor: string) => {
    setValoresEditados(prev =>
      prev.map(v =>
        v.columnaId === columnaId ? { ...v, valor: nuevoValor } : v
      )
    )
  }

  const renderCelda = (fila: FilaHoja, columna: Columna) => {
    const estaEnlazada = estaCeldaEnlazada(fila.id, columna.id)
    const estaEditando = editandoFila === fila.id

    const valorCelda = estaEditando
      ? valoresEditados.find(v => v.columnaId === columna.id)
      : fila.valores.find(v => v.columnaId === columna.id)

    let valorMostrar = ''
    if (valorCelda?.valor !== undefined && valorCelda.valor !== null) {
      if (typeof valorCelda.valor === 'object') {
        try {
          valorMostrar = JSON.stringify(valorCelda.valor)
        } catch (e) {
          valorMostrar = '[Error: Valor no válido]'
        }
      } else {
        valorMostrar = String(valorCelda.valor)
      }
    }

    if (estaEditando) {
      return (
        <TextField
          fullWidth
          size="small"
          value={valorMostrar}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            actualizarValorEditado(columna.id, e.target.value)
          }
          onClick={(e) => e.stopPropagation()}
          sx={{ minWidth: 80, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' } }}
        />
      )
    }

    return (
      <div className="flex items-center gap-2">
        {estaEnlazada && (
          <Link size={14} className="text-primary shrink-0" />
        )}
        <span className="truncate">{valorMostrar}</span>
      </div>
    )
  }

  const renderAcciones = (fila: FilaHoja) => {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {editandoFila === fila.id ? (
          <>
            <IconButton 
              size="small" 
              onClick={() => guardarCambios(fila)}
              color="primary"
            >
              <Save className="h-4 w-4" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setEditandoFila(null)}
              color="error"
            >
              <Close className="h-4 w-4" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton 
              size="small" 
              onClick={() => iniciarEdicion(fila)}
            >
              <Edit className="h-4 w-4" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => abrirSidebarSlides(fila)}
              color="primary"
            >
              <Presentation className="h-4 w-4" />
            </IconButton>
          </>
        )}
      </Box>
    )
  }

  const renderFila = (fila: FilaHoja) => {
    return (
      <TableRow
        key={fila.id}
        hover
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        {columnas.map((columna) => (
          <TableCell key={columna.id}>
            {renderCelda(fila, columna)}
          </TableCell>
        ))}
        <TableCell>
          {renderAcciones(fila)}
        </TableCell>
      </TableRow>
    )
  }

  if (cargando) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>Cargando...</Box>
  }

  if (!filas.length || !columnas.length) {
    console.log('⚠️ [TablaHojas] No hay datos para mostrar:', {
      filas: filas.length,
      columnas: columnas.length,
      datosFilas: filas,
      datosColumnas: columnas
    })
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>No hay datos disponibles</Box>
  }

  console.log('🎯 [TablaHojas] Renderizando tabla:', {
    filas: filas.length,
    columnas: columnas.length,
    filasFiltradas: filasFiltradas.length,
    columnaOrden,
    ordenAscendente,
    muestraFilas: filasFiltradas.slice(0, 3).map(f => ({
      id: f.id,
      valores: f.valores
    }))
  });

  return (
    <Box sx={{ 
      display: 'flex',
      position: 'relative',
      width: '100%',
      height: '100%'
    }}>
      {/* Contenido principal */}
      <Box sx={{ 
        flex: 1,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        width: '100%',
        transition: theme => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        ...(sidebarAbierto && {
          width: '70%'
        })
      }}>
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {tituloHoja}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <Box sx={{ position: 'relative', flex: 1 }}>
            <TextField
              fullWidth
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="h-4 w-4" />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Box>
          <BotonSincronizar />
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                {columnas.map((columna) => (
                  <TableCell 
                    key={columna.id}
                    onClick={() => ordenarPorColumna(columna.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {columna.titulo}
                      {columnaOrden === columna.id && (
                        ordenAscendente ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </Box>
                  </TableCell>
                ))}
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filasFiltradas.map((fila) => renderFila(fila))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Sidebar de diapositivas */}
      <SidebarSlides
        sidebarAbierto={sidebarAbierto}
        setSidebarAbierto={setSidebarAbierto}
        onDiapositivaSeleccionada={handleDiapositivaSeleccionada}
      />
    </Box>
  )
} 