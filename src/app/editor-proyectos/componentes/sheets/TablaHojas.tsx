"use client"

import { useState, useEffect } from "react"
import { 
  Box, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Button, 
  InputAdornment, 
  Skeleton, 
  Tooltip, 
  IconButton,
  useTheme
} from "@mui/material"
import { 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Save as SaveIcon, 
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Link as LinkIcon
} from "@mui/icons-material"
import { FilaHoja, FilaSeleccionada } from "@/tipos/hojas"
import { ElementoDiapositiva } from "@/tipos/diapositivas"
import { BotonSincronizar } from "./BotonSincronizar"
import { useThemeMode } from "@/lib/theme"

// Funciones de utilidad locales para reemplazar las importadas de asociarElementos.ts
const verificarCeldaAsociada = (
  elementos: ElementoDiapositiva[],
  columna: string,
  filaId?: string
): boolean => {
  if (!elementos || elementos.length === 0 || !columna) return false;
  if (!filaId) return false;
  
  return elementos.some(elemento => {
    // Verificar si el elemento está asociado a esta columna
    const coincideColumna = elemento.columnaAsociada === columna;
    
    if (!coincideColumna) return false;
    
    // Si el elemento tiene un _filaId, verificar que coincida con filaId
    // @ts-ignore - _filaId es una propiedad temporal que añadimos
    const elementoFilaId = elemento._filaId;
    
    // Si el elemento no tiene _filaId, asumimos que está asociado a la fila actual
    if (!elementoFilaId) return true;
    
    // Si el elemento tiene un _filaId, verificar que coincida con filaId
    return elementoFilaId === filaId;
  });
};

const contarElementosAsociados = (
  elementos: ElementoDiapositiva[],
  columna: string
): number => {
  if (!elementos || elementos.length === 0 || !columna) return 0;
  
  return elementos.filter(elemento => elemento.columnaAsociada === columna).length;
};

interface TablaHojasProps {
  columnas: string[]
  filas: FilaHoja[]
  cargando: boolean
  filaSeleccionada: FilaSeleccionada | null
  onSeleccionarFila: (fila: FilaSeleccionada) => void
  onActualizarFila?: (fila: FilaHoja) => Promise<void>
  titulo?: string
  elementosAsociados?: ElementoDiapositiva[]
}

