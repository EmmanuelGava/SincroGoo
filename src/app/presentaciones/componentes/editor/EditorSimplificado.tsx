"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/componentes/ui/card"
import { Button } from "@/componentes/ui/button"
import { Textarea } from "@/componentes/ui/textarea"
import { ElementoDiapositiva } from "@/tipos/diapositivas"
import { Save, X, Eye } from "lucide-react"

interface EditorSimplificadoProps {
  idDiapositiva: string;
  elementos: ElementoDiapositiva[];
  alGuardar: (elementos: ElementoDiapositiva[]) => Promise<void>;
  alPrevisualizar: (elementosNuevos: ElementoDiapositiva[]) => void;
  alCancelar: () => void;
  cargando: boolean;
}

export function EditorDiapositiva({
  idDiapositiva,
  elementos,
  alGuardar,
  alPrevisualizar,
  alCancelar,
  cargando
}: EditorSimplificadoProps) {
  const [elementosEditados, setElementosEditados] = useState<ElementoDiapositiva[]>(elementos)
  const [editando, setEditando] = useState<string | null>(null)

  useEffect(() => {
    setElementosEditados(elementos)
  }, [elementos])

  const manejarCambioTexto = (id: string, nuevoContenido: string) => {
    const nuevosElementos = elementosEditados.map(elemento =>
      elemento.id === id ? { ...elemento, contenido: nuevoContenido } : elemento
    )
    setElementosEditados(nuevosElementos)
  }

  const extraerVariables = (texto: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    
    while ((match = regex.exec(texto)) !== null) {
      variables.push(match[1])
    }
    
    return variables
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2 mb-4">
        <Button 
          variant="outline" 
          onClick={alCancelar}
          disabled={cargando}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button 
          variant="outline" 
          onClick={() => alPrevisualizar(elementosEditados)}
          disabled={cargando}
        >
          <Eye className="mr-2 h-4 w-4" />
          Previsualizar
        </Button>
        <Button 
          onClick={() => alGuardar(elementosEditados)}
          disabled={cargando}
        >
          <Save className="mr-2 h-4 w-4" />
          Guardar
        </Button>
      </div>

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
          <p className="text-muted-foreground text-center py-8">
            No hay elementos de texto en esta diapositiva
          </p>
        )}
      </div>
    </div>
  );
} 