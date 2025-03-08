"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ElementoDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Save, X } from "lucide-react"

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
  const [contenidoEditado, setContenidoEditado] = useState(elemento.contenido)
  const columnasDisponibles = Object.keys(filaSeleccionada.valores)

  const actualizarContenido = (valor: string) => {
    setContenidoEditado(valor)
  }

  const guardarCambios = () => {
    alGuardar({
      ...elemento,
      contenido: contenidoEditado
    })
    alCerrar()
  }

  return (
    <Dialog open={abierto} onOpenChange={alCerrar}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Elemento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contenido Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{contenidoEditado}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Seleccionar Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={contenidoEditado || "default"}
                onValueChange={actualizarContenido}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar valor de la fila" />
                </SelectTrigger>
                <SelectContent>
                  {columnasDisponibles
                    .filter(columna => {
                      const valor = filaSeleccionada.valores[columna]
                      return valor !== undefined && valor !== ''
                    })
                    .map(columna => {
                      const valor = String(filaSeleccionada.valores[columna])
                      return (
                        <SelectItem 
                          key={columna} 
                          value={valor || columna}
                        >
                          {columna}: {valor}
                        </SelectItem>
                      )
                    })
                  }
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={alCerrar}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={guardarCambios}>
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 