"use client"

import { Dialog, DialogContent, DialogTitle } from "@mui/material"
import { Button } from "@/componentes/ui"
import { ScrollArea } from "@/componentes/ui/scroll-area"
import { Check, X } from "lucide-react"

interface CambioPrevio {
  idDiapositiva: string
  idElemento: string
  contenidoAnterior: string
  contenidoNuevo: string
  variables?: string[]
}

interface VistaPreviaCambiosProps {
  cambios: CambioPrevio[]
  onCerrar: () => void
  onAplicar: () => void
  abierto: boolean
  cargando?: boolean
}

export function VistaPreviaCambios({
  cambios,
  onCerrar,
  onAplicar,
  abierto,
  cargando = false
}: VistaPreviaCambiosProps) {
  return (
    <Dialog 
      open={abierto} 
      onClose={onCerrar}
      maxWidth="lg"
      fullWidth
    >
      <DialogContent sx={{ height: '80vh', display: 'flex', flexDirection: 'column', p: 3 }}>
        <DialogTitle>Vista Previa de Cambios</DialogTitle>
        <div className="text-sm text-gray-500 mb-4">
          Revisa los cambios antes de aplicarlos a la presentación
        </div>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 py-4">
            {cambios.map((cambio, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-4 p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium mb-2">Contenido Original</h3>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {cambio.contenidoAnterior}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Contenido Nuevo</h3>
                  <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {cambio.contenidoNuevo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button 
            variant="outlined" 
            onClick={onCerrar}
            startIcon={<X />}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onAplicar}
            disabled={cargando}
            startIcon={<Check />}
          >
            {cargando ? 'Aplicando...' : 'Aplicar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 