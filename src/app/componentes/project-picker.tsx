"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, Tab, Tabs, TextField, Button } from "@mui/material"
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
    <>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => setIsOpen(true)}
        startIcon={<Plus className="w-4 h-4" />}
        sx={{ bgcolor: 'rgb(124 58 237)', '&:hover': { bgcolor: 'rgb(109 40 217)' } }}
      >
        Nuevo Proyecto
      </Button>

      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <div className="text-sm text-gray-500 mb-6">
            Selecciona una hoja de cálculo y una presentación para sincronizar
          </div>

          <div className="space-y-6">
            <TextField
              fullWidth
              label="Nombre del Proyecto"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Precios Q1 2024"
              size="small"
            />

            <div className="space-y-4">
              <Tabs 
                value={currentTab} 
                onChange={(_, value) => setCurrentTab(value)}
                variant="fullWidth"
              >
                <Tab 
                  value="sheets" 
                  label={
                    <div className="flex items-center">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Hojas de Cálculo
                    </div>
                  }
                />
                <Tab 
                  value="slides"
                  label={
                    <div className="flex items-center">
                      <PresentationIcon className="w-4 h-4 mr-2" />
                      Presentaciones
                    </div>
                  }
                />
              </Tabs>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-slate-500" />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`URL de ${currentTab === 'sheets' ? 'la hoja de cálculo' : 'la presentación'}`}
                    value={currentTab === 'sheets' ? sheetUrl : slideUrl}
                    onChange={(e) => {
                      if (currentTab === 'sheets') {
                        setSheetUrl(e.target.value)
                      } else {
                        setSlideUrl(e.target.value)
                      }
                    }}
                    onBlur={() => handleUrlChange(
                      currentTab === 'sheets' ? sheetUrl : slideUrl,
                      currentTab
                    )}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500" />
                  </div>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ pl: 4 }}
                  />
                </div>

                <div className="h-[200px] overflow-y-auto border rounded-lg p-2">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                    </div>
                  ) : filteredDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            (currentTab === 'sheets' ? selectedSheet?.id === doc.id : selectedSlide?.id === doc.id)
                              ? 'bg-violet-50 border-violet-200'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            if (currentTab === 'sheets') {
                              setSelectedSheet(doc)
                            } else {
                              setSelectedSlide(doc)
                            }
                          }}
                        >
                          <img src={doc.iconUrl} alt="" className="w-6 h-6" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-slate-500">
                              Modificado: {new Date(doc.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                      No se encontraron documentos
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outlined"
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!selectedSheet || !selectedSlide || !projectName.trim()}
              startIcon={<Save className="w-4 h-4" />}
            >
              Guardar Proyecto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 