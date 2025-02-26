"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileSpreadsheet, PresentationIcon, Search, Plus, Save, Link as LinkIcon, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface Document {
  id: string
  name: string
  iconUrl: string
  lastModified: string
  type: 'sheets' | 'slides'
}

interface Project {
  id: string
  name: string
  sheetId: string
  sheetName: string
  slideId: string
  slideName: string
  lastModified: string
}

interface ProjectPickerProps {
  onSave: (project: Project) => void
  savedProjects?: Project[]
}

export function ProjectPicker({ onSave, savedProjects = [] }: ProjectPickerProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedSheet, setSelectedSheet] = useState<Document | null>(null)
  const [selectedSlide, setSelectedSlide] = useState<Document | null>(null)
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [slideUrl, setSlideUrl] = useState("")
  const [currentTab, setCurrentTab] = useState<'sheets' | 'slides'>('sheets')

  useEffect(() => {
    if (isOpen && session?.accessToken) {
      fetchDocuments(currentTab)
    }
  }, [isOpen, session?.accessToken, currentTab])

  const fetchDocuments = async (type: 'sheets' | 'slides') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/google/documents?type=${type}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      })
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      toast.error("Error al cargar los documentos")
    }
    setLoading(false)
  }

  const extractIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      const id = urlObj.pathname.split('/').pop() || urlObj.searchParams.get('id')
      return id || null
    } catch {
      return null
    }
  }

  const handleUrlChange = async (url: string, type: 'sheets' | 'slides') => {
    const id = extractIdFromUrl(url)
    if (!id) {
      toast.error("URL inválida")
      return
    }

    try {
      const response = await fetch(`/api/google/document?id=${id}&type=${type}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      })
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      const doc: Document = {
        id: data.id,
        name: data.name,
        iconUrl: data.iconUrl,
        lastModified: data.modifiedTime,
        type
      }

      if (type === 'sheets') {
        setSelectedSheet(doc)
        setSheetUrl(url)
      } else {
        setSelectedSlide(doc)
        setSlideUrl(url)
      }
    } catch (error) {
      toast.error("Error al verificar el documento")
    }
  }

  const handleSave = () => {
    if (!selectedSheet || !selectedSlide || !projectName.trim()) {
      toast.error("Por favor selecciona ambos documentos y un nombre para el proyecto")
      return
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: projectName,
      sheetId: selectedSheet.id,
      sheetName: selectedSheet.name,
      slideId: selectedSlide.id,
      slideName: selectedSlide.name,
      lastModified: new Date().toISOString()
    }

    onSave(newProject)
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setSelectedSheet(null)
    setSelectedSlide(null)
    setProjectName("")
    setSearchTerm("")
    setSheetUrl("")
    setSlideUrl("")
  }

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white transition-colors gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
          <DialogDescription>
            Selecciona una hoja de cálculo y una presentación para sincronizar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="projectName">Nombre del Proyecto</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Precios Q1 2024"
              className="mt-2"
            />
          </div>

          <div className="space-y-4">
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'sheets' | 'slides')}>
              <TabsList className="w-full">
                <TabsTrigger value="sheets" className="w-full">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Hojas de Cálculo
                </TabsTrigger>
                <TabsTrigger value="slides" className="w-full">
                  <PresentationIcon className="w-4 h-4 mr-2" />
                  Presentaciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sheets">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Pega el enlace de la hoja de cálculo..."
                      value={sheetUrl}
                      onChange={(e) => {
                        setSheetUrl(e.target.value)
                        handleUrlChange(e.target.value, 'sheets')
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="O busca en tus documentos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                      </div>
                    ) : (
                      filteredDocuments
                        .filter(doc => doc.type === 'sheets')
                        .map(doc => (
                          <div
                            key={doc.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedSheet?.id === doc.id
                                ? "bg-violet-100 dark:bg-violet-900/30"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            onClick={() => setSelectedSheet(doc)}
                          >
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{doc.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Modificado: {new Date(doc.lastModified).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="slides">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Pega el enlace de la presentación..."
                      value={slideUrl}
                      onChange={(e) => {
                        setSlideUrl(e.target.value)
                        handleUrlChange(e.target.value, 'slides')
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="O busca en tus documentos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                      </div>
                    ) : (
                      filteredDocuments
                        .filter(doc => doc.type === 'slides')
                        .map(doc => (
                          <div
                            key={doc.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedSlide?.id === doc.id
                                ? "bg-violet-100 dark:bg-violet-900/30"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            onClick={() => setSelectedSlide(doc)}
                          >
                            <div className="flex items-center gap-3">
                              <PresentationIcon className="w-4 h-4 text-violet-500" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{doc.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Modificado: {new Date(doc.lastModified).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!selectedSheet || !selectedSlide || !projectName.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Proyecto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 