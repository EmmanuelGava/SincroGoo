"use client"

import { useState } from "react"
import { Button } from "@/componentes/ui/button"
import { FileSpreadsheet, PresentationIcon, X, Search, Check, Link as LinkIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/componentes/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs"

interface Document {
  id: string
  name: string
  iconUrl: string
  lastModified: string
}

interface DocumentPickerProps {
  type: "sheets" | "slides"
  onSelect: (doc: Document) => void
  selectedDoc?: Document
}

export function DocumentPicker({ type, onSelect, selectedDoc }: DocumentPickerProps) {
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState("")
  const [documents, setDocuments] = useState<Document[]>([
    // Documentos de ejemplo - esto vendría de la API de Google
    {
      id: "1",
      name: "Precios Q1 2024",
      iconUrl: "/sheets-icon.png",
      lastModified: "2024-03-20"
    },
    {
      id: "2",
      name: "Catálogo de Productos",
      iconUrl: "/sheets-icon.png",
      lastModified: "2024-03-19"
    },
    {
      id: "3",
      name: "Inventario Actualizado",
      iconUrl: "/sheets-icon.png",
      lastModified: "2024-03-18"
    }
  ])
  const [searchTerm, setSearchTerm] = useState("")

  const icon = type === "sheets" ? 
    <FileSpreadsheet className="w-5 h-5 text-green-600" /> : 
    <PresentationIcon className="w-5 h-5 text-violet-600" />

  const title = type === "sheets" ? "Google Sheets" : "Google Slides"

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUrlSubmit = () => {
    try {
      const url = new URL(urlInput)
      const pathParts = url.pathname.split('/')
      const docId = pathParts.find(part => part.length > 25)
      
      if (!docId) {
        setUrlError("No se pudo encontrar el ID del documento en la URL")
        return
      }

      // Crear un documento temporal con la información disponible
      const newDoc: Document = {
        id: docId,
        name: "Documento desde URL",
        iconUrl: type === "sheets" ? "/sheets-icon.png" : "/slides-icon.png",
        lastModified: new Date().toISOString().split('T')[0]
      }

      onSelect(newDoc)
      setOpen(false)
      setUrlInput("")
      setUrlError("")
    } catch (error) {
      setUrlError("URL inválida. Por favor, verifica el enlace")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{title}</h3>
        </div>
        <Button 
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
          onClick={() => setOpen(true)}
        >
          Seleccionar documento
        </Button>
      </div>

      {selectedDoc ? (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={selectedDoc.iconUrl} alt="" className="w-8 h-8" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedDoc.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">ID: {selectedDoc.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                onClick={() => window.location.href = `/edit?doc=${selectedDoc.id}`}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => onSelect({ ...selectedDoc, id: "" })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            No hay documento seleccionado
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              Seleccionar {title}
            </DialogTitle>
            <DialogDescription>
              Elige un documento de la lista o pega el enlace directamente
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Lista de documentos</TabsTrigger>
              <TabsTrigger value="url">Pegar enlace</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    className="w-full p-3 flex items-center justify-between rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      onSelect(doc)
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={doc.iconUrl} alt="" className="w-8 h-8" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Última modificación: {doc.lastModified}</p>
                      </div>
                    </div>
                    {selectedDoc?.id === doc.id && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={`Pega el enlace de ${title} aquí`}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value)
                      setUrlError("")
                    }}
                  />
                </div>
                {urlError && (
                  <p className="text-sm text-red-500">{urlError}</p>
                )}
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <p>Ejemplo de formato:</p>
                  <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    https://docs.google.com/{type === "sheets" ? "spreadsheets" : "presentation"}/d/tu-id-aqui/edit
                  </code>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Conectar documento
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 