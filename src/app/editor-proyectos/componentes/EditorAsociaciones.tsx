"use client"

import React from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography
} from '@mui/material';

interface EditorAsociacionesProps {
  elementos: Array<{
    id: string;
    tipo: string;
    columnaAsociada: string | null;
  }>;
  columnas: string[];
  onAsociar?: (elementoId: string, columna: string | null) => void;
  marcarCambiosAsociaciones?: (cambios: boolean) => void;
  idPresentacion?: string;
  idHoja?: string;
  idDiapositiva?: string;
}

// Manejar cambio en la asociación
const handleAsociacionChange = (
  elementoId: string, 
  columna: string | null,
  onAsociar?: (elementoId: string, columna: string | null) => void,
  marcarCambiosAsociaciones?: (cambios: boolean) => void,
  idPresentacion?: string,
  idHoja?: string,
  idDiapositiva?: string
) => {
  console.log(`🔍 [EditorAsociaciones] Cambio de asociación para elemento ${elementoId}`);
  console.log(`- Columna seleccionada: ${columna || 'ninguna'}`);
  
  // Si tenemos función de asociación, llamarla
  if (onAsociar) {
    onAsociar(elementoId, columna);
  }
  
  // Marcar que hay cambios en asociaciones para habilitar el botón de guardar
  if (marcarCambiosAsociaciones) {
    console.log('🔍 [EditorAsociaciones] Marcando cambio en asociaciones en el estado global');
    marcarCambiosAsociaciones(true);
  }
  
  // Emitir un evento para que otros componentes puedan reaccionar
  try {
    const evento = new CustomEvent('cambio-asociacion', {
      detail: {
        idPresentacion,
        idHoja,
        idDiapositiva,
        elementoId,
        columna,
        timestamp: new Date().getTime()
      }
    });
    
    console.log('✅ [EditorAsociaciones] Emitiendo evento cambio-asociacion:', evento.detail);
    document.dispatchEvent(evento);
  } catch (error) {
    console.error('❌ [EditorAsociaciones] Error al emitir evento de cambio:', error);
  }
};

export function EditorAsociaciones({
  elementos,
  columnas,
  onAsociar,
  marcarCambiosAsociaciones,
  idPresentacion,
  idHoja,
  idDiapositiva
}: EditorAsociacionesProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Asociaciones
      </Typography>
      {elementos.map((elemento) => (
        <FormControl key={elemento.id} fullWidth>
          <InputLabel id={`asociacion-${elemento.id}-label`}>
            {elemento.tipo}
          </InputLabel>
          <Select
            labelId={`asociacion-${elemento.id}-label`}
            id={`asociacion-${elemento.id}`}
            value={elemento.columnaAsociada || ''}
            label={elemento.tipo}
            onChange={(e) => handleAsociacionChange(
              elemento.id,
              e.target.value || null,
              onAsociar,
              marcarCambiosAsociaciones,
              idPresentacion,
              idHoja,
              idDiapositiva
            )}
          >
            <MenuItem value="">
              <em>Sin asociar</em>
            </MenuItem>
            {columnas.map((columna) => (
              <MenuItem key={columna} value={columna}>
                {columna}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
    </Box>
  );
} 