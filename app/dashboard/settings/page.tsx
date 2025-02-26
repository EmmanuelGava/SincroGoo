"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { SlidesService } from "@/lib/slides-service"
import { SheetService } from "@/lib/sheet-service"
import { useSession } from "next-auth/react"

interface Project {
  id: string
  name: string
  sheetId: string
  sheetName: string
  slideId: string
  slideName: string
  lastModified: string
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [projectName, setProjectName] = useState("")
  const [sheetId, setSheetId] = useState("")
  const [slideId, setSlideId] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState({
    sheet: false,
    slides: false
  })

  useEffect(() => {
    const projectId = searchParams.get("project")
    const savedProject = localStorage.getItem("currentProject")
    
    if (!projectId || !savedProject) {
      router.push("/dashboard")
      return
    }

    const parsedProject = JSON.parse(savedProject)
    setProject(parsedProject)
    setProjectName(parsedProject.name)
    setSheetId(parsedProject.sheetId)
    setSlideId(parsedProject.slideId)
  }, [searchParams, router])

  const validateDocuments = async () => {
    setIsValidating(true)
    setValidationStatus({ sheet: false, slides: false })

    try {
      // Validar hoja de cálculo
      const sheetService = new SheetService()
      const sheetResult = await sheetService.verifyDocument(sheetId)
      if (!sheetResult.success) {
        toast.error("Error al validar la hoja de cálculo", {
          description: "Verifica que el ID sea correcto y tengas permisos de acceso"
        })
        return false
      }
      setValidationStatus(prev => ({ ...prev, sheet: true }))

      // Validar presentación
      if (!session?.accessToken) {
        toast.error("No hay sesión activa", {
          description: "Por favor, inicia sesión nuevamente"
        })
        return false
      }
      const slidesService = new SlidesService(session.accessToken)
      const slidesResult = await slidesService.verifyDocument(slideId)
      if (!slidesResult.success) {
        toast.error("Error al validar la presentación", {
          description: "Verifica que el ID sea correcto y tengas permisos de acceso"
        })
        return false
      }
      setValidationStatus(prev => ({ ...prev, slides: true }))

      return true
    } catch (error) {
      console.error("Error validando documentos:", error)
      toast.error("Error al validar los documentos", {
        description: "Verifica que la API de Google esté habilitada y tengas los permisos necesarios"
      })
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    if (!project) return

    if (!projectName.trim()) {
      toast.error("El nombre del proyecto es obligatorio")
      return
    }

    // Validar documentos antes de guardar
    const isValid = await validateDocuments()
    if (!isValid) return

    // Actualizar el proyecto en la lista de proyectos
    const savedProjects = localStorage.getItem("syncProjects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects)
      const updatedProjects = projects.map((p: Project) => 
        p.id === project.id ? { 
          ...p, 
          name: projectName,
          sheetId: sheetId,
          slideId: slideId,
          lastModified: new Date().toISOString()
        } : p
      )
      localStorage.setItem("syncProjects", JSON.stringify(updatedProjects))
      
      // Actualizar el proyecto actual
      localStorage.setItem("currentProject", JSON.stringify({
        ...project,
        name: projectName,
        sheetId: sheetId,
        slideId: slideId,
        lastModified: new Date().toISOString()
      }))

      // Actualizar las conexiones
      localStorage.setItem("connectedSheet", sheetId)
      localStorage.setItem("connectedSlides", slideId)
    }

    toast.success("Configuración guardada correctamente")
    router.push("/dashboard")
  }

  const handleDelete = () => {
    if (!project) return

    const savedProjects = localStorage.getItem("syncProjects")
    if (savedProjects) {
      const projects = JSON.parse(savedProjects)
      const updatedProjects = projects.filter((p: Project) => p.id !== project.id)
      localStorage.setItem("syncProjects", JSON.stringify(updatedProjects))
      
      // Limpiar el proyecto actual si es el que estamos eliminando
      const currentProject = localStorage.getItem("currentProject")
      if (currentProject) {
        const parsedCurrent = JSON.parse(currentProject)
        if (parsedCurrent.id === project.id) {
          localStorage.removeItem("currentProject")
          localStorage.removeItem("connectedSheet")
          localStorage.removeItem("connectedSlides")
        }
      }
    }

    toast.success("Proyecto eliminado correctamente")
    router.push("/dashboard")
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-24 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="hover:bg-violet-100 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Configuración del Proyecto
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Modifica los ajustes de tu proyecto
              </p>
            </div>
          </div>
        </div>

        {/* Configuración */}
        <Card className="bg-white/95 dark:bg-slate-900/95 border border-violet-200 dark:border-violet-900/30 shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Nombre del Proyecto</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="max-w-md"
                  placeholder="Mi Proyecto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sheetId">ID de la Hoja de Cálculo</Label>
                <div className="flex gap-2 max-w-md">
                  <Input
                    id="sheetId"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="ID de Google Sheets"
                    className={validationStatus.sheet ? "border-green-500" : ""}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank')}
                    disabled={!sheetId}
                  >
                    Abrir
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  El ID se encuentra en la URL de tu hoja de cálculo: docs.google.com/spreadsheets/d/<span className="font-mono">ID</span>/...
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slideId">ID de la Presentación</Label>
                <div className="flex gap-2 max-w-md">
                  <Input
                    id="slideId"
                    value={slideId}
                    onChange={(e) => setSlideId(e.target.value)}
                    placeholder="ID de Google Slides"
                    className={validationStatus.slides ? "border-green-500" : ""}
                  />
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`https://docs.google.com/presentation/d/${slideId}`, '_blank')}
                    disabled={!slideId}
                  >
                    Abrir
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  El ID se encuentra en la URL de tu presentación: docs.google.com/presentation/d/<span className="font-mono">ID</span>/...
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar Proyecto
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isValidating}
                  className="min-w-[120px]"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 