"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Save, RefreshCw, FileSpreadsheet, PresentationIcon } from "lucide-react"
import { EncabezadoSitio } from "@/components/EncabezadoSitio"
import { VistaPreviaCambios } from "@/componentes/presentaciones/editor/VistaPreviaCambios"
import { ListaDiapositivas } from "@/componentes/presentaciones/ListaDiapositivas"
import { ServicioGoogleSlides } from "@/servicios/googleSlides"
import { ServicioGoogleSheets } from "@/servicios/googleSheets"
import { ElementoDiapositiva, CambioPrevio } from "@/tipos/diapositivas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { redirect } from "next/navigation"

export default function PaginaSincronizar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para diapositivas
  const [diapositivas, setDiapositivas] = useState<any[]>([])
  const [diapositivaSeleccionada, setDiapositivaSeleccionada] = useState<string | null>(null)
  const [elementos, setElementos] = useState<ElementoDiapositiva[]>([])
  const [cambios, setCambios] = useState<CambioPrevio[]>([])
  const [mostrarPreview, setMostrarPreview] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  // Estado para hojas de cálculo
  const [hojaCalculo, setHojaCalculo] = useState<any | null>(null)
  const [hojas, setHojas] = useState<any[]>([])
  const [hojaSeleccionada, setHojaSeleccionada] = useState<number | null>(null)
  const [filas, setFilas] = useState<any[]>([])
  const [columnas, setColumnas] = useState<string[]>([])
  const [filaSeleccionada, setFilaSeleccionada] = useState<any | null>(null)
  
  // Estado para mapeo
  const [variablesMapeadas, setVariablesMapeadas] = useState<Record<string, string>>({})
  const [variablesDetectadas, setVariablesDetectadas] = useState<string[]>([])

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      redirect("/auth/login")
    }
    
    const cargarDatos = async () => {
      try {
        setCargando(true)
        setError(null)
        
        // Obtener IDs de los documentos conectados
        const slidesId = localStorage.getItem("connectedSlides")
        const sheetsId = localStorage.getItem("connectedSheets")
        
        if (!slidesId || !sheetsId) {
          setError("No hay documentos conectados. Por favor, conecta una presentación y una hoja de cálculo.")
          setCargando(false)
          return
        }
        
        // Cargar datos en paralelo
        await Promise.all([
          cargarDiapositivas(slidesId),
          cargarHojaCalculo(sheetsId)
        ])
        
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setCargando(false)
      }
    }
    
    cargarDatos()
  }, [status])
  
  // Cargar diapositivas
  const cargarDiapositivas = async (slidesId: string) => {
    try {
      // Obtener servicio de Google Slides
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia()
      if (!servicioSlides) {
        throw new Error("No se pudo inicializar el servicio de Google Slides")
      }
      
      // Cargar miniaturas de diapositivas
      const resultado = await servicioSlides.obtenerMiniaturas(slidesId)
      if (!resultado.exito || !resultado.datos) {
        throw new Error(resultado.error || "Error al cargar diapositivas")
      }
      
      setDiapositivas(resultado.datos)
      
      if (resultado.datos.length > 0) {
        // Seleccionar la primera diapositiva por defecto
        const primeraId = resultado.datos[0].id
        setDiapositivaSeleccionada(primeraId)
        
        // Cargar elementos de la primera diapositiva
        const elementosResultado = await servicioSlides.obtenerElementosDiapositiva(slidesId, primeraId)
        if (elementosResultado.exito && elementosResultado.datos) {
          setElementos(elementosResultado.datos)
          
          // Extraer variables de los elementos
          const variables = new Set<string>()
          elementosResultado.datos.forEach(elemento => {
            extraerVariables(elemento.contenido).forEach(variable => {
              variables.add(variable)
            })
          })
          
          setVariablesDetectadas(Array.from(variables))
        }
      }
    } catch (error) {
      console.error("Error al cargar diapositivas:", error)
      throw error
    }
  }
  
  // Cargar hoja de cálculo
  const cargarHojaCalculo = async (sheetsId: string) => {
    try {
      // Obtener servicio de Google Sheets
      const servicioSheets = await ServicioGoogleSheets.obtenerInstancia()
      if (!servicioSheets) {
        throw new Error("No se pudo inicializar el servicio de Google Sheets")
      }
      
      // Cargar información de la hoja de cálculo
      const resultado = await servicioSheets.obtenerHojaCalculo(sheetsId)
      if (!resultado.exito || !resultado.datos) {
        throw new Error(resultado.error || "Error al cargar hoja de cálculo")
      }
      
      setHojaCalculo(resultado.datos)
      setHojas(resultado.datos.hojas)
      
      if (resultado.datos.hojas.length > 0) {
        // Seleccionar la primera hoja por defecto
        const primeraHoja = resultado.datos.hojas[0]
        setHojaSeleccionada(primeraHoja.indice)
        
        // Cargar datos de la primera hoja
        await cargarDatosHoja(sheetsId, primeraHoja.indice)
      }
    } catch (error) {
      console.error("Error al cargar hoja de cálculo:", error)
      throw error
    }
  }
  
  // Cargar datos de una hoja específica
  const cargarDatosHoja = async (sheetsId: string, indiceHoja: number) => {
    try {
      const servicioSheets = await ServicioGoogleSheets.obtenerInstancia()
      if (!servicioSheets) return
      
      const resultado = await servicioSheets.obtenerDatosHoja(sheetsId, indiceHoja)
      if (!resultado.exito || !resultado.datos) {
        throw new Error(resultado.error || "Error al cargar datos de la hoja")
      }
      
      setColumnas(resultado.datos.columnas)
      setFilas(resultado.datos.filas)
      
      // Seleccionar primera fila por defecto si hay filas
      if (resultado.datos.filas.length > 0) {
        setFilaSeleccionada(resultado.datos.filas[0])
      }
    } catch (error) {
      console.error("Error al cargar datos de la hoja:", error)
      throw error
    }
  }

  const manejarSeleccionDiapositiva = async (id: string) => {
    if (id === diapositivaSeleccionada) return
    
    try {
      setCargando(true)
      setDiapositivaSeleccionada(id)
      
      const slidesId = localStorage.getItem("connectedSlides")
      if (!slidesId) return
      
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia()
      if (!servicioSlides) return
      
      const resultado = await servicioSlides.obtenerElementosDiapositiva(slidesId, id)
      if (resultado.exito && resultado.datos) {
        setElementos(resultado.datos)
        
        // Extraer variables de los elementos
        const variables = new Set<string>()
        resultado.datos.forEach(elemento => {
          extraerVariables(elemento.contenido).forEach(variable => {
            variables.add(variable)
          })
        })
        
        setVariablesDetectadas(Array.from(variables))
      }
    } catch (err) {
      console.error("Error al cargar elementos:", err)
    } finally {
      setCargando(false)
    }
  }
  
  const manejarSeleccionHoja = async (indice: number) => {
    if (indice === hojaSeleccionada) return
    
    try {
      setCargando(true)
      setHojaSeleccionada(indice)
      
      const sheetsId = localStorage.getItem("connectedSheets")
      if (!sheetsId) return
      
      await cargarDatosHoja(sheetsId, indice)
    } catch (err) {
      console.error("Error al cargar datos de la hoja:", err)
    } finally {
      setCargando(false)
    }
  }
  
  const manejarSeleccionFila = (fila: any) => {
    setFilaSeleccionada(fila)
  }

  const extraerVariables = (contenido: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const coincidencias = contenido.match(regex)
    return coincidencias ? coincidencias.map(match => match.slice(2, -2)) : []
  }
  
  const manejarMapeoVariable = (variable: string, columna: string) => {
    setVariablesMapeadas(prev => ({
      ...prev,
      [variable]: columna
    }))
  }
  
  const aplicarMapeo = () => {
    if (!filaSeleccionada || !diapositivaSeleccionada) return
    
    // Crear nuevos elementos con los valores mapeados
    const elementosActualizados = elementos.map(elemento => {
      let contenidoNuevo = elemento.contenido
      
      // Reemplazar cada variable con el valor correspondiente
      Object.entries(variablesMapeadas).forEach(([variable, columna]) => {
        const valor = filaSeleccionada[columna] || ''
        const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
        contenidoNuevo = contenidoNuevo.replace(regex, valor)
      })
      
      return {
        ...elemento,
        contenido: contenidoNuevo
      }
    })
    
    // Generar cambios para previsualización
    const cambiosPreview = elementosActualizados.map(nuevo => {
      const original = elementos.find(el => el.id === nuevo.id)
      return {
        idDiapositiva: diapositivaSeleccionada,
        idElemento: nuevo.id,
        contenidoAnterior: original?.contenido || '',
        contenidoNuevo: nuevo.contenido,
        variables: extraerVariables(nuevo.contenido)
      }
    }).filter(cambio => cambio.contenidoAnterior !== cambio.contenidoNuevo)
    
    setCambios(cambiosPreview)
    setMostrarPreview(true)
  }

  const manejarGuardar = async (elementosActualizados: ElementoDiapositiva[]) => {
    if (!diapositivaSeleccionada) return
    
    try {
      setGuardando(true)
      
      const slidesId = localStorage.getItem("connectedSlides")
      if (!slidesId) throw new Error("No hay presentación conectada")
      
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia()
      if (!servicioSlides) throw new Error("No se pudo inicializar el servicio")
      
      // Actualizar cada elemento modificado
      for (const elemento of elementosActualizados) {
        const original = elementos.find(el => el.id === elemento.id)
        
        // Solo actualizar si ha cambiado
        if (original && original.contenido !== elemento.contenido) {
          await servicioSlides.actualizarElementos(
            slidesId,
            {
              elementos: [elemento],
              idDiapositiva: diapositivaSeleccionada
            }
          )
        }
      }
      
      // Actualizar elementos locales
      setElementos(elementosActualizados)
      setMostrarPreview(false)
      
    } catch (err) {
      console.error("Error al guardar cambios:", err)
      setError(err instanceof Error ? err.message : "Error al guardar cambios")
    } finally {
      setGuardando(false)
    }
  }

  const manejarAplicarCambios = async () => {
    if (cambios.length === 0 || !diapositivaSeleccionada) return
    
    const elementosActualizados = elementos.map(el => {
      const cambio = cambios.find(c => c.idElemento === el.id)
      return cambio ? { ...el, contenido: cambio.contenidoNuevo } : el
    })
    
    await manejarGuardar(elementosActualizados)
  }

  if (cargando && diapositivas.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push('/proyectos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Button>
          <h1 className="text-2xl font-bold">Sincronización de Datos</h1>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Panel de hoja de cálculo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span>Hoja de Cálculo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hojas.length > 0 && (
                <div className="mb-4">
                  <Label>Seleccionar Hoja</Label>
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {hojas.map((hoja) => (
                      <Button
                        key={hoja.id}
                        variant={hojaSeleccionada === hoja.indice ? "default" : "outline"}
                        size="sm"
                        onClick={() => manejarSeleccionHoja(hoja.indice)}
                      >
                        {hoja.titulo}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-[400px] border rounded-md">
                {filas.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Sel.</TableHead>
                        {columnas.map((columna) => (
                          <TableHead key={columna}>{columna}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filas.map((fila, index) => (
                        <TableRow 
                          key={index}
                          className={filaSeleccionada === fila ? "bg-primary/10" : ""}
                          onClick={() => manejarSeleccionFila(fila)}
                        >
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => manejarSeleccionFila(fila)}
                            >
                              <div className={`h-3 w-3 rounded-full ${filaSeleccionada === fila ? "bg-primary" : "bg-muted"}`} />
                            </Button>
                          </TableCell>
                          {columnas.map((columna) => (
                            <TableCell key={columna}>{fila[columna]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Panel de diapositivas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <PresentationIcon className="h-5 w-5" />
                <span>Presentación</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-4">
                  {diapositivas.map((diapositiva) => (
                    <div
                      key={diapositiva.id}
                      className={`
                        rounded-lg border p-2 cursor-pointer transition-all
                        ${diapositivaSeleccionada === diapositiva.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}
                      `}
                      onClick={() => manejarSeleccionDiapositiva(diapositiva.id)}
                    >
                      <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                        {diapositiva.urlImagen && (
                          <img
                            src={diapositiva.urlImagen}
                            alt={diapositiva.titulo}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{diapositiva.titulo}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Panel de mapeo de variables */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Mapeo de Variables</CardTitle>
          </CardHeader>
          <CardContent>
            {variablesDetectadas.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Selecciona a qué columna de la hoja de cálculo corresponde cada variable detectada en la diapositiva.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variablesDetectadas.map((variable) => (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={`var-${variable}`}>Variable: <span className="font-semibold">{`{{${variable}}}`}</span></Label>
                      <select
                        id={`var-${variable}`}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={variablesMapeadas[variable] || ''}
                        onChange={(e) => manejarMapeoVariable(variable, e.target.value)}
                      >
                        <option value="">Seleccionar columna</option>
                        {columnas.map((columna) => (
                          <option key={columna} value={columna}>{columna}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button onClick={aplicarMapeo} disabled={!filaSeleccionada || !diapositivaSeleccionada}>
                    Aplicar Mapeo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No se han detectado variables en la diapositiva seleccionada.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Las variables deben estar en formato {`{{nombre_variable}}`} en el texto de la diapositiva.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Vista previa de la diapositiva */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Vista Previa de la Diapositiva</CardTitle>
          </CardHeader>
          <CardContent>
            {diapositivaSeleccionada ? (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {diapositivas.find(d => d.id === diapositivaSeleccionada)?.urlImagen && (
                    <img
                      src={diapositivas.find(d => d.id === diapositivaSeleccionada)?.urlImagen}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Elementos de Texto</h3>
                  {elementos.length > 0 ? (
                    <div className="space-y-3">
                      {elementos.map((elemento) => (
                        <div key={elemento.id} className="p-3 border rounded-md">
                          <p className="whitespace-pre-wrap">{elemento.contenido}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No hay elementos de texto en esta diapositiva.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Selecciona una diapositiva para ver su contenido.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Modal de vista previa de cambios */}
      {mostrarPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <VistaPreviaCambios 
              cambios={cambios}
              alAplicar={manejarAplicarCambios}
              alCancelar={() => setMostrarPreview(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
} 