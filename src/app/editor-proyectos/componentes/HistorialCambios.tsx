"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Divider, 
  CircularProgress,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip
} from "@mui/material"
import { 
  History as HistoryIcon, 
  Refresh as RefreshIcon, 
  RestartAlt as RestartAltIcon,
  TableChart as TableChartIcon,
  Slideshow as SlideshowIcon,
  FilterList as FilterListIcon
} from "@mui/icons-material"
import { ElementoDiapositiva } from "@/tipos/diapositivas"
import { FilaHoja } from "@/tipos/hojas"
import { useThemeMode } from "@/lib/theme"
import { useSession } from "next-auth/react"

// Tipos de cambios
type TipoCambio = 'tabla' | 'diapositiva' | 'todos';

interface CambioHistorial {
  id: string;
  fecha: Date;
  usuario: string;
  tipo: TipoCambio;
  diapositiva?: string;
  elemento?: string;
  columna?: string;
  fila?: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
}

interface HistorialCambiosProps {
  abierto: boolean;
  onCerrar: () => void;
  onRestaurarElemento?: (elementoId: string, contenido: string) => void;
  onRestaurarCelda?: (filaId: string, columna: string, valor: string) => void;
  idPresentacion?: string;
  idHojaCalculo?: string;
  idDiapositiva?: string;
}

