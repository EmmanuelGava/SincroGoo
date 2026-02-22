"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/componentes/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card"
import { Input } from "@/componentes/ui/input"
import { Label } from "@/componentes/ui/label"
import { toast } from "sonner"
import { FileSpreadsheet, FileIcon as FilePresentation, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function ConnectDocuments() {
  const [sheetsId, setSheetsId] = useState("")
  const [slidesId, setSlidesId] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
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
        console.error("Error checking session:", error)
        setIsInitializing(false)
      }
    }

    checkSession()
  }, [session, status, router])

  // Cargar IDs guardados al iniciar
  useEffect(() => {
    if (status === "authenticated" && !isInitializing) {
      const savedSheetsId = localStorage.getItem("connectedSheets")
      const savedSlidesId = localStorage.getItem("connectedSlides")
      
      if (savedSheetsId) setSheetsId(savedSheetsId)
      if (savedSlidesId) setSlidesId(savedSlidesId)
    }
  }, [status, isInitializing])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sheetsId || !slidesId) {
      toast.error("Por favor ingresa los IDs de ambos documentos")
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
      sessionStorage.setItem("connectedSheets", sheetsId)
      sessionStorage.setItem("connectedSlides", slidesId)

      toast.success(`¡Documentos conectados exitosamente!\nHoja: ${sheetsData.properties?.title}\nPresentación: ${slidesData.title}`)
      
      // Esperar un momento antes de redirigir
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push("/dashboard")
    } catch (error) {
      console.error("Error connecting documents:", error)
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
            ? "Documentos conectados. Puedes modificar los IDs si necesitas cambiarlos."
            : "Ingresa los IDs de tus documentos de Google para comenzar a sincronizar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect} className="space-y-6">
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
      </CardContent>
    </Card>
  )
}

