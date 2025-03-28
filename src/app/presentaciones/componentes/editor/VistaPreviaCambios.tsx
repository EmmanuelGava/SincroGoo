"use client"

import { Button } from "@/componentes/ui/button"
import { Card, CardContent } from "@/componentes/ui/card"
import { ScrollArea } from "@/componentes/ui/scroll-area"
import { Check, X, Loader2 } from "lucide-react"

interface CambioPrevio {
  idDiapositiva: string
  idElemento: string
  contenidoAnterior: string
  contenidoNuevo: string
  variables?: string[]
}

interface VistaPreviaCambiosProps {
  cambios: CambioPrevio[]
  alAplicar: () => void
  alCancelar: () => void
  cargando?: boolean
}

export function VistaPreviaCambios({ cambios, alAplicar, alCancelar, cargando = false }: VistaPreviaCambiosProps) {
  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Vista Previa de Cambios</h2>
        <p className="text-sm text-muted-foreground">
          Revisa los cambios antes de aplicarlos a la presentación.
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {cambios.length > 0 ? (
            cambios.map((cambio, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 divide-x">
                    <div className="p-4 bg-muted/30">
                      <h3 className="text-sm font-medium mb-2">Contenido Original</h3>
                      <div className="p-3 bg-background rounded border whitespace-pre-wrap">
                        {cambio.contenidoAnterior}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium mb-2">Contenido Nuevo</h3>
                      <div className="p-3 bg-background rounded border whitespace-pre-wrap">
                        {cambio.contenidoNuevo}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay cambios para aplicar.</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={alCancelar} disabled={cargando}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button onClick={alAplicar} disabled={cambios.length === 0 || cargando}>
          {cargando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aplicando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Aplicar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 