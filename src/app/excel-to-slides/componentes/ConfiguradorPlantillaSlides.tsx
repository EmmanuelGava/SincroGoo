import React, { useState, useMemo } from 'react';
import '../styles/custom.css';
import PreviewSlideLayout from './PreviewSlideLayout';
import SlideStructureGuide from './SlideStructureGuide';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Grid,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { MapeoColumna, ElementoDiapositiva, Diapositiva } from '../modelos/diapositiva';

interface ConfiguradorPlantillaSlidesProps {
  hojas: string[];
  encabezados: { [columna: string]: string };
  onConfigurar: (diapositivas: Diapositiva[], nombrePresentacion: string) => void;
  onCambioHoja: (nombreHoja: string) => void;
}

interface MapeoColumnaItemProps {
  mapeo: MapeoColumna;
  index: number;
  encabezados: { [key: string]: string };
  onDelete: () => void;
  onChange: (mapeo: MapeoColumna) => void;
}

const ELEMENTOS_DIAPOSITIVA: Record<ElementoDiapositiva, { label: string; description: string }> = {
  titulo_principal: { label: 'Título Principal', description: 'Título principal de la diapositiva' },
  subtitulo_principal: { label: 'Subtítulo Principal', description: 'Subtítulo principal de la diapositiva' },
  contenido_principal: { label: 'Contenido Principal', description: 'Contenido principal de la diapositiva' },
  contenido_secundario: { label: 'Contenido Secundario', description: 'Contenido secundario o adicional' },
  notas: { label: 'Notas', description: 'Notas o comentarios adicionales' },
  pie_pagina: { label: 'Pie de Página', description: 'Texto en el pie de la diapositiva' }
};

