'use client';

import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Paper, Typography, TextField, Button, Slider, FormControlLabel, Switch, LinearProgress, Tooltip, List, ListItem, ListItemText, Alert, Checkbox, Rating, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Autocomplete, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { GooglePlacesService, Lugar } from './servicios/google-places-service';
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
  precioMinimo: number;
  precioMaximo: number;
  puntuacionMinima: number;
  horarioApertura: ReturnType<typeof dayjs> | null;
  horarioCierre: ReturnType<typeof dayjs> | null;
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
  establecimientosDetallados: Lugar[];
  spreadsheetId: string | null;
  filtros: Filtros;
  ubicacionesSugeridas: UbicacionSugerida[];
  cargandoSugerencias: boolean;
  historialBusquedas: any[];
  mostrarHistorial: boolean;
}

export default function ExplorerPage() {
  const { data: session } = useSession();
  const [state, setState] = useState<ExplorerPageState>({
    establecimientos: [],
    establecimientosSeleccionados: new Set(),
    establecimientoSeleccionado: null,
    cargando: false,
    error: null,
    centro: { lat: 19.4326, lng: -99.1332 },
    radio: 5,
    busqueda: '',
    busquedaUbicacion: '',
    mostrarExportar: false,
    establecimientosDetallados: [],
    spreadsheetId: null,
    filtros: {
      precioMinimo: 1,
      precioMaximo: 4,
      puntuacionMinima: 0,
      horarioApertura: null,
      horarioCierre: null
    },
    ubicacionesSugeridas: [],
    cargandoSugerencias: false,
    historialBusquedas: [],
    mostrarHistorial: false
  });
  const googlePlacesService = GooglePlacesService.getInstance();
  const googleSheetsService = GoogleSheetsService.getInstance();

  useEffect(() => {
    obtenerUbicacionActual();
  }, []);

  const obtenerUbicacionActual = () => {
    if (navigator.geolocation) {
      setState(prev => ({ ...prev, cargando: true }));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            centro: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            cargando: false
          }));
        },
        (error) => {
          console.error('Error al obtener la ubicación:', error);
          setState(prev => ({ ...prev, error: 'No se pudo obtener tu ubicación', cargando: false }));
        }
      );
    } else {
      setState(prev => ({ ...prev, error: 'Tu navegador no soporta geolocalización', cargando: false }));
    }
  };

  const buscarUbicacion = async () => {
    if (!state.busquedaUbicacion.trim()) {
      // Si el campo está vacío, usar la ubicación actual
      obtenerUbicacionActual();
      return;
    }

    try {
      setState(prev => ({ ...prev, cargando: true, error: null }));
      const response = await fetch(`/api/places/geocode?address=${encodeURIComponent(state.busquedaUbicacion)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar la ubicación');
      }

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setState(prev => ({
          ...prev,
          centro: { lat: location.lat, lng: location.lng },
          cargando: false
        }));
      } else {
        setState(prev => ({ ...prev, error: 'No se encontró la ubicación', cargando: false }));
      }
    } catch (error) {
      console.error('Error al buscar ubicación:', error);
      setState(prev => ({ ...prev, error: 'Error al buscar la ubicación', cargando: false }));
    }
  };

  const buscarEstablecimientos = async () => {
    if (!state.busqueda.trim()) {
      setState(prev => ({ ...prev, error: 'Por favor, ingresa un término de búsqueda' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, cargando: true, error: null }));
      const resultados = await googlePlacesService.buscarEstablecimientos(
        state.busqueda,
        state.centro.lat,
        state.centro.lng,
        state.radio * 1000 // Convertir a metros
      );
      setState(prev => ({
        ...prev,
        establecimientos: resultados,
        establecimientosDetallados: resultados,
        cargando: false
      }));
    } catch (error) {
      console.error('Error al buscar establecimientos:', error);
      setState(prev => ({ ...prev, error: 'Error al buscar establecimientos', cargando: false }));
    }
  };

  const handleSeleccionarEstablecimiento = async (establecimiento: Lugar) => {
    try {
      setState(prev => ({ ...prev, cargando: true }));
      const detalles = await googlePlacesService.obtenerDetallesLugar(establecimiento.id);
      setState(prev => ({
        ...prev,
        establecimientoSeleccionado: detalles,
        establecimientosDetallados: prev.establecimientosDetallados.map(e => e.id === detalles.id ? detalles : e)
      }));
    } catch (error) {
      console.error('Error al obtener detalles del establecimiento:', error);
      setState(prev => ({ ...prev, error: 'Error al obtener detalles del establecimiento', cargando: false }));
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
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(valor)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar sugerencias');
      }

      setState(prev => ({ ...prev, ubicacionesSugeridas: data.predictions || [] }));
    } catch (error) {
      console.error('Error al buscar sugerencias:', error);
    } finally {
      setState(prev => ({ ...prev, cargandoSugerencias: false }));
    }
  };

  // Función para seleccionar una ubicación sugerida
  const seleccionarUbicacion = async (placeId: string) => {
    try {
      setState(prev => ({ ...prev, cargando: true }));
      const response = await fetch(`/api/places/details?place_id=${placeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener detalles de la ubicación');
      }

      if (data.result?.geometry?.location) {
        setState(prev => ({
          ...prev,
          centro: {
            lat: data.result.geometry.location.lat,
            lng: data.result.geometry.location.lng
          },
          cargando: false
        }));
      }
    } catch (error) {
      console.error('Error al obtener detalles de la ubicación:', error);
      setState(prev => ({ ...prev, error: 'Error al obtener detalles de la ubicación', cargando: false }));
    }
  };

  const cargarHistorial = useCallback(async () => {
    try {
      const historial = await googleSheetsService.obtenerHistorialBusquedas();
      setState(prev => ({ ...prev, historialBusquedas: historial }));
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleBuscar = async () => {
    try {
      setState(prev => ({ ...prev, cargando: true }));
      // Primero buscar la ubicación
      await buscarUbicacion();
      
      // Luego buscar establecimientos
      const resultados = await googlePlacesService.buscarEstablecimientos(
        state.busqueda,
        state.centro.lat,
        state.centro.lng,
        state.radio * 1000
      );

      // Actualizar estado con los resultados
      setState(prev => ({
        ...prev,
        establecimientos: resultados,
        establecimientosDetallados: resultados,
        cargando: false
      }));

      // Guardar en el historial
      await googleSheetsService.guardarHistorialBusqueda(
        state.busqueda,
        {
          ubicacion: state.busquedaUbicacion,
          lat: state.centro.lat,
          lng: state.centro.lng,
          radio: state.radio,
          ...state.filtros
        },
        resultados.length
      );
      
      await cargarHistorial();
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Error al realizar la búsqueda',
        cargando: false 
      }));
    }
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
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete<UbicacionSugerida>
                    fullWidth
                    options={state.ubicacionesSugeridas}
                    getOptionLabel={(option) => option.description}
                    loading={state.cargandoSugerencias}
                    onInputChange={(_, newValue) => {
                      setState(prev => ({ ...prev, busquedaUbicacion: newValue }));
                      buscarSugerenciasUbicacion(newValue);
                    }}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        seleccionarUbicacion(newValue.place_id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Buscar ubicación"
                        error={!!state.error && !state.busquedaUbicacion.trim()}
                        helperText={state.error && !state.busquedaUbicacion.trim() ? state.error : ''}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {params.InputProps.endAdornment}
                              <IconButton 
                                onClick={obtenerUbicacionActual}
                                disabled={state.cargando}
                                size="small"
                              >
                                <MyLocationIcon />
                              </IconButton>
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleBuscar}
                      disabled={state.cargando || !state.busqueda.trim()}
                      fullWidth
                    >
                      {state.cargando ? 'Buscando...' : 'Buscar'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setState(prev => ({ ...prev, mostrarHistorial: !prev.mostrarHistorial }))}
                      sx={{ minWidth: 'auto' }}
                    >
                      <HistoryIcon />
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              {state.mostrarHistorial && state.historialBusquedas.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Búsqueda</TableCell>
                          <TableCell>Ubicación</TableCell>
                          <TableCell>Radio</TableCell>
                          <TableCell>Filtros</TableCell>
                          <TableCell>Resultados</TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {state.historialBusquedas.slice(1).map((entrada, index) => {
                          const filtros = entrada[6] ? JSON.parse(entrada[6]) : {};
                          return (
                            <TableRow key={index}>
                              <TableCell>{entrada[0]}</TableCell>
                              <TableCell>{entrada[1]}</TableCell>
                              <TableCell>{entrada[2]}</TableCell>
                              <TableCell>{entrada[5]} km</TableCell>
                              <TableCell>
                                <Tooltip title={
                                  <Box>
                                    <Typography variant="caption">Precio: {filtros.precioMinimo}$ - {filtros.precioMaximo}$</Typography><br/>
                                    <Typography variant="caption">Puntuación mínima: {filtros.puntuacionMinima}⭐</Typography><br/>
                                    {filtros.horarioApertura && <Typography variant="caption">Horario: {filtros.horarioApertura} - {filtros.horarioCierre}</Typography>}
                                  </Box>
                                }>
                                  <IconButton size="small">
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{entrada[7]}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setState(prev => ({
                                      ...prev,
                                      busqueda: entrada[1],
                                      busquedaUbicacion: entrada[2],
                                      centro: {
                                        lat: Number(entrada[3]),
                                        lng: Number(entrada[4])
                                      },
                                      radio: Number(entrada[5]),
                                      filtros: JSON.parse(entrada[6]),
                                      mostrarHistorial: false
                                    }));
                                    handleBuscar();
                                  }}
                                >
                                  <SearchIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>
                  Radio de búsqueda: {state.radio} km
                </Typography>
                <Slider
                  value={state.radio}
                  onChange={(_, value) => setState(prev => ({ ...prev, radio: value as number }))}
                  min={1}
                  max={50}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ height: '400px', mb: 3 }}>
              <MapaEstablecimientos
                establecimientos={state.establecimientos}
                centro={state.centro}
                onCentroChange={(newCentro) => setState(prev => ({ ...prev, centro: newCentro }))}
                establecimientoSeleccionado={state.establecimientoSeleccionado}
                onSeleccionarEstablecimiento={handleSeleccionarEstablecimiento}
                radio={state.radio}
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="filtros-content"
                  id="filtros-header"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon />
                    <Typography variant="h6">Filtros de Búsqueda</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {/* Rango de precios */}
                    <Grid item xs={12} md={4}>
                      <Typography gutterBottom>Rango de precios</Typography>
                      <Box sx={{ px: 2 }}>
                        <Slider
                          value={[state.filtros.precioMinimo, state.filtros.precioMaximo]}
                          onChange={(_, value) => {
                            const [min, max] = value as number[];
                            setState(prev => ({
                              ...prev,
                              filtros: {
                                ...prev.filtros,
                                precioMinimo: min,
                                precioMaximo: max
                              }
                            }));
                          }}
                          valueLabelDisplay="auto"
                          min={1}
                          max={4}
                          marks={[
                            { value: 1, label: '$' },
                            { value: 2, label: '$$' },
                            { value: 3, label: '$$$' },
                            { value: 4, label: '$$$$' }
                          ]}
                        />
                      </Box>
                    </Grid>

                    {/* Puntuación mínima */}
                    <Grid item xs={12} md={4}>
                      <Typography gutterBottom>Puntuación mínima</Typography>
                      <Rating
                        value={state.filtros.puntuacionMinima}
                        onChange={(_, newValue) => setState(prev => ({
                          ...prev,
                          filtros: {
                            ...prev.filtros,
                            puntuacionMinima: newValue || 0
                          }
                        }))}
                        precision={0.5}
                      />
                    </Grid>

                    {/* Horario de apertura */}
                    <Grid item xs={12} md={4}>
                      <Typography gutterBottom>Horario de atención</Typography>
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TimePicker
                            label="Hora de apertura"
                            value={state.filtros.horarioApertura}
                            onChange={(newValue) => setState(prev => ({
                              ...prev,
                              filtros: {
                                ...prev.filtros,
                                horarioApertura: newValue
                              }
                            }))}
                          />
                          <TimePicker
                            label="Hora de cierre"
                            value={state.filtros.horarioCierre}
                            onChange={(newValue) => setState(prev => ({
                              ...prev,
                              filtros: {
                                ...prev.filtros,
                                horarioCierre: newValue
                              }
                            }))}
                          />
                        </Box>
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={buscarEstablecimientos}
                      startIcon={<FilterListIcon />}
                    >
                      Aplicar Filtros
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Grid>

          <Grid item xs={12}>
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
                      onClick={() => setState(prev => ({ ...prev, mostrarExportar: true }))}
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

            <Paper sx={{ p: 2 }}>
              {state.mostrarHistorial && state.historialBusquedas.length > 0 ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Historial de búsquedas
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Búsqueda</TableCell>
                          <TableCell>Ubicación</TableCell>
                          <TableCell>Radio</TableCell>
                          <TableCell>Filtros</TableCell>
                          <TableCell>Resultados</TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {state.historialBusquedas.slice(1).map((entrada, index) => {
                          const filtros = entrada[6] ? JSON.parse(entrada[6]) : {};
                          return (
                            <TableRow key={index}>
                              <TableCell>{entrada[0]}</TableCell>
                              <TableCell>{entrada[1]}</TableCell>
                              <TableCell>{entrada[2]}</TableCell>
                              <TableCell>{entrada[5]} km</TableCell>
                              <TableCell>
                                <Tooltip title={
                                  <Box>
                                    <Typography variant="caption">Precio: {filtros.precioMinimo}$ - {filtros.precioMaximo}$</Typography><br/>
                                    <Typography variant="caption">Puntuación mínima: {filtros.puntuacionMinima}⭐</Typography><br/>
                                    {filtros.horarioApertura && <Typography variant="caption">Horario: {filtros.horarioApertura} - {filtros.horarioCierre}</Typography>}
                                  </Box>
                                }>
                                  <IconButton size="small">
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{entrada[7]}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setState(prev => ({
                                      ...prev,
                                      busqueda: entrada[1],
                                      busquedaUbicacion: entrada[2],
                                      centro: {
                                        lat: Number(entrada[3]),
                                        lng: Number(entrada[4])
                                      },
                                      radio: Number(entrada[5]),
                                      filtros: JSON.parse(entrada[6]),
                                      mostrarHistorial: false
                                    }));
                                    handleBuscar();
                                  }}
                                >
                                  <SearchIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
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
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, height: '100%' }}>
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
                                value={establecimiento.completitud}
                                sx={{ mb: 1 }}
                              />
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                Información disponible: {Math.round(establecimiento.completitud)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}

                  {state.establecimientos.length === 0 && !state.cargando && (
                    <Grid item xs={12}>
                      <Typography variant="body1" color="text.secondary" textAlign="center" py={3}>
                        No se encontraron establecimientos. Intenta ajustar los filtros o aumentar el radio de búsqueda.
                      </Typography>
                    </Grid>
                  )}
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
              establecimientos={state.establecimientos.filter(e => state.establecimientosSeleccionados.has(e.id))}
              onClose={() => setState(prev => ({ ...prev, mostrarExportar: false }))}
              onSheetCreated={(id) => setState(prev => ({ ...prev, spreadsheetId: id }))}
            />
          )}
        </Grid>
      </Container>
    </>
  );
} 