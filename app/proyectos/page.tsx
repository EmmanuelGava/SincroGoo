"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EncabezadoSitio } from "@/components/EncabezadoSitio"
import { Loader2, Plus, Search, FileSpreadsheet, PresentationIcon, Link as LinkIcon, Edit, Pencil } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Proyecto {
  id: string
  nombre: string
  descripcion: string
  fechacreacion: string
  sheetsid?: string
  slidesid?: string
  hojastitulo?: string
  presentaciontitulo?: string
  userid?: string
  ultimamodificacion?: string
}

export default function PaginaProyectos() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      redirect("/auth/login")
    }
    
    cargarProyectos()
  }, [status])

  const cargarProyectos = async () => {
    try {
      setCargando(true)
      setError(null)
      
      if (!session?.user?.email) {
        setError("No se ha iniciado sesión")
        return
      }
      
      // Cargar proyectos desde Supabase
      const { data: proyectosSupabase, error: errorSupabase } = await supabase
        .from('proyectos')
        .select('*')
        .eq('userid', session.user.email)
        .order('ultimamodificacion', { ascending: false })
      
      if (errorSupabase) {
        console.error("Error al cargar proyectos desde Supabase:", errorSupabase)
        setError("Error al cargar proyectos desde el servidor")
        toast.error("Error al cargar proyectos desde el servidor")
        return
      }
      
      if (proyectosSupabase) {
        console.log("Proyectos cargados desde Supabase:", proyectosSupabase)
        setProyectos(proyectosSupabase)
        
        // También actualizar el localStorage para mantener sincronización
        localStorage.setItem('proyectos', JSON.stringify(proyectosSupabase))
      } else {
        setProyectos([])
      }
    } catch (err) {
      console.error("Error al cargar proyectos:", err)
      setError("No se pudieron cargar los proyectos. Inténtalo de nuevo más tarde.")
      toast.error("Error al cargar proyectos")
    } finally {
      setCargando(false)
    }
  }

  const proyectosFiltrados = proyectos.filter(proyecto => 
    proyecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  const crearNuevoProyecto = () => {
    router.push("/proyectos/nuevo")
  }

  if (cargando && proyectos.length === 0) {
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
            <h1 className="text-3xl font-bold">Mis Proyectos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus proyectos de sincronización entre Google Slides y Google Sheets
            </p>
          </div>
          
          <Button onClick={crearNuevoProyecto}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
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
              placeholder="Buscar proyectos..."
              className="pl-10"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue="todos">
          <TabsList className="mb-6">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="presentaciones">Con Presentaciones</TabsTrigger>
            <TabsTrigger value="hojas">Con Hojas de Cálculo</TabsTrigger>
            <TabsTrigger value="completos">Completos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="todos" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proyectosFiltrados.length > 0 ? (
                proyectosFiltrados.map((proyecto) => (
                  <Card key={proyecto.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle>{proyecto.nombre}</CardTitle>
                      <CardDescription>
                        Creado el {new Date(proyecto.fechacreacion).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {proyecto.descripcion}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.presentaciontitulo && (
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <PresentationIcon className="h-3 w-3 mr-1" />
                            Presentación conectada
                          </div>
                        )}
                        {proyecto.hojastitulo && (
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <FileSpreadsheet className="h-3 w-3 mr-1" />
                            Hoja de cálculo conectada
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 border-t pt-4">
                      <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
                        <Link href={`/editor?proyectoId=${proyecto.id}${proyecto.slidesid ? `&presentacionId=${proyecto.slidesid}` : ''}${proyecto.sheetsid ? `&hojaCalculoId=${proyecto.sheetsid}` : ''}`}>
                          <LinkIcon className="h-5 w-5 mr-2" />
                          Ir al Editor
                        </Link>
                      </Button>
                      <div className="flex w-full gap-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/proyectos/${proyecto.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/proyectos/${proyecto.id}/conectar`}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Conectar Documentos
                          </Link>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No se encontraron proyectos</h3>
                  <p className="text-muted-foreground mt-1">
                    {busqueda ? "Intenta con otra búsqueda o" : "Comienza"} creando un nuevo proyecto.
                  </p>
                  <Button className="mt-4" onClick={crearNuevoProyecto}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proyecto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="presentaciones" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proyectosFiltrados.filter(p => p.presentaciontitulo).length > 0 ? (
                proyectosFiltrados
                  .filter(p => p.presentaciontitulo)
                  .map((proyecto) => (
                    <Card key={proyecto.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle>{proyecto.nombre}</CardTitle>
                        <CardDescription>
                          Creado el {new Date(proyecto.fechacreacion).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {proyecto.descripcion}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <PresentationIcon className="h-3 w-3 mr-1" />
                            Presentación conectada
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-3 border-t pt-4">
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
                          <Link href={`/editor?proyectoId=${proyecto.id}${proyecto.slidesid ? `&presentacionId=${proyecto.slidesid}` : ''}${proyecto.sheetsid ? `&hojaCalculoId=${proyecto.sheetsid}` : ''}`}>
                            <LinkIcon className="h-5 w-5 mr-2" />
                            Ir al Editor
                          </Link>
                        </Button>
                        <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}/conectar`}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Conectar Documentos
                            </Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <PresentationIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No hay proyectos con presentaciones</h3>
                  <p className="text-muted-foreground mt-1">
                    Conecta una presentación a un proyecto existente o crea uno nuevo.
                  </p>
                  <Button className="mt-4" onClick={crearNuevoProyecto}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proyecto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="hojas" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proyectosFiltrados.filter(p => p.hojastitulo).length > 0 ? (
                proyectosFiltrados
                  .filter(p => p.hojastitulo)
                  .map((proyecto) => (
                    <Card key={proyecto.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle>{proyecto.nombre}</CardTitle>
                        <CardDescription>
                          Creado el {new Date(proyecto.fechacreacion).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {proyecto.descripcion}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <FileSpreadsheet className="h-3 w-3 mr-1" />
                            Hoja de cálculo conectada
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-3 border-t pt-4">
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
                          <Link href={`/editor?proyectoId=${proyecto.id}${proyecto.slidesid ? `&presentacionId=${proyecto.slidesid}` : ''}${proyecto.sheetsid ? `&hojaCalculoId=${proyecto.sheetsid}` : ''}`}>
                            <LinkIcon className="h-5 w-5 mr-2" />
                            Ir al Editor
                          </Link>
                        </Button>
                        <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}/conectar`}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Conectar Documentos
                            </Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No hay proyectos con hojas de cálculo</h3>
                  <p className="text-muted-foreground mt-1">
                    Conecta una hoja de cálculo a un proyecto existente o crea uno nuevo.
                  </p>
                  <Button className="mt-4" onClick={crearNuevoProyecto}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proyecto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completos" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proyectosFiltrados.filter(p => p.presentaciontitulo && p.hojastitulo).length > 0 ? (
                proyectosFiltrados
                  .filter(p => p.presentaciontitulo && p.hojastitulo)
                  .map((proyecto) => (
                    <Card key={proyecto.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle>{proyecto.nombre}</CardTitle>
                        <CardDescription>
                          Creado el {new Date(proyecto.fechacreacion).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {proyecto.descripcion}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <PresentationIcon className="h-3 w-3 mr-1" />
                            Presentación conectada
                          </div>
                          <div className="flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                            <FileSpreadsheet className="h-3 w-3 mr-1" />
                            Hoja de cálculo conectada
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-3 border-t pt-4">
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
                          <Link href={`/editor?proyectoId=${proyecto.id}${proyecto.slidesid ? `&presentacionId=${proyecto.slidesid}` : ''}${proyecto.sheetsid ? `&hojaCalculoId=${proyecto.sheetsid}` : ''}`}>
                            <LinkIcon className="h-5 w-5 mr-2" />
                            Ir al Editor
                          </Link>
                        </Button>
                        <div className="flex w-full gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/proyectos/${proyecto.id}/conectar`}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Conectar Documentos
                            </Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <LinkIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No hay proyectos completos</h3>
                  <p className="text-muted-foreground mt-1">
                    Los proyectos completos tienen tanto una presentación como una hoja de cálculo conectadas.
                  </p>
                  <Button className="mt-4" onClick={crearNuevoProyecto}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proyecto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 