const MapeoColumnaItem: React.FC<MapeoColumnaItemProps> = ({
  mapeo,
  index,
  encabezados,
  onDelete,
  onChange
}) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={5}>
          <FormControl fullWidth size="small">
            <InputLabel>Columna Excel</InputLabel>
            <Select
              value={mapeo.columna}
              onChange={(e) => onChange({ 
                ...mapeo, 
                columna: e.target.value,
                encabezado: encabezados[e.target.value]
              })}
              label="Columna Excel"
            >
              {Object.keys(encabezados).map((col) => (
                <MenuItem key={col} value={col}>
                  {col}: {encabezados[col]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={5}>
          <FormControl fullWidth size="small">
            <InputLabel>Elemento de la Diapositiva</InputLabel>
            <Select
              value={mapeo.elementoDiapositiva || ''}
              onChange={(e) => onChange({ 
                ...mapeo, 
                elementoDiapositiva: e.target.value as ElementoDiapositiva 
              })}
              label="Elemento de la Diapositiva"
            >
              {Object.entries(ELEMENTOS_DIAPOSITIVA).map(([valor, { label }]) => (
                <MenuItem key={valor} value={valor}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={2}>
          <IconButton onClick={onDelete} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </Grid>
      </Grid>
    </Paper>
  );
};

const ConfiguradorPlantillaSlides: React.FC<ConfiguradorPlantillaSlidesProps> = ({
  hojas,
  encabezados,
  onConfigurar,
  onCambioHoja
}) => {
  const theme = useTheme();
  const [diapositivas, setDiapositivas] = useState<Diapositiva[]>([]);
  const [nuevaDiapositiva, setNuevaDiapositiva] = useState<Diapositiva>({
    id: '',
    tipo: 'tabla',
    hoja: hojas[0] || '',
    nombre: '',
    filas: {
      inicio: 2,
      filaEncabezados: 1
    },
    filasPorDiapositiva: 1,
    configuracionFiltrado: {
      incluirEncabezados: true
    },
    mapeoColumnas: []
  });
  const [nombrePresentacion, setNombrePresentacion] = useState<string>('');

  const handleAgregarMapeo = () => {
    const elementosUsados = new Set(nuevaDiapositiva.mapeoColumnas?.map(m => m.elementoDiapositiva));
    const elementoDisponible = Object.keys(ELEMENTOS_DIAPOSITIVA).find(
      elemento => !elementosUsados.has(elemento as ElementoDiapositiva)
    ) as ElementoDiapositiva;

    const nuevoMapeo: MapeoColumna = {
      columna: '',
      elementoDiapositiva: elementoDisponible || 'titulo_principal',
      encabezado: ''
    };

    setNuevaDiapositiva({
      ...nuevaDiapositiva,
      mapeoColumnas: [...(nuevaDiapositiva.mapeoColumnas || []), nuevoMapeo]
    });
  };

  const handleEliminarMapeo = (index: number) => {
    const mapeoColumnas = [...(nuevaDiapositiva.mapeoColumnas || [])];
    mapeoColumnas.splice(index, 1);
    setNuevaDiapositiva({
      ...nuevaDiapositiva,
      mapeoColumnas
    });
  };

  const handleUpdateMapeo = (index: number, nuevoMapeo: MapeoColumna) => {
    const mapeoColumnas = [...(nuevaDiapositiva.mapeoColumnas || [])];
    mapeoColumnas[index] = nuevoMapeo;
    setNuevaDiapositiva({
      ...nuevaDiapositiva,
      mapeoColumnas
    });
  };

  const handleAgregarDiapositiva = () => {
    if (!isValidConfig()) return;
    
    const nuevaDiapositivaCompleta: Diapositiva = {
      ...nuevaDiapositiva,
      id: crypto.randomUUID()
    };
    
    setDiapositivas([...diapositivas, nuevaDiapositivaCompleta]);
    setNuevaDiapositiva({
      id: '',
      tipo: 'tabla',
      hoja: hojas[0] || '',
      nombre: '',
      filas: {
        inicio: 2,
        filaEncabezados: 1
      },
      filasPorDiapositiva: 1,
      configuracionFiltrado: {
        incluirEncabezados: true
      },
      mapeoColumnas: []
    });
  };

  const handleEliminarDiapositiva = (index: number) => {
    setDiapositivas(diapositivas.filter((_, i) => i !== index));
  };

  const isValidConfig = () => {
    return nuevaDiapositiva.nombre &&
           nuevaDiapositiva.mapeoColumnas &&
           nuevaDiapositiva.mapeoColumnas.length > 0;
  };

  // Datos de ejemplo para la vista previa
  const datosEjemplo: { [key: string]: string } = {
    'A': 'Neumático Bridgestone Dueler A/T 693 255/70 R16 111T',
    'B': '$355.847',
    'C': 'Neumático todo terreno con excelente rendimiento',
    'D': 'Stock disponible en todas las sucursales',
    'E': '2024-03-21'
  };

  // Mapear los datos de ejemplo según las columnas seleccionadas
  const datosMapeados = useMemo(() => {
    const datos: { [key in ElementoDiapositiva]?: string } = {};
    nuevaDiapositiva.mapeoColumnas?.forEach(mapeo => {
      if (mapeo.columna && mapeo.elementoDiapositiva) {
        datos[mapeo.elementoDiapositiva] = datosEjemplo[mapeo.columna];
      }
    });
    console.log('Datos mapeados:', datos); // Para debug
    return datos;
  }, [nuevaDiapositiva.mapeoColumnas, datosEjemplo]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      width: '100%'
    }}>
      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Configuración general */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Stack spacing={3}>
                <TextField
                  label="Nombre de la presentación"
                  value={nombrePresentacion}
                  onChange={(e) => setNombrePresentacion(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Nombre de la diapositiva"
                  value={nuevaDiapositiva.nombre}
                  onChange={(e) => setNuevaDiapositiva({
                    ...nuevaDiapositiva,
                    nombre: e.target.value
                  })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Hoja de Excel</InputLabel>
                  <Select
                    value={nuevaDiapositiva.hoja}
                    onChange={(e) => {
                      setNuevaDiapositiva({
                        ...nuevaDiapositiva,
                        hoja: e.target.value
                      });
                      onCambioHoja(e.target.value);
                    }}
                    label="Hoja de Excel"
                  >
                    {hojas.map((hoja) => (
                      <MenuItem key={hoja} value={hoja}>
                        {hoja}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Fila de encabezados"
                      type="number"
                      value={nuevaDiapositiva.filas.filaEncabezados}
                      onChange={(e) => setNuevaDiapositiva({
                        ...nuevaDiapositiva,
                        filas: {
                          ...nuevaDiapositiva.filas,
                          filaEncabezados: parseInt(e.target.value) || 1
                        }
                      })}
                      fullWidth
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Fila de inicio de datos"
                      type="number"
                      value={nuevaDiapositiva.filas.inicio}
                      onChange={(e) => setNuevaDiapositiva({
                        ...nuevaDiapositiva,
                        filas: {
                          ...nuevaDiapositiva.filas,
                          inicio: parseInt(e.target.value) || 2
                        }
                      })}
                      fullWidth
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            {/* Configuración de diapositivas */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Configuración de Diapositivas
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Mapeo de columnas */}
                <Typography variant="subtitle1" gutterBottom>
                  Mapeo de Columnas
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {nuevaDiapositiva.mapeoColumnas?.map((mapeo, index) => (
                    <MapeoColumnaItem
                      key={index}
                      mapeo={mapeo}
                      index={index}
                      encabezados={encabezados}
                      onDelete={() => handleEliminarMapeo(index)}
                      onChange={(nuevoMapeo) => handleUpdateMapeo(index, nuevoMapeo)}
                    />
                  ))}
                </Box>

                {/* Botón para agregar mapeo */}
                <Button
                  variant="outlined"
                  onClick={handleAgregarMapeo}
                  startIcon={<AddIcon />}
                  disabled={nuevaDiapositiva.mapeoColumnas?.length === Object.keys(ELEMENTOS_DIAPOSITIVA).length}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Agregar Mapeo
                </Button>
              </Box>
            </Paper>

            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleAgregarDiapositiva}
                disabled={!isValidConfig()}
              >
                Agregar Diapositiva
              </Button>
            </Box>

            {/* Lista de diapositivas configuradas */}
            {diapositivas.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Diapositivas Configuradas
                </Typography>
                <List>
                  {diapositivas.map((diapositiva, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleEliminarDiapositiva(index)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={diapositiva.nombre} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Box sx={{ 
            position: 'sticky', 
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            height: 'fit-content',
            padding: 3,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: 1
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 2
            }}>
              <Typography variant="h6" gutterBottom>
                Vista Previa
              </Typography>
              <PreviewSlideLayout 
                mapeoColumnas={nuevaDiapositiva.mapeoColumnas || []} 
                datosEjemplo={datosMapeados}
              />
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 2,
              pt: 2,
              borderTop: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="h6" gutterBottom>
                Guía de Estructura
              </Typography>
              <SlideStructureGuide />
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Botón de configuración final */}
      {diapositivas.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => onConfigurar(diapositivas, nombrePresentacion || 'Presentación sin título')}
            startIcon={<SaveIcon />}
          >
            Guardar Configuración
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ConfiguradorPlantillaSlides; 