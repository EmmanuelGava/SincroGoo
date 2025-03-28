"use client"

import React from 'react';
import { Button } from '@mui/material';
import { RotateLeft as RotateLeftIcon } from '@mui/icons-material';
import { ElementoDiapositiva } from '@/tipos/diapositivas';
import { toast } from 'sonner';

interface BotonCancelarElementosProps {
  elementos: ElementoDiapositiva[];
  elementosOriginales: ElementoDiapositiva[];
  hayElementosModificados: boolean;
  onRestaurar: (elementosRestaurados: ElementoDiapositiva[]) => void;
  setAsociacionesCambiadas?: (cambiadas: boolean) => void;
}

export function BotonCancelarElementos({
  elementos,
  elementosOriginales,
  hayElementosModificados,
  onRestaurar,
  setAsociacionesCambiadas
}: BotonCancelarElementosProps) {
  
  const restaurarOriginales = () => {
    console.log('🔍 [BotonCancelarElementos] Restaurando elementos originales');
    
    try {
      // Restaurar los elementos a su estado original
      const elementosRestaurados = elementosOriginales.map(elementoOriginal => {
        return {
          ...elementoOriginal,
          modificado: false
        };
      });
      
      // Llamar al callback para actualizar el estado en el componente padre
      onRestaurar(elementosRestaurados);
      
      // Resetear el estado de asociaciones cambiadas
      if (setAsociacionesCambiadas) {
        console.log('🔍 [BotonCancelarElementos] Reseteando estado de asociaciones cambiadas');
        setAsociacionesCambiadas(false);
      }
      
      // Mostrar notificación de éxito
      toast.success('Cambios descartados', {
        duration: 2000
      });
      
      console.log('✅ [BotonCancelarElementos] Elementos restaurados correctamente');
    } catch (error) {
      console.error('❌ [BotonCancelarElementos] Error al restaurar elementos:', error);
      toast.error('Error al descartar cambios');
    }
  };
  
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={restaurarOriginales}
      disabled={!hayElementosModificados}
      startIcon={<RotateLeftIcon fontSize="small" />}
    >
      Cancelar
    </Button>
  );
} 