"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { EncabezadoSitio } from "@/componentes/EncabezadoSitio"
import { Button } from "@/componentes/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/componentes/ui/card"
import { Input } from "@/componentes/ui/input"
import { Label } from "@/componentes/ui/label"
import { ArrowLeft, Loader2, PresentationIcon, FileSpreadsheet, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/componentes/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/componentes/ui/tabs"
import { redirect } from "next/navigation"

interface Proyecto {
  id: string
  nombre: string
  descripcion: string
  fechaCreacion: string
  presentacionId?: string
  hojaCalculoId?: string
}

export default function ConectarDocumentos() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [presentacionId, setPresentacionId] = useState("")
  const [hojaCalculoId, setHojaCalculoId] = useState("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tabActiva, setTabActiva] = useState<"presentacion" | "hoja">("presentacion")
  
  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      redirect("/auth/login")
    }
    
    const obtenerProyecto = async () => {
      try {
        setCargando(true)
        setError(null)
        
        // Simulación de carga desde API
        // En una implementación real, se obtendría el proyecto desde tu API
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Datos de ejemplo basado en el ID
        const proyectoEjemplo: Proyecto = {
          id,
          nombre: `Proyecto ${id}`,
          descripcion: "Descripción del proyecto",
          fechaCreacion: new Date().toISOString(),
          presentacionId: id === "1" ? "1Abc123XYZ" : undefined,
          hojaCalculoId: id === "3" ? "1Jkl012MNO" : undefined
        }
        
        setProyecto(proyectoEjemplo)
        
        // Preseleccionar la pestaña según qué documento falta
        if (proyectoEjemplo.presentacionId && !proyectoEjemplo.hojaCalculoId) {
          setTabActiva("hoja")
        } else {
          setTabActiva("presentacion")
        }
        
        // Establecer valores iniciales
        if (proyectoEjemplo.presentacionId) {
          setPresentacionId(proyectoEjemplo.presentacionId)
        }
        
        if (proyectoEjemplo.hojaCalculoId) {
          setHojaCalculoId(proyectoEjemplo.hojaCalculoId)
        }
      } catch (err) {
        console.error("Error al cargar el proyecto:", err)
        setError("No se pudo cargar la información del proyecto")
      } finally {
        setCargando(false)
      }
    }
    
    obtenerProyecto()
  }, [id, status])
  
  const extraerIdDesdeUrl = (url: string): string => {
    try {
      // Si ya parece ser un ID, devolverlo directamente
      if (/^[-\w]{25,}$/.test(url)) {
        return url
      }

      // Patrones comunes para ambos tipos de documentos
      const patrones = [
        // Patrones para presentaciones
        /\/presentation\/d\/([-\w]{25,})/,     // Formato normal
        /\/presentation\/d\/([-\w]{25,})\//,   // Con slash al final
        /\/presentation\/d\/([-\w]{25,})\/edit/, // Con /edit
        
        // Patrones para hojas de cálculo
        /\/spreadsheets\/d\/([-\w]{25,})/,     // Formato normal
        /\/spreadsheets\/d\/([-\w]{25,})\//,   // Con slash al final
        /\/spreadsheets\/d\/([-\w]{25,})\/edit/, // Con /edit
        
        // Patrón genérico (último recurso)
        /([-\w]{25,})/                         // Solo ID en cualquier parte
      ]
      
      // Probar cada patrón
      for (const patron of patrones) {
        const coincidencia = url.match(patron)
        if (coincidencia && coincidencia[1]) {
          // Asegurarse de que no hay parámetros extra
          return coincidencia[1].split('?')[0].split('#')[0]
        }
      }
      
      console.error(`No se pudo extraer ID de ${url}`)
      return url  // Si no se puede extraer, devolver la URL original
    } catch (e) {
      console.error("Error al extraer ID desde URL:", e)
      return url  // En caso de error, devolver la URL original
    }
  }
  
  const validarFormulario = () => {
    const tieneNuevaPresentacion = !!presentacionId.trim() && presentacionId !== proyecto?.presentacionId
    const tieneNuevaHoja = !!hojaCalculoId.trim() && hojaCalculoId !== proyecto?.hojaCalculoId
    
    if (!tieneNuevaPresentacion && !tieneNuevaHoja) {
      setError("No se han realizado cambios en los documentos conectados")
      return false
    }
    
    return true
  }
  
  const guardarConexion = async () => {
    if (!validarFormulario()) return
    
    try {
      setGuardando(true)
      setError(null)
      
      // Simulación de guardado en base de datos
      // En una implementación real, aquí se enviaría la información a tu API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Almacenar los IDs en localStorage para uso futuro
      if (presentacionId) {
        const idLimpio = extraerIdDesdeUrl(presentacionId)
        localStorage.setItem("connectedSlides", idLimpio)
      }
      
      if (hojaCalculoId) {
        const idLimpio = extraerIdDesdeUrl(hojaCalculoId)
        localStorage.setItem("connectedSheets", idLimpio)
      }
      
      // Redirigir según los documentos conectados
      if (presentacionId && hojaCalculoId) {
        // Si tiene ambos documentos, ir al editor
        const idPresentacionLimpio = extraerIdDesdeUrl(presentacionId)
        const idHojaLimpio = extraerIdDesdeUrl(hojaCalculoId)
        router.push(`/src/editor?proyectoId=${id}&presentacionId=${idPresentacionLimpio}&hojaCalculoId=${idHojaLimpio}`)
      } else {
        // Si solo tiene uno de los documentos, volver a proyectos
        router.push("/proyectos")
      }
    } catch (err) {
      console.error("Error al guardar la conexión:", err)
      setError("Ocurrió un error al guardar la conexión. Inténtalo de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!proyecto) {
    return (
      <div className="min-h-screen bg-background">
        <EncabezadoSitio />
        <main className="container mx-auto py-8 px-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudo encontrar el proyecto especificado. Por favor, vuelve a proyectos e intenta nuevamente.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-6">
            <Button onClick={() => router.push("/proyectos")}>
              Volver a Proyectos
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-8">
          <Button variant="outlined" onClick={() => router.push("/proyectos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Button>
          <h1 className="ml-4 text-2xl font-bold">Conectar Documentos a "{proyecto.nombre}"</h1>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="presentacion">Presentación de Google</TabsTrigger>
              <TabsTrigger value="hoja">Hoja de Cálculo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="presentacion">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PresentationIcon className="h-5 w-5" />
                    <span>Conectar Presentación</span>
                  </CardTitle>
                  <CardDescription>
                    Vincula una presentación de Google Slides a este proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="presentacion-url">URL o ID de la Presentación</Label>
                    <Input
                      id="presentacion-url"
                      placeholder="Ej: https://docs.google.com/presentation/d/1AbCdEfG..."
                      value={presentacionId}
                      onChange={(e) => setPresentacionId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pega la URL completa o el ID de la presentación que deseas conectar
                    </p>
                  </div>
                  
                  {proyecto.presentacionId && (
                    <div className="bg-primary/10 p-3 rounded-md flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Presentación ya conectada</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {proyecto.presentacionId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Puedes mantenerla o reemplazarla con una nueva
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="hoja">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Conectar Hoja de Cálculo</span>
                  </CardTitle>
                  <CardDescription>
                    Vincula una hoja de cálculo de Google Sheets a este proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hoja-url">URL o ID de la Hoja de Cálculo</Label>
                    <Input
                      id="hoja-url"
                      placeholder="Ej: https://docs.google.com/spreadsheets/d/1AbCdEfG..."
                      value={hojaCalculoId}
                      onChange={(e) => setHojaCalculoId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pega la URL completa o el ID de la hoja de cálculo que deseas conectar
                    </p>
                  </div>
                  
                  {proyecto.hojaCalculoId && (
                    <div className="bg-primary/10 p-3 rounded-md flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Hoja de cálculo ya conectada</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {proyecto.hojaCalculoId}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Puedes mantenerla o reemplazarla con una nueva
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md mt-4 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <Button onClick={guardarConexion} disabled={guardando}>
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Conexión"
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
} 
