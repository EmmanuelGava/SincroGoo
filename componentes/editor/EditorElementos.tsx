"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, RotateCcw, Loader2, Eye, History } from "lucide-react"
import Image from "next/image"
import { ElementoDiapositiva, VistaPreviaDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { VistaPreviaCambios } from "./VistaPreviaCambios"
import { CambioPrevio } from "@/tipos/diapositivas"
import { HistorialCambios } from "./HistorialCambios"

interface EditorElementosProps {
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
  diapositivas: VistaPreviaDiapositiva[];
  onEditarElemento: (elemento: ElementoDiapositiva) => void;
  className?: string;
}

// Clave para el almacenamiento local de miniaturas
const THUMBNAIL_CACHE_KEY = 'thumbnail_cache';
const THUMBNAIL_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Función para obtener la caché de miniaturas
const getThumbnailCache = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cache = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (cache) {
      const parsedCache = JSON.parse(cache);
      // Limpiar entradas expiradas
      const now = Date.now();
      Object.keys(parsedCache).forEach(key => {
        if (now - parsedCache[key].timestamp > THUMBNAIL_CACHE_DURATION) {
          delete parsedCache[key];
        }
      });
      return parsedCache;
    }
  } catch (error) {
    console.error('Error al obtener caché de miniaturas:', error);
  }
  
  return {};
};

// Función para guardar en la caché de miniaturas
const saveThumbnailCache = (key: string, dataUrl: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getThumbnailCache();
    cache[key] = {
      dataUrl,
      timestamp: Date.now()
    };
    localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error al guardar en caché de miniaturas:', error);
  }
};

