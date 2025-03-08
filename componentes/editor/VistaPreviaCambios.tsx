"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X } from "lucide-react"
import { CambioPrevio } from "@/tipos/diapositivas"

interface VistaPreviaCambiosProps {
  abierto: boolean
  cambios: CambioPrevio[]
  onCerrar: () => void
  onConfirmar: () => void
}

export function VistaPreviaCambios({
  abierto,
  cambios,
  onCerrar,
  onConfirmar
}: VistaPreviaCambiosProps) {
  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa de Cambios</DialogTitle>
          <DialogDescription>
            Revisa los cambios antes de aplicarlos a las diapositivas
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4">
            {cambios.length > 0 ? (
              cambios.map((cambio, index) => (
                <div key={index} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Cambio en elemento {cambio.idElemento}</h3>
                    <span className="text-xs text-muted-foreground">
                      Diapositiva: {cambio.idDiapositiva}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Contenido Original</h4>
                      <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                        {cambio.contenidoAnterior || <em className="text-muted-foreground">Vacío</em>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Nuevo Contenido</h4>
                      <div className="bg-primary/5 border-primary/20 border p-3 rounded-md text-sm whitespace-pre-wrap">
                        {cambio.contenidoNuevo || <em className="text-muted-foreground">Vacío</em>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay cambios para aplicar
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onCerrar}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          
          <Button onClick={onConfirmar} disabled={cambios.length === 0}>
            <Check className="mr-2 h-4 w-4" />
            Aplicar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 