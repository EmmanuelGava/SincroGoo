"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/componentes/ui/button"
import { PresentationIcon, Loader2, Search, Filter, Plus } from "lucide-react"
import { EncabezadoSitio } from "@/componentes/EncabezadoSitio"
import { EncabezadoSistema } from "@/componentes/EncabezadoSistema"
import { Input } from "@/componentes/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/componentes/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ServicioGoogleSlides } from "@/servicios/google/googleSlides"
import { useRouter } from "next/navigation"

interface Presentacion {
  id: string
  nombre: string
  fechaModificacion?: string
  miniaturaUrl?: string
}

export default function PaginaPresentaciones() {
  const { data: session, status } = useSession()
  const [cargando, setCargando] = useState(true)
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      redirect("/auth/login")
    }
    
    const cargarPresentaciones = async () => {
      try {
        setCargando(true)
        setError(null)
        
        // Intentar cargar desde la API
        const servicio = await ServicioGoogleSlides.obtenerInstancia()
        
        if (servicio) {
          try {
            const resultado = await servicio.listarPresentaciones()
            if (resultado.exito && resultado.datos) {
              setPresentaciones(resultado.datos)
              setCargando(false)
              return
            }
          } catch (apiError) {
            console.error("Error al cargar desde API:", apiError)
            // Continuar con datos de ejemplo
          }
        }
        
        // Si no se pudo cargar desde la API, usar datos de ejemplo
        console.log("Usando datos de ejemplo para presentaciones")
        const presentacionesEjemplo: Presentacion[] = [
          {
            id: "1",
            nombre: "Presentación de Ventas Q3",
            fechaModificacion: "2023-10-15",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Presentación+de+Ventas"
          },
          {
            id: "2",
            nombre: "Informe Anual 2023",
            fechaModificacion: "2023-11-20",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Informe+Anual"
          },
          {
            id: "3",
            nombre: "Propuesta de Proyecto",
            fechaModificacion: "2023-12-05",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Propuesta+de+Proyecto"
          },
          {
            id: "4",
            nombre: "Capacitación de Personal",
            fechaModificacion: "2024-01-10",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Capacitación"
          }
        ]
        
        setPresentaciones(presentacionesEjemplo)
      } catch (err) {
        console.error("Error al cargar presentaciones:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setCargando(false)
      }
    }
    
    cargarPresentaciones()
  }, [status])

  const presentacionesFiltradas = presentaciones.filter(presentacion => 
    presentacion.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSistema />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Mis Presentaciones</h1>
          <Button 
            onClick={() => router.push('/presentaciones/nueva')} 
            className="bg-primary hover:bg-primary/90 text-white"
            size="lg"
            style={{
              borderRadius: '0.5rem',
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(101, 52, 172, 0.25)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Plus className="mr-2 h-5 w-5" /> Nueva Presentación
          </Button>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar presentaciones..."
              className="pl-10"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        
        {presentacionesFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentacionesFiltradas.map((presentacion) => (
              <Card key={presentacion.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {presentacion.miniaturaUrl ? (
                    <img
                      src={presentacion.miniaturaUrl}
                      alt={presentacion.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <PresentationIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{presentacion.nombre}</CardTitle>
                  {presentacion.fechaModificacion && (
                    <CardDescription>
                      Modificado: {new Date(presentacion.fechaModificacion).toLocaleDateString()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="pt-2">
                  <div className="flex justify-between w-full">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/presentaciones/${presentacion.id}`}>
                        Ver detalles
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/presentaciones/editar?id=${presentacion.id}`}>
                        Editar
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <PresentationIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No se encontraron presentaciones</h3>
            <p className="text-muted-foreground mt-1">
              {busqueda ? "Intenta con otra búsqueda o" : "Comienza"} conectando una presentación.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/presentaciones/conectar">
                <Plus className="mr-2 h-4 w-4" />
                Conectar Presentación
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
} 