export function EditorElementos({
  elementos,
  diapositivaSeleccionada,
  diapositivas,
  filaSeleccionada,
  alSeleccionarDiapositiva,
  alActualizarElementos,
  alActualizarElementosDiapositiva,
  onEditarElemento,
  className
}: EditorElementosProps) {
  const [elementosEditados, setElementosEditados] = useState<ElementoDiapositiva[]>(elementos)
  const [editando, setEditando] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [variablesMapeadas, setVariablesMapeadas] = useState<{[key: string]: string}>({})
  const [elementoAbierto, setElementoAbierto] = useState<string | null>(null)
  const [thumbnailCache, setThumbnailCache] = useState<{[key: string]: {dataUrl: string, timestamp: number}}>({})
  const [mostrandoVistaPreviaCambios, setMostrandoVistaPreviaCambios] = useState(false)
  const [mostrandoHistorialCambios, setMostrandoHistorialCambios] = useState(false)

  // Cargar caché de miniaturas al montar el componente
  useEffect(() => {
    setThumbnailCache(getThumbnailCache());
  }, []);

  // Actualizar elementos cuando cambian las props
  useEffect(() => {
    setElementosEditados(elementos)
    setEditando(null)
  }, [elementos])

  // Memorizar las diapositivas para evitar re-renderizaciones innecesarias
  const diapositivasMemoizadas = useMemo(() => {
    return diapositivas.map(diapositiva => {
      // Verificar si la miniatura está en caché
      const cacheKey = diapositiva.urlImagen;
      const cachedThumbnail = thumbnailCache[cacheKey];
      
      return {
        ...diapositiva,
        // Usar la versión en caché si está disponible
        urlImagenCached: cachedThumbnail?.dataUrl || diapositiva.urlImagen
      };
    });
  }, [diapositivas, thumbnailCache]);

  // Función para manejar la carga de imágenes
  const manejarCargaImagen = (id: string, url: string) => {
    // Solo registrar la carga exitosa sin actualizar el estado para evitar re-renderizaciones
    console.log(`Imagen cargada correctamente: ${id}`);
    
    // Guardar en caché local si es una URL de API
    if (url.startsWith('/api/thumbnails')) {
      const canvas = document.createElement('canvas');
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            saveThumbnailCache(url, dataUrl);
          } catch (error) {
            console.error('Error al convertir imagen a dataURL:', error);
          }
        }
      };
      img.src = url;
    }
  }

  // Función para manejar errores de carga de imágenes
  const manejarErrorImagen = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: string) => {
    console.warn(`Error al cargar la imagen para la diapositiva ${id}`);
    // Establecer una imagen de fallback sin actualizar el estado
    const target = e.target as HTMLImageElement;
    if (target.src !== '/placeholder-slide.png') {
      target.src = '/placeholder-slide.png';
    }
  }

  // Extraer variables del texto
  const extraerVariables = (texto: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = regex.exec(texto)) !== null) {
      variables.push(match[1])
    }
    return variables
  }

  // Obtener todas las variables de todos los elementos
  const todasLasVariables = Array.from(
    new Set(
      elementosEditados.flatMap(elemento => 
        extraerVariables(elemento.contenido)
      )
    )
  )

  // Obtener columnas disponibles de la fila seleccionada
  const columnasDisponibles = filaSeleccionada 
    ? Object.keys(filaSeleccionada.valores)
    : []

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

      // Reemplazar todas las variables con sus valores correspondientes
      Object.entries(variablesMapeadas).forEach(([variable, columna]) => {
        if (columna && filaSeleccionada.valores[columna] !== undefined) {
          const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
          const valor = filaSeleccionada.valores[columna]
          contenidoNuevo = contenidoNuevo.replace(regex, String(valor))
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

  const actualizarContenido = (elemento: ElementoDiapositiva, nuevoContenido: string) => {
    const nuevosElementos = elementosEditados.map(elem =>
      elem.id === elemento.id ? { ...elem, contenido: nuevoContenido } : elem
    )
    setElementosEditados(nuevosElementos)
    alActualizarElementosDiapositiva(nuevosElementos)
    setElementoAbierto(null)
  }

  const guardarCambios = async () => {
    try {
      setCargando(true)
      await alActualizarElementos(elementosEditados)
      setElementosEditados(elementosEditados) // Actualizar el estado local con los cambios guardados
      
      // Añadir notificación de éxito usando toast de sonner
      toast.success("Cambios guardados correctamente en la diapositiva");
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      // Mostrar notificación de error
      toast.error(error instanceof Error ? error.message : "Error desconocido al guardar los cambios");
    } finally {
      setCargando(false)
    }
  }

  const restaurarOriginales = () => {
    setElementosEditados(elementos)
    setEditando(null)
  }

  const hayDiferencias = () => {
    return JSON.stringify(elementos) !== JSON.stringify(elementosEditados)
  }

  const hayVariablesMapeadas = () => {
    return Object.values(variablesMapeadas).some(valor => valor !== "")
  }

  const generarCambiosPrevios = (): CambioPrevio[] => {
    if (!diapositivaSeleccionada) return []
    
    return elementosEditados.map((elementoEditado) => {
      const elementoOriginal = elementos.find(e => e.id === elementoEditado.id)
      
      return {
        idElemento: elementoEditado.id,
        idDiapositiva: diapositivaSeleccionada.id,
        contenidoAnterior: elementoOriginal?.contenido || '',
        contenidoNuevo: elementoEditado.contenido
      }
    }).filter(cambio => cambio.contenidoAnterior !== cambio.contenidoNuevo)
  }

  const mostrarVistaPreviaCambios = () => {
    setMostrandoVistaPreviaCambios(true)
  }

  const mostrarHistorialCambios = () => {
    setMostrandoHistorialCambios(true)
  }

  const restaurarDesdeHistorial = (elementoId: string, contenido: string) => {
    const elementoARestaurar = elementosEditados.find(e => e.id === elementoId)
    
    if (elementoARestaurar) {
      const nuevosElementos = elementosEditados.map(elem =>
        elem.id === elementoId ? { ...elem, contenido } : elem
      )
      
      setElementosEditados(nuevosElementos)
      alActualizarElementosDiapositiva(nuevosElementos)
      setMostrandoHistorialCambios(false)
      
      toast.success("Contenido restaurado correctamente")
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Título de la sección de elementos */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Elementos de Texto</h3>
      </div>

      {/* Panel de elementos */}
      <div className="flex-1 overflow-hidden flex flex-col border rounded-md">
        {diapositivaSeleccionada ? (
          <>
            {/* Encabezado con información de la diapositiva */}
            <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded overflow-hidden border">
                  <img 
                    src={diapositivaSeleccionada.urlImagen} 
                    alt={diapositivaSeleccionada.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium">{diapositivaSeleccionada.titulo}</p>
              </div>
              {filaSeleccionada && hayVariablesMapeadas() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={aplicarMapeo}
                >
                  Aplicar Valores
                </Button>
              )}
            </div>

            {/* Panel de mapeo de variables */}
            {todasLasVariables.length > 0 && columnasDisponibles.length > 0 && (
              <div className="px-3 py-2 border-b">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer">Mapeo de Variables</summary>
                  <div className="mt-2 space-y-2">
                    {todasLasVariables.map(variable => (
                      <div key={variable} className="flex items-center gap-2">
                        <Label htmlFor={`var-${variable}`} className="w-1/3 text-xs">
                          <code>{`{{${variable}}}`}</code>
                        </Label>
                        <Select
                          value={variablesMapeadas[variable] || ""}
                          onValueChange={(value) => mapearVariable(variable, value)}
                        >
                          <SelectTrigger id={`var-${variable}`} className="h-8 text-xs">
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
                </details>
              </div>
            )}

            {/* Lista de elementos */}
            <ScrollArea className="flex-1 px-3 overflow-auto">
              <div className="space-y-3 mb-3">
                {elementosEditados.length > 0 ? (
                  elementosEditados.map((elemento) => (
                    <Popover
                      key={elemento.id}
                      open={elementoAbierto === elemento.id}
                      onOpenChange={(abierto) => setElementoAbierto(abierto ? elemento.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Card 
                          className="cursor-pointer hover:bg-accent transition-colors"
                        >
                          <CardContent className="p-3">
                            <p className="whitespace-pre-wrap">{elemento.contenido}</p>
                          </CardContent>
                        </Card>
                      </PopoverTrigger>
                      
                      {filaSeleccionada && (
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2">
                            {Object.entries(filaSeleccionada.valores)
                              .filter(([_, valor]) => valor !== undefined && valor !== '')
                              .map(([columna, valor]) => (
                                <button
                                  key={columna}
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                                  onClick={() => actualizarContenido(elemento, String(valor))}
                                >
                                  <span className="font-medium">{columna}:</span> {String(valor)}
                                </button>
                              ))}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No hay elementos de texto editables en esta diapositiva
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Barra de acciones fija en la parte inferior */}
            <div className="border-t bg-background p-3 mt-auto">
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={restaurarOriginales}
                  disabled={!hayDiferencias() || cargando}
                  size="sm"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurar
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={mostrarHistorialCambios}
                    size="sm"
                  >
                    <History className="mr-2 h-4 w-4" />
                    Historial
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={mostrarVistaPreviaCambios}
                    disabled={!hayDiferencias() || cargando}
                    size="sm"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Vista Previa
                  </Button>
                  
                  <Button 
                    onClick={guardarCambios}
                    disabled={!hayDiferencias() || cargando}
                    size="sm"
                  >
                    {cargando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Selecciona una diapositiva para ver sus elementos
            </p>
          </div>
        )}
      </div>

      {/* Vista previa de cambios */}
      <VistaPreviaCambios
        abierto={mostrandoVistaPreviaCambios}
        cambios={generarCambiosPrevios()}
        onCerrar={() => setMostrandoVistaPreviaCambios(false)}
        onConfirmar={() => {
          setMostrandoVistaPreviaCambios(false);
          guardarCambios();
        }}
      />
      
      {/* Historial de cambios */}
      <HistorialCambios
        abierto={mostrandoHistorialCambios}
        onCerrar={() => setMostrandoHistorialCambios(false)}
        onRestaurar={restaurarDesdeHistorial}
        idDiapositiva={diapositivaSeleccionada?.id}
      />
    </div>
  )
} 