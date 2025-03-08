"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ElementoDiapositiva, VistaPreviaDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { Save, X, RotateCcw, Check, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"

interface EditorDiapositivaProps {
  token: string;
  diapositivaSeleccionada?: VistaPreviaDiapositiva;
  elementos: ElementoDiapositiva[];
  elementosSeleccionados: string[];
  alSeleccionarDiapositiva: (idDiapositiva: string, idElemento: string | null) => Promise<void>;
  alActualizarElementos: (elementos: ElementoDiapositiva[]) => Promise<void>;
  alActualizarElementosDiapositiva: (elementos: ElementoDiapositiva[]) => void;
  filaSeleccionada: FilaSeleccionada | null;
  abierto: boolean;
  alCambiarApertura: (abierto: boolean) => void;
  className?: string;
}

export function EditorDiapositiva({
  token,
  diapositivaSeleccionada,
  elementos,
  elementosSeleccionados,
  alSeleccionarDiapositiva,
  alActualizarElementos,
  alActualizarElementosDiapositiva,
  filaSeleccionada,
  abierto,
  alCambiarApertura,
  className
}: EditorDiapositivaProps) {
  const [elementosEditados, setElementosEditados] = useState<ElementoDiapositiva[]>(elementos)
  const [editando, setEditando] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [variablesMapeadas, setVariablesMapeadas] = useState<{[key: string]: string}>({})

  useEffect(() => {
    setElementosEditados(elementos)
    
    // Inicializar el mapeo de variables
    const mapeoInicial: {[key: string]: string} = {}
    elementos.forEach(elemento => {
      extraerVariables(elemento.contenido).forEach(variable => {
        if (!mapeoInicial[variable]) {
          mapeoInicial[variable] = ""
        }
      })
    })
    setVariablesMapeadas(mapeoInicial)
  }, [elementos])

  const extraerVariables = (texto: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    
    while ((match = regex.exec(texto)) !== null) {
      variables.push(match[1])
    }
    
    return variables
  }

  const mapearVariable = (variable: string, columna: string) => {
    setVariablesMapeadas(prev => ({
      ...prev,
      [variable]: columna
    }))
  }

  const aplicarMapeo = () => {
    if (!filaSeleccionada) return
    
    const elementosActualizados = elementosEditados.map(elemento => {
      let contenidoNuevo = elemento.contenido
      
      Object.entries(variablesMapeadas).forEach(([variable, columna]) => {
        if (columna && filaSeleccionada.valores[columna] !== undefined) {
          const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
          contenidoNuevo = contenidoNuevo.replace(regex, String(filaSeleccionada.valores[columna]))
        }
      })
      
      return {
        ...elemento,
        contenido: contenidoNuevo
      }
    })
    
    setElementosEditados(elementosActualizados)
    alActualizarElementosDiapositiva(elementosActualizados)
  }

  const manejarCambioTexto = (id: string, nuevoContenido: string) => {
    const nuevosElementos = elementosEditados.map(elemento =>
      elemento.id === id ? { ...elemento, contenido: nuevoContenido } : elemento
    )
    setElementosEditados(nuevosElementos)
    alActualizarElementosDiapositiva(nuevosElementos)
  }

  const guardarCambios = async () => {
    try {
      setCargando(true)
      await alActualizarElementos(elementosEditados)
    } finally {
      setCargando(false)
    }
  }

  const restaurarOriginales = () => {
    setElementosEditados(elementos)
    alActualizarElementosDiapositiva(elementos)
  }

  const hayDiferencias = () => {
    return JSON.stringify(elementos) !== JSON.stringify(elementosEditados)
  }

  // Obtener todas las columnas disponibles de la fila seleccionada
  const columnasDisponibles = filaSeleccionada 
    ? Object.keys(filaSeleccionada.valores)
    : []

  // Recopilar todas las variables de todos los elementos
  const todasLasVariables = Array.from(
    new Set(
      elementosEditados.flatMap(elemento => 
        extraerVariables(elemento.contenido)
      )
    )
  )

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Vista previa de la diapositiva */}
      {diapositivaSeleccionada?.urlImagen && (
        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
          <Image
            src={diapositivaSeleccionada.urlImagen}
            alt="Vista previa de la diapositiva"
            width={800}
            height={450}
            className="w-full h-full object-contain"
            unoptimized
          />
        </div>
      )}

      {/* Panel de mapeo de variables */}
      {todasLasVariables.length > 0 && columnasDisponibles.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-3">Mapeo de Variables</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todasLasVariables.map(variable => (
                <div key={variable} className="space-y-1">
                  <Label htmlFor={`var-${variable}`}>
                    Variable: <span className="font-semibold">{`{{${variable}}}`}</span>
                  </Label>
                  <Select
                    value={variablesMapeadas[variable] || ""}
                    onValueChange={(value) => mapearVariable(variable, value)}
                    disabled={cargando}
                  >
                    <SelectTrigger id={`var-${variable}`}>
                      <SelectValue placeholder="Seleccionar columna" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnasDisponibles.map(columna => (
                        <SelectItem key={columna} value={columna}>
                          {columna}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={aplicarMapeo}
                disabled={!filaSeleccionada || cargando}
                className="w-full md:w-auto"
              >
                <Check className="mr-2 h-4 w-4" />
                Aplicar Valores
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elementos editables */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Elementos de Texto</h3>
        
        {elementosEditados.length > 0 ? (
          <div className="space-y-4">
            {elementosEditados.map((elemento) => (
              <Card key={elemento.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {editando === elemento.id ? (
                    <div className="p-3">
                      <Textarea
                        value={elemento.contenido}
                        onChange={(e) => manejarCambioTexto(elemento.id, e.target.value)}
                        className="min-h-[100px] mb-3"
                        disabled={cargando}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditando(null)}
                          disabled={cargando}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditando(null)}
                          disabled={cargando}
                        >
                          Aceptar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => !cargando && setEditando(elemento.id)}
                    >
                      <p className="whitespace-pre-wrap">{elemento.contenido}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay elementos de texto en esta diapositiva.</p>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={restaurarOriginales} 
          disabled={!hayDiferencias() || cargando}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar Original
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => alCambiarApertura(false)} 
            disabled={cargando}
          >
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          
          <Button 
            onClick={guardarCambios}
            disabled={!hayDiferencias() || cargando}
          >
            {cargando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
} 