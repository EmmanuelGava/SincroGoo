"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Box, 
  Paper, 
  Divider, 
  Fade, 
  Backdrop, 
  Modal,
  SelectChangeEvent,
  useTheme
} from '@mui/material';
import styled from '@emotion/styled';
import { ElementoDiapositiva } from '@/tipos/diapositivas';
import { FilaSeleccionada } from '@/tipos/hojas';
import { useEditor } from '../../contexto/EditorContext';
import { createPortal } from 'react-dom';
import { useThemeMode } from '@/lib/theme';

// Estilos para el popup
const PopupCard = styled(Card)(({ theme }) => ({
  position: 'absolute',
  width: 320,
  maxWidth: '90vw',
  maxHeight: '80vh',
  overflow: 'auto',
  borderRadius: 12,
  boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.1)',
  zIndex: 1000,
}));

// Función para detectar el tema del sistema
const detectarTema = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  // Verificar si el sistema prefiere modo oscuro
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Verificar si hay una preferencia guardada
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') return 'dark';
  if (savedTheme === 'light') return 'light';
  
  // Si no hay preferencia guardada, usar la del sistema
  return prefersDark ? 'dark' : 'light';
};

// Función para obtener colores según el tema
const obtenerColoresTema = (tema: 'light' | 'dark') => {
  return {
    background: tema === 'dark' ? '#1e1e1e' : '#ffffff',
    text: tema === 'dark' ? '#e0e0e0' : '#333333',
    border: tema === 'dark' ? '#333333' : '#e0e0e0',
    accent: tema === 'dark' ? '#90caf9' : '#3f51b5',
  };
};

interface EditorElementoPopupProps {
  elemento: ElementoDiapositiva;
  filaSeleccionada: FilaSeleccionada;
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: (elementoActualizado: ElementoDiapositiva) => void;
}

