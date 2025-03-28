"use client"

import { Button } from '@/componentes/ui/button';
import { Loader2 } from 'lucide-react';

interface PanelGuardarCambiosProps {
  cambiosPendientes: boolean;
  guardando: boolean;
  onGuardarCambios: () => Promise<void>;
}

export function PanelGuardarCambios({
  cambiosPendientes,
  guardando,
  onGuardarCambios
}: PanelGuardarCambiosProps) {
  if (!cambiosPendientes) {
    return null;
  }
  
  return (
    <Button 
      onClick={onGuardarCambios}
      disabled={guardando}
    >
      {guardando ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
          Guardando...
        </>
      ) : (
        'Guardar Cambios'
      )}
    </Button>
  );
} 