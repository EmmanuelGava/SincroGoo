"use client"

import React, { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { FileSpreadsheet, FileIcon as FilePresentation, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ConectarDocumentos() {
  const [sheetsId, setSheetsId] = useState("")
  const [slidesId, setSlidesId] = useState("")
  const [nombreProyecto, setNombreProyecto] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Verificar sesión al cargar
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        if (status === "loading") return

        if (status === "unauthenticated") {
          await signOut({ redirect: false })
          localStorage.clear()
          sessionStorage.clear()
          router.replace("/")
          return
        }

        if (session?.error === "RefreshAccessTokenError") {
          await signOut({ redirect: false })
          localStorage.clear()
          sessionStorage.clear()
          toast.error("La sesión ha expirado. Por favor, inicia sesión nuevamente.")
          signIn("google")
          return
        }

        setIsInitializing(false)
      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setIsInitializing(false)
      }
    }

    verificarSesion()
  }, [session, status, router])

  // Cargar IDs guardados al iniciar
  useEffect(() => {
    if (status === "authenticated" && !isInitializing) {
      const savedSheetsId = localStorage.getItem("connectedSheets")
      const savedSlidesId = localStorage.getItem("connectedSlides")
      const savedProjectName = localStorage.getItem("projectName")
      
      if (savedSheetsId) setSheetsId(savedSheetsId)
      if (savedSlidesId) setSlidesId(savedSlidesId)
      if (savedProjectName) setNombreProyecto(savedProjectName)
    }
  }, [status, isInitializing])

  const manejarConexion = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sheetsId || !slidesId) {
      toast.error("Por favor ingresa los IDs de ambos documentos")
      return
    }

    if (!nombreProyecto) {
      toast.error("Por favor ingresa un nombre para el proyecto")
      return
    }

    if (status !== "authenticated" || !session) {
      await signOut({ redirect: false })
      toast.error("No se encontró la sesión. Por favor inicia sesión nuevamente.")
      signIn("google")
      return
    }

    if (!session.accessToken) {
      await signOut({ redirect: false })
      toast.error("Token de acceso no disponible. Por favor inicia sesión nuevamente.")
      signIn("google")
      return
    }

    setIsConnecting(true)
    try {
      console.log("Verificando sesión y token...")
      console.log("Estado de la sesión:", status)
      console.log("Token presente:", !!session.accessToken)
      console.log("Error en sesión:", session.error)
      console.log("Usuario:", session.user?.email)

      // Verificar acceso a los documentos usando el token del usuario
      const [sheetsResponse, slidesResponse] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}?fields=spreadsheetId,properties.title`, {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`https://slides.googleapis.com/v1/presentations/${slidesId}?fields=presentationId,title`, {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!sheetsResponse.ok || !slidesResponse.ok) {
        // Intentar obtener el mensaje de error
        const [sheetsError, slidesError] = await Promise.all([
          sheetsResponse.json().catch(() => ({})),
          slidesResponse.json().catch(() => ({}))
        ])

        console.error("Error responses:", { sheetsError, slidesError })

        if (sheetsResponse.status === 401 || slidesResponse.status === 401) {
          await signOut({ redirect: false })
          throw new Error("Error de autenticación. Por favor, inicia sesión nuevamente.")
        }

        const errorMessage = sheetsError.error?.message || slidesError.error?.message || "Error al acceder a los documentos"
        throw new Error(errorMessage)
      }

      const [sheetsData, slidesData] = await Promise.all([
        sheetsResponse.json(),
        slidesResponse.json()
      ])

      console.log("Documentos verificados:", {
        sheets: sheetsData.properties?.title,
        slides: slidesData.title
      })

      // Guardar las referencias en localStorage y sessionStorage
      localStorage.setItem("connectedSheets", sheetsId)
      localStorage.setItem("connectedSlides", slidesId)
      localStorage.setItem("projectName", nombreProyecto)
      
      // Guardar información del proyecto
      const proyectoInfo = {
        id: Date.now().toString(),
        nombre: nombreProyecto,
        sheetsId,
        slidesId,
        fechaCreacion: new Date().toISOString(),
        ultimaModificacion: new Date().toISOString(),
        hojasTitulo: sheetsData.properties?.title,
        presentacionTitulo: slidesData.title
      }
      
      // Guardar en la lista de proyectos
      const proyectosGuardados = JSON.parse(localStorage.getItem("proyectos") || "[]")
      const proyectoExistente = proyectosGuardados.findIndex((p: any) => p.sheetsId === sheetsId && p.slidesId === slidesId)
      
      if (proyectoExistente >= 0) {
        proyectosGuardados[proyectoExistente] = {
          ...proyectosGuardados[proyectoExistente],
          ...proyectoInfo,
          ultimaModificacion: new Date().toISOString()
        }
      } else {
        proyectosGuardados.push(proyectoInfo)
      }
      
      localStorage.setItem("proyectos", JSON.stringify(proyectosGuardados))
      localStorage.setItem("proyectoActual", proyectoInfo.id)

      toast.success(`¡Proyecto "${nombreProyecto}" conectado exitosamente!\nHoja: ${sheetsData.properties?.title}\nPresentación: ${slidesData.title}`)
      
      // Esperar un momento antes de redirigir
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push("/presentaciones")
    } catch (error) {
      console.error("Error al conectar documentos:", error)
      const message = error instanceof Error ? error.message : "Error al conectar los documentos"
      toast.error(message)
      
      if (message.includes("autenticación")) {
        signIn("google")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  if (isInitializing || status === "loading") {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Conecta tus documentos</CardTitle>
        <CardDescription>
          {sheetsId && slidesId 
            ? "Documentos conectados. Puedes modificar los datos si necesitas cambiarlos."
            : "Ingresa los IDs de tus documentos de Google para comenzar a sincronizar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Conexión Manual</TabsTrigger>
            <TabsTrigger value="explorer">Explorador</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <form onSubmit={manejarConexion} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project-name">
                  Nombre del Proyecto
                </Label>
                <Input
                  id="project-name"
                  placeholder="Ej: Presentación Trimestral"
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">Asigna un nombre descriptivo a tu proyecto</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sheets-id">
                  <FileSpreadsheet className="mr-2 inline-block h-4 w-4" />
                  ID de Google Sheets
                </Label>
                <Input
                  id="sheets-id"
                  placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={sheetsId}
                  onChange={(e) => setSheetsId(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">Encuentra este ID en la URL de tu hoja de cálculo</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slides-id">
                  <FilePresentation className="mr-2 inline-block h-4 w-4" />
                  ID de Google Slides
                </Label>
                <Input
                  id="slides-id"
                  placeholder="Ej: 1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9z6m7w"
                  value={slidesId}
                  onChange={(e) => setSlidesId(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">Encuentra este ID en la URL de tu presentación</p>
              </div>

              <Button type="submit" className="w-full" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : sheetsId && slidesId ? (
                  "Actualizar conexión"
                ) : (
                  "Conectar documentos"
                )}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="explorer">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Explorador de Google Drive</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona tus documentos directamente desde tu Google Drive sin necesidad de copiar IDs.
              </p>
              <Button onClick={() => toast.info("Función en desarrollo")}>
                Abrir Explorador
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 