export default function TablaHojas({
  columnas = [],
  filas = [],
  cargando,
  filaSeleccionada,
  onSeleccionarFila,
  onActualizarFila,
  titulo = "Datos de la Hoja de Cálculo",
  elementosAsociados = [],
}: TablaHojasProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const [busqueda, setBusqueda] = useState("")
  const [columnaOrden, setColumnaOrden] = useState<string | null>(null)
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [filasFiltradas, setFilasFiltradas] = useState<FilaHoja[]>([])
  const [editandoFila, setEditandoFila] = useState<string | null>(null)
  const [valoresEditados, setValoresEditados] = useState<{[key: string]: string}>({})
  const [elementosAsociadosLocal, setElementosAsociadosLocal] = useState<ElementoDiapositiva[]>(elementosAsociados);
  const [filaAsociadaId, setFilaAsociadaId] = useState<string | null>(null);
  
  // Log inicial para depuración
  useEffect(() => {
    console.log('TablaHojas - Estado inicial:', {
      columnas: columnas.length,
      filas: filas.length,
      cargando,
      hayFilaSeleccionada: !!filaSeleccionada,
      elementosAsociados: elementosAsociados.length
    });
  }, [columnas, filas, cargando, filaSeleccionada, elementosAsociados]);
  
  useEffect(() => {
    console.log('TablaHojas - Filtrando filas...');
    let resultado = [...filas]
    
    if (busqueda.trim()) {
      const terminoBusqueda = busqueda.toLowerCase()
      resultado = resultado.filter(fila => 
        Object.entries(fila.valores).some(([_, valor]) => 
          String(valor).toLowerCase().includes(terminoBusqueda)
        )
      )
    }
    
    if (columnaOrden) {
      resultado.sort((a, b) => {
        const valorA = a.valores[columnaOrden]
        const valorB = b.valores[columnaOrden]
        
        if (typeof valorA === 'number' && typeof valorB === 'number') {
          return ordenAscendente ? valorA - valorB : valorB - valorA
        }
        
        const strA = String(valorA || '').toLowerCase()
        const strB = String(valorB || '').toLowerCase()
        
        return ordenAscendente 
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA)
      })
    }
    
    console.log('TablaHojas - Filas filtradas:', resultado.length);
    setFilasFiltradas(resultado)
  }, [filas, busqueda, columnaOrden, ordenAscendente])
  
  const manejarOrdenar = (columna: string) => {
    if (columnaOrden === columna) {
      setOrdenAscendente(!ordenAscendente)
    } else {
      setColumnaOrden(columna)
      setOrdenAscendente(true)
    }
  }
  
  const renderizarIndicadorOrden = (columna: string) => {
    if (columnaOrden !== columna) return null
    return ordenAscendente 
      ? <KeyboardArrowUpIcon fontSize="small" sx={{ ml: 0.5 }} />
      : <KeyboardArrowDownIcon fontSize="small" sx={{ ml: 0.5 }} />
  }

  const iniciarEdicion = (fila: FilaHoja) => {
    setEditandoFila(fila.id)
    setValoresEditados(fila.valores)
  }

  const actualizarValor = (columna: string, valor: string) => {
    setValoresEditados(prev => ({
      ...prev,
      [columna]: valor
    }))
  }

  const guardarCambios = async (fila: FilaHoja) => {
    if (!onActualizarFila) return

    const filaActualizada: FilaHoja = {
      ...fila,
      valores: valoresEditados,
      ultimaActualizacion: new Date()
    }

    await onActualizarFila(filaActualizada)
    setEditandoFila(null)
    setValoresEditados({})
  }

  const convertirAFilaSeleccionada = (fila: FilaHoja): FilaSeleccionada => {
    console.log('Convirtiendo fila a FilaSeleccionada:', fila);
    return {
      ...fila,
      ultimaActualizacion: fila.ultimaActualizacion || new Date(),
      numeroFila: fila.numeroFila || 0
    };
  }
  
  // Efecto para escuchar eventos de actualización de elementos asociados
  useEffect(() => {
    const handleActualizarElementosAsociados = (event: CustomEvent) => {
      const { elementos, idPresentacion, idHoja, filaId } = event.detail;
      console.log('Evento recibido en TablaHojas:', elementos.length, 'elementos asociados');
      console.log('ID de la fila asociada:', filaId);
      
      if (!elementos || elementos.length === 0) {
        console.log('No hay elementos asociados en el evento');
        return;
      }
      
      // Verificar que los elementos tengan la propiedad _filaId
      const elementosConFilaId = elementos.every((e: ElementoDiapositiva) => e._filaId);
      if (!elementosConFilaId) {
        console.warn('Algunos elementos no tienen la propiedad _filaId');
      }
      
      // Actualizar los elementos asociados
      setElementosAsociadosLocal(elementos);
      
      // Guardar el ID de la fila asociada
      setFilaAsociadaId(filaId);
      
      console.log(`TablaHojas: Actualizados ${elementos.length} elementos asociados para la fila ${filaId}`);
      
      // Obtener columnas asociadas
      const columnasAsociadas = Array.from(new Set(
        elementos
          .map((e: ElementoDiapositiva) => e.columnaAsociada)
          .filter((columna: string | undefined): columna is string => Boolean(columna))
      ));
      console.log('Columnas asociadas:', columnasAsociadas);
      
      // Forzar actualización de la UI
      setTimeout(() => {
        console.log('Forzando actualización de la UI después de recibir elementos asociados');
        // Crear una copia del array para forzar la actualización del estado
        setElementosAsociadosLocal([...elementos]);
      }, 100);
    };
    
    // Añadir el listener
    window.addEventListener('actualizar-elementos-asociados', handleActualizarElementosAsociados as EventListener);
    
    console.log('TablaHojas: Listener para actualizar-elementos-asociados registrado');
    
    // Limpiar el listener al desmontar
    return () => {
      window.removeEventListener('actualizar-elementos-asociados', handleActualizarElementosAsociados as EventListener);
      console.log('TablaHojas: Listener para actualizar-elementos-asociados eliminado');
    };
  }, []);

  // Actualizar el estado local cuando cambien los props
  useEffect(() => {
    setElementosAsociadosLocal(elementosAsociados);
  }, [elementosAsociados]);

  // Función para verificar si una celda está asociada
  const esCeldaAsociada = (columna: string, filaId?: string): boolean => {
    // Si no hay ID de fila, no puede estar asociada
    if (!filaId) return false;
    
    // Si hay una fila asociada específica (filaAsociadaId) y es diferente a la fila actual (filaId),
    // entonces esta celda no está asociada
    if (filaAsociadaId && filaId !== filaAsociadaId) {
      return false;
    }
    
    // Verificar si hay elementos asociados
    if (!elementosAsociadosLocal || elementosAsociadosLocal.length === 0) {
      return false;
    }
    
    // Verificar si algún elemento está asociado a esta columna
    const esAsociada = elementosAsociadosLocal.some(elemento => {
      // Verificar si el elemento está asociado a esta columna
      const coincideColumna = elemento.columnaAsociada === columna;
      
      if (!coincideColumna) return false;
      
      // Si coincide la columna, verificar si el elemento tiene un _filaId y si coincide con filaId
      // @ts-ignore - _filaId es una propiedad temporal que añadimos
      const elementoFilaId = elemento._filaId;
      
      // Si el elemento no tiene _filaId, asumimos que está asociado a la fila actual
      if (!elementoFilaId) return true;
      
      // Si el elemento tiene un _filaId, verificar que coincida con filaId
      return elementoFilaId === filaId;
    });
    
    return esAsociada;
  };

  // Función para contar elementos asociados en una columna
  const contarElementosAsociadosEnColumna = (columna: string): number => {
    if (!elementosAsociadosLocal || elementosAsociadosLocal.length === 0) {
      return 0;
    }
    
    return elementosAsociadosLocal.filter(elemento => 
      elemento.columnaAsociada === columna
    ).length;
  };
  
  // Efecto para depurar el estado de los elementos asociados
  useEffect(() => {
    if (elementosAsociadosLocal && elementosAsociadosLocal.length > 0) {
      console.log('TablaHojas - Elementos asociados actuales:', elementosAsociadosLocal);
      console.log('TablaHojas - Fila asociada ID:', filaAsociadaId);
      console.log('TablaHojas - Fila seleccionada ID:', filaSeleccionada?.id);
      
      // Obtener columnas asociadas
      const columnasAsociadas = Array.from(new Set(
        elementosAsociadosLocal
          .map((e: ElementoDiapositiva) => e.columnaAsociada)
          .filter((columna: string | undefined): columna is string => Boolean(columna))
      ));
      
      console.log('TablaHojas - Columnas asociadas:', columnasAsociadas);
    }
  }, [elementosAsociadosLocal, filaAsociadaId, filaSeleccionada]);

  // Si no hay datos y no está cargando, mostrar mensaje
  if (!cargando && columnas.length === 0 && filas.length === 0) {
    return (
      <Box sx={{ 
        p: 4, 
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1
      }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No hay datos disponibles
        </Typography>
        <Typography variant="body2" color="text.secondary">
          La hoja de cálculo está vacía o no se han podido cargar los datos.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="600">{titulo}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            size="small"
            sx={{ width: '250px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {elementosAsociados.length > 0 && (
            <BotonSincronizar 
              elementos={elementosAsociados}
              filaSeleccionada={filaSeleccionada}
            />
          )}
        </Box>
      </Box>
      
      <Paper 
        elevation={1} 
        sx={{ 
          border: 1, 
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columnas.map(columna => (
                  <TableCell 
                    key={columna}
                    onClick={() => manejarOrdenar(columna)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.04)' 
                      },
                      backgroundColor: theme.palette.background.paper
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {columna}
                      {renderizarIndicadorOrden(columna)}
                      {filaSeleccionada && esCeldaAsociada(columna, filaSeleccionada.id) && (
                        <Tooltip 
                          title={`${contarElementosAsociadosEnColumna(columna)} elemento(s) asociado(s) a esta columna`}
                          arrow
                        >
                          <Box 
                            sx={{ 
                              ml: 0.75, 
                              bgcolor: '#22c55e20', 
                              p: 0.25, 
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <LinkIcon 
                              sx={{ 
                                fontSize: '0.75rem', 
                                color: '#22c55e' 
                              }} 
                            />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                ))}
                <TableCell 
                  sx={{ 
                    width: 180,
                    backgroundColor: theme.palette.background.paper
                  }}
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columnas.map((columna, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" width="100%" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton variant="text" width="100%" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filasFiltradas.length > 0 ? (
                filasFiltradas.map((fila) => (
                  <TableRow 
                    key={fila.id}
                    hover
                    sx={{ 
                      backgroundColor: filaSeleccionada?.id === fila.id 
                        ? `${theme.palette.primary.main}15` 
                        : 'inherit'
                    }}
                  >
                    {columnas.map(columna => (
                      <TableCell key={columna}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {editandoFila === fila.id ? (
                            <TextField
                              value={valoresEditados[columna] || ''}
                              onChange={(e) => actualizarValor(columna, e.target.value)}
                              size="small"
                              fullWidth
                              variant="outlined"
                            />
                          ) : (
                            <>
                              <Typography variant="body2">
                                {String(fila.valores[columna] || '')}
                              </Typography>
                              {esCeldaAsociada(columna, fila.id) && (
                                <Tooltip 
                                  title={`${contarElementosAsociadosEnColumna(columna)} elemento(s) asociado(s) a esta columna`}
                                  arrow
                                >
                                  <Box 
                                    sx={{ 
                                      ml: 0.5, 
                                      bgcolor: '#22c55e20', 
                                      p: 0.25, 
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <LinkIcon 
                                      sx={{ 
                                        fontSize: '0.75rem', 
                                        color: '#22c55e' 
                                      }} 
                                    />
                                  </Box>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {editandoFila === fila.id ? (
                          <IconButton
                            size="small"
                            onClick={() => guardarCambios(fila)}
                            color="primary"
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => iniciarEdicion(fila)}
                            color="default"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Seleccionando fila para ver slides:', fila.id);
                            const filaConvertida = convertirAFilaSeleccionada(fila);
                            console.log('Fila convertida:', filaConvertida);
                            onSeleccionarFila(filaConvertida);
                          }}
                        >
                          Ver Slides
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columnas.length + 1} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {filas.length === 0 
                        ? "No hay datos disponibles" 
                        : "No se encontraron resultados para tu búsqueda"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <Typography variant="body2" color="text.secondary">
        {filasFiltradas.length} resultados
        {busqueda.trim() && ` para "${busqueda}"`}
        {filas.length > 0 && ` de ${filas.length} total`}
      </Typography>
    </Box>
  )
} 