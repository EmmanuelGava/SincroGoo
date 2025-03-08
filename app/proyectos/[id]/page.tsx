"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { EncabezadoSitio } from "@/components/EncabezadoSitio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Save, FileSpreadsheet, PresentationIcon, Trash2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

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

export default function EditarProyecto() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false)
  
  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      router.push("/auth/login")
      return
    }
    
    cargarProyecto()
  }, [status, id])
  
  const cargarProyecto = async () => {
    if (!id || !session?.user?.email) return
    
    try {
      setCargando(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', id)
        .eq('userid', session.user.email)
        .single()
      
      if (error) {
        console.error("Error al cargar el proyecto:", error)
        setError("No se pudo cargar el proyecto. Verifica que tengas acceso a este proyecto.")
        return
      }
      
      if (!data) {
        setError("No se encontró el proyecto solicitado.")
        return
      }
      
      setProyecto(data)
      setNombre(data.nombre)
      setDescripcion(data.descripcion || "")
      
    } catch (err) {
      console.error("Error al cargar el proyecto:", err)
      setError("Ocurrió un error al cargar el proyecto.")
    } finally {
      setCargando(false)
    }
  }
  
  const guardarCambios = async () => {
    if (!id || !session?.user?.email) return
    
    if (!nombre.trim()) {
      toast.error("El nombre del proyecto es obligatorio")
      return
    }
    
    try {
      setGuardando(true)
      setError(null)
      
      const fechaActual = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('proyectos')
        .update({
          nombre,
          descripcion,
          ultimamodificacion: fechaActual
        })
        .eq('id', id)
        .eq('userid', session.user.email)
        .select()
      
      if (error) {
        console.error("Error al actualizar el proyecto:", error)
        toast.error("No se pudo actualizar el proyecto.")
        return
      }
      
      toast.success("Proyecto actualizado correctamente")
      
      // Actualizar el proyecto en localStorage
      const proyectosGuardados = JSON.parse(localStorage.getItem('proyectos') || '[]')
      const proyectoIndex = proyectosGuardados.findIndex((p: Proyecto) => p.id === id)
      
      if (proyectoIndex !== -1) {
        proyectosGuardados[proyectoIndex] = {
          ...proyectosGuardados[proyectoIndex],
          nombre,
          descripcion,
          ultimamodificacion: fechaActual
        }
        localStorage.setItem('proyectos', JSON.stringify(proyectosGuardados))
      }
      
    } catch (err) {
      console.error("Error al guardar cambios:", err)
      toast.error("Ocurrió un error al guardar los cambios.")
    } finally {
      setGuardando(false)
    }
  }
  
  const eliminarProyecto = async () => {
    if (!id || !session?.user?.email) return
    
    try {
      setEliminando(true)
      
      const { error } = await supabase
        .from('proyectos')
        .delete()
        .eq('id', id)
        .eq('userid', session.user.email)
      
      if (error) {
        console.error("Error al eliminar el proyecto:", error)
        toast.error("No se pudo eliminar el proyecto.")
        return
      }
      
      // Eliminar el proyecto de localStorage
      const proyectosGuardados = JSON.parse(localStorage.getItem('proyectos') || '[]')
      const proyectosFiltrados = proyectosGuardados.filter((p: Proyecto) => p.id !== id)
      localStorage.setItem('proyectos', JSON.stringify(proyectosFiltrados))
      
      toast.success("Proyecto eliminado correctamente")
      router.push("/proyectos")
      
    } catch (err) {
      console.error("Error al eliminar el proyecto:", err)
      toast.error("Ocurrió un error al eliminar el proyecto.")
    } finally {
      setEliminando(false)
      setDialogoEliminarAbierto(false)
    }
  }
  
  if (cargando) {
    return (
      <div className="min-h-screen bg-background">
        <EncabezadoSitio />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="outline" asChild>
              <Link href="/proyectos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Proyectos
              </Link>
            </Button>
            <h1 className="ml-4 text-2xl font-bold">Editar Proyecto</h1>
          </div>
          
          <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
            <Link href={`/editor?proyectoId=${id}${proyecto?.slidesid ? `&presentacionId=${proyecto.slidesid}` : ''}${proyecto?.sheetsid ? `&hojaCalculoId=${proyecto.sheetsid}` : ''}`}>
              <LinkIcon className="mr-2 h-5 w-5" />
              Ir al Editor
            </Link>
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información del Proyecto</CardTitle>
                <CardDescription>
                  Edita los detalles básicos de tu proyecto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del proyecto</Label>
                  <Input
                    id="nombre"
                    placeholder="Nombre del proyecto"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describe brevemente el propósito de este proyecto"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => router.push("/proyectos")}>
                  Cancelar
                </Button>
                <Button onClick={guardarCambios} disabled={guardando}>
                  {guardando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Documentos Conectados</CardTitle>
                <CardDescription>
                  Documentos de Google vinculados a este proyecto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {proyecto?.presentaciontitulo ? (
                  <div className="flex items-center p-3 border rounded-md">
                    <PresentationIcon className="h-5 w-5 text-primary mr-3" />
                    <div>
                      <p className="font-medium text-sm">{proyecto.presentaciontitulo}</p>
                      <p className="text-xs text-muted-foreground">Google Slides</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border rounded-md bg-muted/50 text-muted-foreground text-sm">
                    No hay presentación conectada
                  </div>
                )}
                
                {proyecto?.hojastitulo ? (
                  <div className="flex items-center p-3 border rounded-md">
                    <FileSpreadsheet className="h-5 w-5 text-primary mr-3" />
                    <div>
                      <p className="font-medium text-sm">{proyecto.hojastitulo}</p>
                      <p className="text-xs text-muted-foreground">Google Sheets</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border rounded-md bg-muted/50 text-muted-foreground text-sm">
                    No hay hoja de cálculo conectada
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  asChild
                >
                  <Link href={`/proyectos/${id}/conectar`}>
                    Conectar documentos
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                <CardDescription>
                  Acciones irreversibles para este proyecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={dialogoEliminarAbierto} onOpenChange={setDialogoEliminarAbierto}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Proyecto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Estás seguro?</DialogTitle>
                      <DialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{nombre}" y todos sus datos asociados.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogoEliminarAbierto(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={eliminarProyecto}
                        disabled={eliminando}
                      >
                        {eliminando ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          "Sí, eliminar proyecto"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
} 