export function EditorElementoPopup({
  elemento,
  filaSeleccionada,
  abierto,
  alCerrar,
  alGuardar
}: EditorElementoPopupProps) {
  // Estado para columna seleccionada
  const [columnaSeleccionada, setColumnaSeleccionada] = useState<string | null>(
    elemento.columnaAsociada || null
  );
  
  // Usar el tema de Material UI
  const theme = useTheme();
  const { mode } = useThemeMode();
  
  // Obtener la posición del popup del contexto
  const { popupPosition } = useEditor();
  
  // Actualizar estado cuando cambie el elemento
  useEffect(() => {
    setColumnaSeleccionada(elemento.columnaAsociada || null);
  }, [elemento.columnaAsociada]);
  
  console.log('Renderizando EditorElementoPopup para elemento:', elemento);
  console.log('Estado de abierto:', abierto);
  console.log('Fila seleccionada en EditorElementoPopup:', filaSeleccionada);
  console.log('Posición del popup:', popupPosition);
  
  // Filtrar valores no vacíos para mostrar en el selector
  const valoresFiltrados = useMemo(() => {
    const valores: Record<string, string> = {};
    if (filaSeleccionada) {
      Object.entries(filaSeleccionada.valores).forEach(([columna, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
          valores[columna] = String(valor);
        }
      });
    }
    return valores;
  }, [filaSeleccionada]);
  
  // Detectar si hay una coincidencia entre el valor del elemento y algún valor de la fila
  const coincidenciaValor = useMemo(() => {
    if (!filaSeleccionada || !elemento.contenido || elemento.contenido.trim() === '') {
      return null;
    }
    
    const elementoValor = elemento.contenido.trim();
    
    // Buscar coincidencia
    const coincidencia = Object.entries(valoresFiltrados).find(
      ([columna, valor]) => valor.trim() === elementoValor
    );
    
    return coincidencia ? coincidencia[0] : null;
  }, [filaSeleccionada, elemento.contenido, valoresFiltrados]);
  
  // Función para manejar el cambio en el selector
  const handleSelectChange = (event: SelectChangeEvent) => {
    const columna = event.target.value;
    setColumnaSeleccionada(columna);
  };
  
  // Función para guardar la selección
  const guardarSeleccion = () => {
    if (columnaSeleccionada) {
      // Obtener el valor de la columna seleccionada
      const valorSeleccionado = valoresFiltrados[columnaSeleccionada];
      
      // Solo actualizar el contenido, sin enlazar
      const elementoActualizado: ElementoDiapositiva = {
        ...elemento,
        contenido: valorSeleccionado,
        modificado: true
        // No establecer columnaAsociada ni tipoAsociacion
      };
      
      alGuardar(elementoActualizado);
      alCerrar();
    }
  };
  
  // Función para usar el valor coincidente y establecer la asociación
  const usarValorCoincidente = (columna: string, valor: string) => {
    console.log('🔍 [EditorElementoPopup] Usando valor coincidente');
    console.log(`- Columna: ${columna}`);
    console.log(`- Valor: ${valor}`);

    // Crear elemento actualizado con asociación
    const elementoActualizado: ElementoDiapositiva = {
      ...elemento,
      contenido: valor,
      modificado: true,
      columnaAsociada: columna,        // Establecer columna asociada
      tipoAsociacion: 'manual'         // Establecer tipo de asociación como 'manual'
    };
    
    console.log('✅ [EditorElementoPopup] Elemento actualizado con asociación:', elementoActualizado);

    // Emitir evento de cambio de asociación
    emitirEventoCambioAsociacion(elementoActualizado, columna);
    
    // Guardar cambios y cerrar el popup
    alGuardar(elementoActualizado);
    alCerrar();
  };
  
  // Función para seleccionar un valor y establecer la asociación
  const seleccionarValor = (columna: string, valor: string) => {
    console.log('🔍 [EditorElementoPopup] Seleccionando valor');
    console.log(`- Columna: ${columna}`);
    console.log(`- Valor: ${valor}`);
    
    // Establecer columna seleccionada
    setColumnaSeleccionada(columna);
    
    // Crear elemento actualizado con asociación
    const elementoActualizado: ElementoDiapositiva = {
      ...elemento,
      contenido: valor,
      modificado: true,
      columnaAsociada: columna,        // Establecer columna asociada
      tipoAsociacion: 'manual'         // Establecer tipo de asociación como 'manual'
    };
    
    console.log('✅ [EditorElementoPopup] Elemento actualizado con asociación:', elementoActualizado);

    // Emitir evento de cambio de asociación
    emitirEventoCambioAsociacion(elementoActualizado, columna);
    
    // Guardar cambios y cerrar el popup
    alGuardar(elementoActualizado);
    alCerrar();
  };
  
  // Función para emitir evento de cambio de asociación
  const emitirEventoCambioAsociacion = (elementoActualizado: ElementoDiapositiva, columnaNueva: string) => {
    console.log('🔍 [EditorElementoPopup] Emitiendo evento de cambio de asociación');
    
    // Crear evento personalizado
    const eventoPersonalizado = new CustomEvent('cambio-asociacion', {
      detail: {
        elemento: elementoActualizado,
        columnaAnterior: elemento.columnaAsociada,
        columnaNueva: columnaNueva,
        tipoAccion: 'asociar',
        // No podemos acceder directamente a idPresentacion e idHoja en este punto,
        // pero podemos confiar en que el listener que maneja este evento los obtendrá del contexto
      }
    });
    
    // Disparar el evento en el documento
    console.log('🔍 [EditorElementoPopup] Disparando evento cambio-asociacion en el documento');
    document.dispatchEvent(eventoPersonalizado);
    console.log('✅ [EditorElementoPopup] Evento cambio-asociacion disparado correctamente');
  };
  
  // Si no está abierto, no renderizar nada
  if (!abierto) return null;
  
  // Calcular la posición del popup
  const popupStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 350,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    bgcolor: mode === 'dark' ? theme.palette.background.paper : '#fff',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    p: 0,
    borderRadius: 1,
    outline: 'none', // Eliminar el outline predeterminado
    border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`
  };
  
  // Renderizar el popup usando un portal
  return createPortal(
    <Modal
      open={abierto}
      onClose={alCerrar}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
      aria-labelledby="editor-elemento-titulo"
      aria-describedby="editor-elemento-descripcion"
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
    >
      <Fade in={abierto}>
        <Box sx={popupStyle}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" id="editor-elemento-titulo" gutterBottom>
              Editar elemento
            </Typography>
            
            <Typography variant="body2" id="editor-elemento-descripcion" color="text.secondary" gutterBottom>
              Selecciona un valor para asignar al elemento
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Elemento actual:
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 1.5, 
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  borderColor: theme.palette.divider
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {elemento.contenido || "(Sin contenido)"}
                </Typography>
              </Paper>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Selecciona una columna:
            </Typography>
            
            {coincidenciaValor && (
              <Box 
                sx={{ 
                  mb: 2, 
                  p: 1.5, 
                  bgcolor: 'info.main', 
                  color: 'info.contrastText',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2">
                  Se encontró una coincidencia con la columna "{coincidenciaValor}".
                </Typography>
                <Button 
                  variant="contained" 
                  color="info" 
                  size="small" 
                  onClick={() => usarValorCoincidente(coincidenciaValor, valoresFiltrados[coincidenciaValor])}
                  sx={{ mt: 1 }}
                >
                  Usar este valor
                </Button>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, mt: 1, maxHeight: '30vh', overflow: 'auto' }}>
              {Object.entries(valoresFiltrados).map(([columna, valor]) => (
                <Paper 
                  key={columna}
                  variant="outlined"
                  sx={{ 
                    p: 1.5, 
                    cursor: 'pointer',
                    borderColor: columna === columnaSeleccionada ? theme.palette.primary.main : 'divider',
                    borderWidth: columna === columnaSeleccionada ? 2 : 1,
                    bgcolor: columna === columnaSeleccionada ? `${theme.palette.primary.main}10` : 'background.paper',
                    '&:hover': {
                      bgcolor: `${theme.palette.primary.main}08`,
                      borderColor: theme.palette.primary.main,
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onClick={() => seleccionarValor(columna, valor)}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" color="primary">
                      {columna}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                      {valor}
                    </Typography>
                  </Box>
                </Paper>
              ))}
              
              {Object.keys(valoresFiltrados).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No hay valores disponibles para enlazar
                </Typography>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button 
                variant="outlined" 
                onClick={alCerrar}
              >
                Cancelar
              </Button>
            </Box>
          </CardContent>
        </Box>
      </Fade>
    </Modal>,
    document.body
  );
} 