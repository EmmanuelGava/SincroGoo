"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2, Search, Plus } from "lucide-react"
import { EncabezadoSitio } from "@/components/EncabezadoSitio"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ServicioGoogleSheets } from "@/servicios/googleSheets"

interface HojaCalculo {
  id: string
  nombre: string
  fechaModificacion?: string
  miniaturaUrl?: string
}

export default function PaginaHojasCalculo() {
  const { data: session, status } = useSession()
  const [cargando, setCargando] = useState(true)
  const [hojasCalculo, setHojasCalculo] = useState<HojaCalculo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      redirect("/auth/login")
    }
    
    const cargarHojasCalculo = async () => {
      try {
        setCargando(true)
        setError(null)
        
        // Intentar cargar desde la API
        const servicio = await ServicioGoogleSheets.obtenerInstancia()
        
        if (servicio) {
          try {
            const resultado = await servicio.listarHojasCalculo()
            if (resultado.exito && resultado.datos) {
              const hojasFormateadas = resultado.datos.map(hoja => ({
                id: hoja.id,
                nombre: hoja.nombre
              }))
              setHojasCalculo(hojasFormateadas)
              setCargando(false)
              return
            }
          } catch (apiError) {
            console.error("Error al cargar desde API:", apiError)
            // Continuar con datos de ejemplo
          }
        }
        
        // Si no se pudo cargar desde la API, usar datos de ejemplo
        console.log("Usando datos de ejemplo para hojas de cálculo")
        const hojasEjemplo: HojaCalculo[] = [
          {
            id: "1",
            nombre: "Datos de Ventas 2023",
            fechaModificacion: "2023-10-15",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Datos+de+Ventas"
          },
          {
            id: "2",
            nombre: "Presupuesto Anual",
            fechaModificacion: "2023-11-20",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Presupuesto"
          },
          {
            id: "3",
            nombre: "Inventario de Productos",
            fechaModificacion: "2023-12-05",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Inventario"
          },
          {
            id: "4",
            nombre: "Registro de Clientes",
            fechaModificacion: "2024-01-10",
            miniaturaUrl: "https://via.placeholder.com/400x225?text=Clientes"
          }
        ]
        
        setHojasCalculo(hojasEjemplo)
      } catch (err) {
        console.error("Error al cargar hojas de cálculo:", err)
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setCargando(false)
      }
    }
    
    cargarHojasCalculo()
  }, [status])

  const hojasFiltradas = hojasCalculo.filter(hoja => 
    hoja.nombre.toLowerCase().includes(busqueda.toLowerCase())
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
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mis Hojas de Cálculo</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y utiliza tus hojas de cálculo de Google Sheets
            </p>
          </div>
          
          <Button asChild>
            <Link href="/hojas-de-calculo/conectar">
              <Plus className="mr-2 h-4 w-4" />
              Conectar Hoja de Cálculo
            </Link>
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
              placeholder="Buscar hojas de cálculo..."
              className="pl-10"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        
        {hojasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hojasFiltradas.map((hoja) => (
              <Card key={hoja.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {hoja.miniaturaUrl ? (
                    <img
                      src={hoja.miniaturaUrl}
                      alt={hoja.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{hoja.nombre}</CardTitle>
                  {hoja.fechaModificacion && (
                    <CardDescription>
                      Modificado: {new Date(hoja.fechaModificacion).toLocaleDateString()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="pt-2">
                  <div className="flex justify-between w-full">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/hojas-de-calculo/${hoja.id}`}>
                        Ver detalles
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/hojas-de-calculo/ver?id=${hoja.id}`}>
                        Ver datos
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
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No se encontraron hojas de cálculo</h3>
            <p className="text-muted-foreground mt-1">
              {busqueda ? "Intenta con otra búsqueda o" : "Comienza"} conectando una hoja de cálculo.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/hojas-de-calculo/conectar">
                <Plus className="mr-2 h-4 w-4" />
                Conectar Hoja de Cálculo
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
} 