export function HistorialCambios({
  abierto,
  onCerrar,
  onRestaurarElemento,
  onRestaurarCelda,
  idPresentacion,
  idHojaCalculo,
  idDiapositiva
}: HistorialCambiosProps) {
  const [cargando, setCargando] = useState(false);
  const [cambios, setCambios] = useState<CambioHistorial[]>([]);
  const [tipoCambioSeleccionado, setTipoCambioSeleccionado] = useState<TipoCambio>('todos');
  const [filtroElemento, setFiltroElemento] = useState<string>('');
  
  // Obtener el tema y la sesión
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { data: session } = useSession();
  
  // Cargar historial de cambios
  const cargarHistorial = async () => {
    setCargando(true);
    try {
      // Aquí iría la llamada a la API para obtener el historial real
      // Por ejemplo:
      // const respuesta = await fetch(`/api/historial?idPresentacion=${idPresentacion}&idHojaCalculo=${idHojaCalculo}&tipo=${tipoCambioSeleccionado}`);
      // const datos = await respuesta.json();
      // setCambios(datos);
      
      // Por ahora, simulamos datos más realistas
      const cambiosSimulados: CambioHistorial[] = [
        {
          id: "1",
          fecha: new Date(Date.now() - 3600000), // 1 hora atrás
          usuario: session?.user?.name || "Usuario Actual",
          tipo: "diapositiva",
          diapositiva: "Diapositiva 1",
          elemento: "Título",
          contenidoAnterior: "Título Original",
          contenidoNuevo: "Nuevo Título Actualizado"
        },
        {
          id: "2",
          fecha: new Date(Date.now() - 7200000), // 2 horas atrás
          usuario: session?.user?.name || "Usuario Actual",
          tipo: "diapositiva",
          diapositiva: "Diapositiva 2",
          elemento: "Párrafo",
          contenidoAnterior: "Texto original del párrafo con información básica.",
          contenidoNuevo: "Texto actualizado con información más detallada y precisa sobre el tema."
        },
        {
          id: "3",
          fecha: new Date(Date.now() - 86400000), // 1 día atrás
          usuario: "Otro Usuario",
          tipo: "diapositiva",
          diapositiva: "Diapositiva 1",
          elemento: "Subtítulo",
          contenidoAnterior: "Subtítulo original",
          contenidoNuevo: "Subtítulo modificado con palabras clave"
        },
        {
          id: "4",
          fecha: new Date(Date.now() - 43200000), // 12 horas atrás
          usuario: session?.user?.name || "Usuario Actual",
          tipo: "tabla",
          fila: "Fila 1",
          columna: "Precio",
          contenidoAnterior: "100",
          contenidoNuevo: "120"
        },
        {
          id: "5",
          fecha: new Date(Date.now() - 129600000), // 36 horas atrás
          usuario: "Otro Usuario",
          tipo: "tabla",
          fila: "Fila 3",
          columna: "Descripción",
          contenidoAnterior: "Producto básico",
          contenidoNuevo: "Producto premium con características adicionales"
        }
      ];
      
      // Filtrar por tipo si es necesario
      let cambiosFiltrados = cambiosSimulados;
      if (tipoCambioSeleccionado !== 'todos') {
        cambiosFiltrados = cambiosSimulados.filter(c => c.tipo === tipoCambioSeleccionado);
      }
      
      // Filtrar por elemento/columna si hay texto de búsqueda
      if (filtroElemento) {
        const filtroLower = filtroElemento.toLowerCase();
        cambiosFiltrados = cambiosFiltrados.filter(c => 
          (c.elemento && c.elemento.toLowerCase().includes(filtroLower)) || 
          (c.columna && c.columna.toLowerCase().includes(filtroLower)) ||
          (c.fila && c.fila.toLowerCase().includes(filtroLower)) ||
          (c.diapositiva && c.diapositiva.toLowerCase().includes(filtroLower))
        );
      }
      
      // Ordenar por fecha (más reciente primero)
      cambiosFiltrados.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      
      setTimeout(() => {
        setCambios(cambiosFiltrados);
        setCargando(false);
      }, 800);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      setCargando(false);
    }
  };
  
  // Manejar cambio de tipo
  const handleTipoCambio = (event: SelectChangeEvent) => {
    setTipoCambioSeleccionado(event.target.value as TipoCambio);
  };
  
  // Manejar cambio de filtro
  const handleFiltroElemento = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiltroElemento(event.target.value);
  };
  
  // Cargar historial cuando se abre el diálogo o cambia el filtro
  useEffect(() => {
    if (abierto) {
      cargarHistorial();
    }
  }, [abierto, tipoCambioSeleccionado, filtroElemento]);
  
  // Formatear fecha
  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  };
  
  // Renderizar el título del cambio según su tipo
  const renderizarTituloCambio = (cambio: CambioHistorial) => {
    if (cambio.tipo === 'diapositiva') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SlideshowIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1">
            {cambio.elemento} en {cambio.diapositiva}
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableChartIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1">
            {cambio.columna} en {cambio.fila}
          </Typography>
        </Box>
      );
    }
  };
  
  // Renderizar el botón de restaurar según el tipo de cambio
  const renderizarBotonRestaurar = (cambio: CambioHistorial) => {
    if (cambio.tipo === 'diapositiva' && onRestaurarElemento && cambio.elemento) {
      return (
        <Button 
          variant="text" 
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => onRestaurarElemento(cambio.elemento as string, cambio.contenidoAnterior)}
        >
          Restaurar
        </Button>
      );
    } else if (cambio.tipo === 'tabla' && onRestaurarCelda && cambio.fila && cambio.columna) {
      return (
        <Button 
          variant="text" 
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => onRestaurarCelda(cambio.fila as string, cambio.columna as string, cambio.contenidoAnterior)}
        >
          Restaurar
        </Button>
      );
    }
    
    return null;
  };
  
  return (
    <Dialog 
      open={abierto} 
      onClose={onCerrar}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon sx={{ fontSize: 24 }} />
        <Typography variant="h6">Historial de Cambios</Typography>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="tipo-cambio-label">Tipo de Cambio</InputLabel>
                <Select
                  labelId="tipo-cambio-label"
                  value={tipoCambioSeleccionado}
                  label="Tipo de Cambio"
                  onChange={handleTipoCambio}
                >
                  <MenuItem value="todos">Todos los cambios</MenuItem>
                  <MenuItem value="diapositiva">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SlideshowIcon fontSize="small" />
                      <span>Diapositivas</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="tabla">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableChartIcon fontSize="small" />
                      <span>Tabla de datos</span>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel htmlFor="filtro-elemento">Buscar</InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box component="input"
                    id="filtro-elemento"
                    placeholder="Buscar por elemento, columna o fila..."
                    value={filtroElemento}
                    onChange={handleFiltroElemento}
                    sx={{
                      width: '100%',
                      p: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      outline: 'none',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontSize: '0.875rem',
                      '&:focus': {
                        borderColor: theme.palette.primary.main,
                      }
                    }}
                  />
                </Box>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button 
                variant="outlined" 
                fullWidth
                size="medium" 
                onClick={cargarHistorial} 
                disabled={cargando}
                startIcon={<RefreshIcon />}
              >
                {cargando ? 'Cargando...' : 'Actualizar'}
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          {cambios.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cambios.map((cambio) => (
                <Paper 
                  key={cambio.id} 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2
                  }}>
                    <Box>
                      {renderizarTituloCambio(cambio)}
                      <Typography variant="caption" color="text.secondary">
                        {formatearFecha(cambio.fecha)} por {cambio.usuario}
                      </Typography>
                    </Box>
                    
                    {renderizarBotonRestaurar(cambio)}
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Contenido Anterior
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          whiteSpace: 'pre-wrap',
                          minHeight: '80px'
                        }}
                      >
                        <Typography variant="body2">
                          {cambio.contenidoAnterior || 
                            <Typography variant="body2" color="text.disabled" component="span" sx={{ fontStyle: 'italic' }}>
                              Vacío
                            </Typography>
                          }
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Contenido Nuevo
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          bgcolor: mode === 'dark' 
                            ? `${theme.palette.primary.main}15` 
                            : `${theme.palette.primary.main}08`,
                          borderColor: `${theme.palette.primary.main}30`,
                          whiteSpace: 'pre-wrap',
                          minHeight: '80px'
                        }}
                      >
                        <Typography variant="body2">
                          {cambio.contenidoNuevo || 
                            <Typography variant="body2" color="text.disabled" component="span" sx={{ fontStyle: 'italic' }}>
                              Vacío
                            </Typography>
                          }
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flexDirection: 'column',
              py: 4 
            }}>
              {cargando ? (
                <>
                  <CircularProgress size={32} sx={{ mb: 2 }} />
                  <Typography color="text.secondary">
                    Cargando historial de cambios...
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary">
                  No hay cambios registrados con los filtros seleccionados
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onCerrar}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
} 