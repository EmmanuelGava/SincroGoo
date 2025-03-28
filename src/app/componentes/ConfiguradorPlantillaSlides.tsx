import React, { useState } from 'react';
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
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Diapositiva {
  id: string;
  tipo: 'titulo' | 'tabla' | 'grafico';
  hoja: string;
  rango?: string;
  titulo?: string;
  subtitulo?: string;
  tipoGrafico?: 'barras' | 'lineas' | 'circular';
}

interface ConfiguradorPlantillaSlidesProps {
  hojas: string[];
  onConfigurar: (diapositivas: Diapositiva[]) => void;
}

export default function ConfiguradorPlantillaSlides({
  hojas,
  onConfigurar
}: ConfiguradorPlantillaSlidesProps) {
  const [diapositivas, setDiapositivas] = useState<Diapositiva[]>([]);
  const [nuevaDiapositiva, setNuevaDiapositiva] = useState<Diapositiva>({
    id: '',
    tipo: 'titulo',
    hoja: hojas[0] || '',
    titulo: '',
  });

  const handleAgregarDiapositiva = () => {
    const id = `slide_${Date.now()}`;
    setDiapositivas([...diapositivas, { ...nuevaDiapositiva, id }]);
    setNuevaDiapositiva({
      id: '',
      tipo: 'titulo',
      hoja: hojas[0] || '',
      titulo: '',
    });
  };

  const handleEliminarDiapositiva = (id: string) => {
    setDiapositivas(diapositivas.filter(d => d.id !== id));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(diapositivas);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setDiapositivas(items);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configurar Diapositivas
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Diapositiva</InputLabel>
            <Select
              value={nuevaDiapositiva.tipo}
              label="Tipo de Diapositiva"
              onChange={(e) => setNuevaDiapositiva({
                ...nuevaDiapositiva,
                tipo: e.target.value as 'titulo' | 'tabla' | 'grafico'
              })}
            >
              <MenuItem value="titulo">Título</MenuItem>
              <MenuItem value="tabla">Tabla</MenuItem>
              <MenuItem value="grafico">Gráfico</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Hoja</InputLabel>
            <Select
              value={nuevaDiapositiva.hoja}
              label="Hoja"
              onChange={(e) => setNuevaDiapositiva({
                ...nuevaDiapositiva,
                hoja: e.target.value as string
              })}
            >
              {hojas.map((hoja) => (
                <MenuItem key={hoja} value={hoja}>
                  {hoja}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Título"
            value={nuevaDiapositiva.titulo}
            onChange={(e) => setNuevaDiapositiva({
              ...nuevaDiapositiva,
              titulo: e.target.value
            })}
          />

          {nuevaDiapositiva.tipo === 'titulo' && (
            <TextField
              fullWidth
              label="Subtítulo"
              value={nuevaDiapositiva.subtitulo}
              onChange={(e) => setNuevaDiapositiva({
                ...nuevaDiapositiva,
                subtitulo: e.target.value
              })}
            />
          )}

          {(nuevaDiapositiva.tipo === 'tabla' || nuevaDiapositiva.tipo === 'grafico') && (
            <TextField
              fullWidth
              label="Rango (ej: A1:D10)"
              value={nuevaDiapositiva.rango}
              onChange={(e) => setNuevaDiapositiva({
                ...nuevaDiapositiva,
                rango: e.target.value
              })}
            />
          )}

          {nuevaDiapositiva.tipo === 'grafico' && (
            <FormControl fullWidth>
              <InputLabel>Tipo de Gráfico</InputLabel>
              <Select
                value={nuevaDiapositiva.tipoGrafico || 'barras'}
                label="Tipo de Gráfico"
                onChange={(e) => setNuevaDiapositiva({
                  ...nuevaDiapositiva,
                  tipoGrafico: e.target.value as 'barras' | 'lineas' | 'circular'
                })}
              >
                <MenuItem value="barras">Barras</MenuItem>
                <MenuItem value="lineas">Líneas</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAgregarDiapositiva}
          >
            Agregar Diapositiva
          </Button>
        </Stack>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Diapositivas ({diapositivas.length})
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="diapositivas">
          {(provided) => (
            <List
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1
              }}
            >
              {diapositivas.map((diapositiva, index) => (
                <Draggable
                  key={diapositiva.id}
                  draggableId={diapositiva.id}
                  index={index}
                >
                  {(provided) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleEliminarDiapositiva(diapositiva.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <div {...provided.dragHandleProps}>
                        <DragHandleIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      </div>
                      <ListItemText
                        primary={`${index + 1}. ${diapositiva.titulo}`}
                        secondary={`${diapositiva.tipo} - ${diapositiva.hoja}${diapositiva.rango ? ` (${diapositiva.rango})` : ''}`}
                      />
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => onConfigurar(diapositivas)}
          disabled={diapositivas.length === 0}
        >
          Generar Presentación
        </Button>
      </Box>
    </Box>
  );
} 