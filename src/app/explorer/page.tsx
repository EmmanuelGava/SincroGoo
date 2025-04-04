'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Container, Grid, Paper, Typography, TextField, Button, Slider, FormControlLabel, Switch, LinearProgress, Tooltip, List, ListItem, ListItemText, Alert, Checkbox, Rating, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Autocomplete, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress } from '@mui/material';
import { Lugar as LugarExport } from '../servicios/google/types';
import { Lugar } from '../servicios/google/explorer/types';
import { LugarExportable } from './tipos';
import { MapaEstablecimientos } from './componentes/MapaEstablecimientos';
import { DetallesEstablecimiento } from './componentes/DetallesEstablecimiento';
import { ExportarEstablecimientos } from './componentes/ExportarEstablecimientos';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSession } from 'next-auth/react';
import { EncabezadoSistema } from '@/componentes/EncabezadoSistema';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { GoogleSheetsService } from './servicios/google-sheets-service';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';

interface UbicacionSugerida {
  description: string;
  place_id: string;
}

interface Filtros {
  abiertoAhora: boolean;
  ratingMinimo: number;
  rubro: string;
}

interface ExplorerPageState {
  establecimientos: Lugar[];
  establecimientosSeleccionados: Set<string>;
  establecimientoSeleccionado: Lugar | null;
  cargando: boolean;
  error: string | null;
  centro: { lat: number; lng: number };
  radio: number;
  busqueda: string;
  busquedaUbicacion: string;
  mostrarExportar: boolean;
  establecimientosDetallados: LugarExportable[];
  spreadsheetId: string | null;
  filtros: Filtros;
  ubicacionesSugeridas: UbicacionSugerida[];
  cargandoSugerencias: boolean;
}

export const dynamic = 'force-dynamic';

export default function ExplorerPage() {
  const { data: session } = useSession();
  const [state, setState] = useState<ExplorerPageState>({
    establecimientos: [],
    establecimientosSeleccionados: new Set(),
    establecimientoSeleccionado: null,
    cargando: false,
    error: null,
    centro: { lat: -34.6037, lng: -58.3816 },
    radio: 5,
    busqueda: '',
    busquedaUbicacion: '',
    mostrarExportar: false,
    establecimientosDetallados: [],
    spreadsheetId: null,
    filtros: {
      abiertoAhora: false,
      ratingMinimo: 0,
      rubro: ''
    },
    ubicacionesSugeridas: [],
    cargandoSugerencias: false
  });

  const googleSheetsService = GoogleSheetsService.getInstance();

  const buscarEstablecimientos = async () => {
    if (!state.busqueda.trim()) {
      setState(prev => ({ ...prev, error: 'Por favor, ingresa un término de búsqueda' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, cargando: true, error: null }));
      
      // Construir la URL con todos los parámetros necesarios
      const searchParams = new URLSearchParams({
        query: state.busqueda,
        lat: state.centro.lat.toString(),
        lng: state.centro.lng.toString(),
        radius: (state.radio * 1000).toString() // Convertir de km a metros
      });

      // Agregar ubicación si existe
      if (state.busquedaUbicacion) {
        searchParams.append('location', state.busquedaUbicacion);
      }
      
      const response = await fetch(
        `/api/google/places/search?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al buscar establecimientos');
      }

      const data = await response.json();
      if (!data.exito) {
        throw new Error(data.error || 'Error al buscar establecimientos');
      }

      setState(prev => ({
        ...prev,
        establecimientos: data.datos?.results || [],
        establecimientosDetallados: data.datos?.results || [],
        cargando: false,
        error: null
      }));
    } catch (error) {
      console.error('Error al buscar establecimientos:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error al buscar establecimientos',
        cargando: false 
      }));
    }
  };

  const obtenerUbicacionActual = useCallback(() => {
    if (navigator.geolocation) {
      setState(prev => ({ ...prev, cargando: true }));
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          try {
            // Obtener la dirección de las coordenadas
            const response = await fetch(
              `/api/google/places/geocode?lat=${lat}&lng=${lng}`,
              {
                headers: {
                  Authorization: `Bearer ${session?.accessToken}`
                }
              }
            );

            if (!response.ok) {
              throw new Error('Error al obtener la dirección');
            }

            const data = await response.json();
            if (!data.exito) {
              throw new Error(data.error || 'Error al obtener la dirección');
            }

            const direccion = data.datos?.formatted_address || '';
            
            setState(prev => ({
              ...prev,
              centro: { lat, lng },
              busquedaUbicacion: direccion,
              cargando: false,
              error: null
            }));
          } catch (error) {
            console.error('Error al obtener la dirección:', error);
            setState(prev => ({ 
              ...prev, 
              centro: { lat, lng },
              cargando: false,
              error: 'Error al obtener la dirección'
            }));
          }
        },
        (error) => {
          console.error('Error al obtener la ubicación:', error);
          setState(prev => ({ ...prev, error: 'No se pudo obtener tu ubicación', cargando: false }));
        },
        { 
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setState(prev => ({ ...prev, error: 'Tu navegador no soporta geolocalización', cargando: false }));
    }
  }, [session]);

  const handleSeleccionarEstablecimiento = async (establecimiento: Lugar) => {
    try {
      setState(prev => ({ ...prev, cargando: true }));
      
      const response = await fetch(
        `/api/google/places/details?placeId=${establecimiento.id}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener detalles del establecimiento');
      }

      const data = await response.json();
      
      if (!data.exito) {
        throw new Error(data.error || 'Error al obtener detalles del establecimiento');
      }

      setState(prev => ({
        ...prev,
        establecimientoSeleccionado: data.datos,
        cargando: false,
        error: null
      }));
    } catch (error) {
      console.error('Error al obtener detalles:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al obtener detalles del establecimiento',
        cargando: false
      }));
    }
  };

  const handleCerrarDetalles = () => {
    setState(prev => ({ ...prev, establecimientoSeleccionado: null }));
  };

  // Función para manejar la selección de establecimientos
  const handleSeleccionarEstablecimientoExportar = (id: string) => {
    setState(prev => ({
      ...prev,
      establecimientosSeleccionados: new Set(prev.establecimientosSeleccionados).add(id)
    }));
  };

  // Función para seleccionar/deseleccionar todos
  const handleSeleccionarTodos = () => {
    if (state.establecimientosSeleccionados.size === state.establecimientos.length) {
      setState(prev => ({ ...prev, establecimientosSeleccionados: new Set() }));
    } else {
      setState(prev => ({ ...prev, establecimientosSeleccionados: new Set(prev.establecimientos.map(e => e.id)) }));
    }
  };

  // Cuando se cargan nuevos establecimientos, seleccionarlos todos por defecto
  useEffect(() => {
    if (state.establecimientos.length > 0) {
      setState(prev => ({ ...prev, establecimientosSeleccionados: new Set(prev.establecimientos.map(e => e.id)) }));
    }
  }, [state.establecimientos]);

  // Función para obtener sugerencias de ubicación
  const buscarSugerenciasUbicacion = async (valor: string) => {
    if (!valor.trim()) {
      setState(prev => ({ ...prev, ubicacionesSugeridas: [] }));
      return;
    }

    try {
      setState(prev => ({ ...prev, cargandoSugerencias: true }));
      const params = new URLSearchParams({
        input: valor
      });
      
      const response = await fetch(
        `/api/google/places/autocomplete?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al buscar sugerencias');
      }

      const data = await response.json();
      if (!data.exito) {
        throw new Error(data.error || 'Error al buscar sugerencias');
      }

      setState(prev => ({ 
        ...prev, 
        ubicacionesSugeridas: data.datos?.predictions || [],
        cargandoSugerencias: false,
        error: null
      }));
    } catch (error) {
      console.error('Error al buscar sugerencias:', error);
      setState(prev => ({ 
        ...prev, 
        ubicacionesSugeridas: [],
        cargandoSugerencias: false,
        error: error instanceof Error ? error.message : 'Error al buscar sugerencias'
      }));
    }
  };

  // Función para seleccionar una ubicación sugerida
  const seleccionarUbicacion = async (placeId: string) => {
    try {
      setState(prev => ({ ...prev, cargando: true }));
      const response = await fetch(
        `/api/google/places/details?placeId=${placeId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener detalles de la ubicación');
      }

      const data = await response.json();
      if (!data.exito) {
        throw new Error(data.error || 'Error al obtener detalles de la ubicación');
      }

      const result = data.datos;
      if (result.latitud && result.longitud) {
        setState(prev => ({
          ...prev,
          centro: {
            lat: result.latitud,
            lng: result.longitud
          },
          cargando: false,
          error: null
        }));
      } else {
        throw new Error('La ubicación no tiene coordenadas');
      }
    } catch (error) {
      console.error('Error al obtener detalles de la ubicación:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error al obtener detalles de la ubicación',
        cargando: false 
      }));
    }
  };

  const handleBuscar = async () => {
    if (!state.busqueda.trim()) {
      setState(prev => ({ ...prev, error: 'Por favor, ingresa un término de búsqueda' }));
      return;
    }

    await buscarEstablecimientos();
  };

  // Función auxiliar para transformar al formato correcto
  const transformarAFormatoExport = (lugar: Lugar): LugarExportable => {
    return {
      id: lugar.id,
      nombre: lugar.nombre,
      direccion: lugar.direccion,
      telefono: lugar.telefono || 'No disponible',
      sitioWeb: lugar.sitioWeb || '',
      rating: lugar.rating,
      totalRatings: lugar.totalRatings,
      horarios: lugar.horarios || []
    };
  };

  // Función para obtener los detalles de los establecimientos seleccionados
  const obtenerDetallesSeleccionados = async (establecimientos: Lugar[]): Promise<LugarExportable[]> => {
    try {
      const establecimientosDetallados = await Promise.all(
        establecimientos.map(async (est) => {
          try {
            const response = await fetch(
              `/api/google/places/details?placeId=${est.id}`,
              {
                headers: {
                  Authorization: `Bearer ${session?.accessToken}`
                }
              }
            );

            if (!response.ok) {
              console.error(`Error al obtener detalles para ${est.nombre}`);
              return transformarAFormatoExport(est);
            }

            const data = await response.json();
            if (!data.exito) {
              console.error(`Error en datos para ${est.nombre}:`, data.error);
              return transformarAFormatoExport(est);
            }

            return transformarAFormatoExport(data.datos);
          } catch (error) {
            console.error(`Error al procesar ${est.nombre}:`, error);
            return transformarAFormatoExport(est);
          }
        })
      );

      return establecimientosDetallados;
    } catch (error) {
      console.error('Error al obtener detalles de establecimientos:', error);
      return establecimientos.map(est => transformarAFormatoExport(est));
    }
  };

  const handleMostrarExportar = async () => {
    const establecimientosParaExportar = await obtenerDetallesSeleccionados(
      state.establecimientos.filter(e => state.establecimientosSeleccionados.has(e.id))
    );
    setState(prev => ({ 
      ...prev, 
      mostrarExportar: true,
      establecimientosDetallados: establecimientosParaExportar
    }));
  };

  const handleUbicacionSeleccionada = (ubicacion: { lat: number; lng: number; direccion?: string }) => {
    setState(prev => ({
      ...prev,
      centro: {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      },
      busquedaUbicacion: ubicacion.direccion || `${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}`,
      ubicacionesSugeridas: [] // Limpiar sugerencias
    }));
  };

  if (!session) {
    return (
      <>
        <EncabezadoSistema />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Inicia sesión para usar el explorador
            </Typography>
            <Typography color="text.secondary">
              Necesitas estar autenticado para acceder a esta funcionalidad.
            </Typography>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <EncabezadoSistema />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Explorador de Establecimientos
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Busca y explora establecimientos cercanos
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Buscar establecimientos"
                    value={state.busqueda}
                    onChange={(e) => setState(prev => ({ ...prev, busqueda: e.target.value }))}
                    error={!!state.error && !state.busqueda.trim()}
                    helperText={state.error && !state.busqueda.trim() ? state.error : ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Autocomplete<UbicacionSugerida>
                    fullWidth
                    options={state.ubicacionesSugeridas}
                    getOptionLabel={(option) => option.description}
                    loading={state.cargandoSugerencias}
                    value={null}
                    inputValue={state.busquedaUbicacion}
                    onInputChange={(_, newValue, reason) => {
                      if (reason === 'input') {
                        setState(prev => ({ ...prev, busquedaUbicacion: newValue }));
                        buscarSugerenciasUbicacion(newValue);
                      }
                    }}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setState(prev => ({ 
                          ...prev, 
                          busquedaUbicacion: newValue.description,
                          ubicacionesSugeridas: [] // Limpiar sugerencias al seleccionar
                        }));
                        seleccionarUbicacion(newValue.place_id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Ubicación"
                        placeholder="Escribe para buscar lugares..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {state.cargandoSugerencias ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                              <Tooltip title="Usar mi ubicación actual">
                                <IconButton 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    obtenerUbicacionActual();
                                  }}
                                >
                                  <MyLocationIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          ),
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                      />
                    )}
                    noOptionsText="No se encontraron ubicaciones"
                    loadingText="Buscando ubicaciones..."
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleBuscar}
                      disabled={state.cargando || !state.busqueda.trim()}
                      fullWidth
                      startIcon={<SearchIcon />}
                    >
                      {state.cargando ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Ajusta el radio de búsqueda arrastrando el borde del círculo en el mapa
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ height: '400px', mb: 3 }}>
              <MapaEstablecimientos
                establecimientos={state.establecimientos}
                centro={state.centro}
                onCentroChange={(newCentro) => setState(prev => ({ ...prev, centro: newCentro }))}
                onRadioChange={(newRadio) => setState(prev => ({ ...prev, radio: newRadio }))}
                onUbicacionSeleccionada={handleUbicacionSeleccionada}
                establecimientoSeleccionado={state.establecimientoSeleccionado}
                onSeleccionarEstablecimiento={handleSeleccionarEstablecimiento}
                radio={state.radio}
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6">
                    Resultados ({state.establecimientos.length})
                  </Typography>
                  {state.establecimientos.length > 0 && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={state.establecimientosSeleccionados.size === state.establecimientos.length}
                          onChange={handleSeleccionarTodos}
                        />
                      }
                      label="Seleccionar todos"
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {state.establecimientos.length > 0 && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleMostrarExportar}
                        disabled={state.establecimientosSeleccionados.size === 0}
                      >
                        Exportar seleccionados ({state.establecimientosSeleccionados.size})
                      </Button>
                      {state.spreadsheetId && (
                        <Button
                          variant="outlined"
                          onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${state.spreadsheetId}`, '_blank')}
                          startIcon={<TableChartIcon />}
                        >
                          Ver en Sheets
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              </Box>

              {state.establecimientos.length > 0 ? (
                <Grid container spacing={2}>
                  {state.establecimientos.map((establecimiento) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={establecimiento.id}>
                      <Paper 
                        elevation={establecimiento.id === state.establecimientoSeleccionado?.id ? 8 : 1}
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            elevation: 4,
                            bgcolor: 'action.hover'
                          },
                          bgcolor: establecimiento.id === state.establecimientoSeleccionado?.id ? 'action.selected' : 'background.paper'
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Checkbox
                            checked={state.establecimientosSeleccionados.has(establecimiento.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSeleccionarEstablecimientoExportar(establecimiento.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ flexShrink: 0 }}
                          />
                          <Box sx={{ 
                            flex: 1, 
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column'
                          }} 
                          onClick={() => handleSeleccionarEstablecimiento(establecimiento)}>
                            <Typography 
                              variant="subtitle1" 
                              gutterBottom 
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.2,
                                minHeight: '2.4em'
                              }}
                            >
                              {establecimiento.nombre}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              gutterBottom
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.2,
                                minHeight: '2.4em',
                                mb: 1
                              }}
                            >
                              {establecimiento.direccion}
                            </Typography>
                            <Box sx={{ mt: 'auto' }}>
                              <LinearProgress
                                variant="determinate"
                                value={establecimiento.completitud ? Math.round(establecimiento.completitud) : 0}
                                sx={{ mb: 1 }}
                              />
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                Información disponible: {establecimiento.completitud ? Math.round(establecimiento.completitud) : 0}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" textAlign="center" py={3}>
                    No se encontraron establecimientos. Intenta ajustar los filtros o aumentar el radio de búsqueda.
                  </Typography>
                </Grid>
              )}
            </Paper>
          </Grid>

          {state.establecimientoSeleccionado && (
            <DetallesEstablecimiento
              establecimiento={state.establecimientoSeleccionado}
              onClose={handleCerrarDetalles}
            />
          )}

          {state.mostrarExportar && (
            <ExportarEstablecimientos
              establecimientos={state.establecimientosDetallados}
              onClose={() => setState(prev => ({ ...prev, mostrarExportar: false }))}
              onSheetCreated={(id) => setState(prev => ({ ...prev, spreadsheetId: id }))}
            />
          )}
        </Grid>
      </Container>
    </>
  );
} 