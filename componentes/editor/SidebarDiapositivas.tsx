"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { PanelRight, X, ChevronRight, ChevronLeft, Edit } from "lucide-react"
import { Diapositiva, ElementoDiapositiva } from "@/tipos/diapositivas"

interface SidebarDiapositivasProps {
  diapositivas: Diapositiva[]
  diapositivaSeleccionada: Diapositiva | null
  elementoSeleccionado: ElementoDiapositiva | null
  cargando: boolean
  abierto: boolean
  onToggle: () => void
  onSeleccionarDiapositiva: (diapositiva: Diapositiva) => void
  onSeleccionarElemento: (elemento: ElementoDiapositiva) => void
}

export function SidebarDiapositivas({
  diapositivas,
  diapositivaSeleccionada,
  elementoSeleccionado,
  cargando,
  abierto,
  onToggle,
  onSeleccionarDiapositiva,
  onSeleccionarElemento
}: SidebarDiapositivasProps) {
  const [tabActiva, setTabActiva] = useState<"diapositivas" | "elementos">("diapositivas")
  
  return (
    <div className={`fixed right-0 top-16 bottom-0 z-30 flex transition-all duration-300 ${
      abierto ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Botón para abrir/cerrar el sidebar */}
      <Button
        variant="outline"
        size="icon"
        className="absolute -left-10 top-4 rounded-l-md rounded-r-none border-r-0 h-10"
        onClick={onToggle}
      >
        {abierto ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
      
      {/* Contenido del sidebar */}
      <div className="w-80 bg-background border-l border-border h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Panel de Diapositivas</h2>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="diapositivas">Diapositivas</TabsTrigger>
            <TabsTrigger 
              value="elementos" 
              disabled={!diapositivaSeleccionada}
            >
              Elementos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="diapositivas" className="flex-1 p-4 pt-2">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="grid grid-cols-2 gap-2">
                {cargando ? (
                  // Skeletons durante la carga
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-24 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                    </div>
                  ))
                ) : diapositivas.length > 0 ? (
                  // Miniaturas de diapositivas
                  diapositivas.map((diapositiva) => (
                    <div 
                      key={diapositiva.id}
                      className={`cursor-pointer rounded-md border p-1 transition-colors ${
                        diapositivaSeleccionada?.id === diapositiva.id 
                          ? 'border-primary bg-primary/10' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => onSeleccionarDiapositiva(diapositiva)}
                    >
                      <div className="relative aspect-video overflow-hidden rounded-sm bg-muted">
                        <img 
                          src={diapositiva.urlImagen} 
                          alt={diapositiva.titulo}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-slide.png'
                          }}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs">
                        {diapositiva.titulo || `Diapositiva ${diapositiva.indice + 1}`}
                      </p>
                    </div>
                  ))
                ) : (
                  // Mensaje cuando no hay diapositivas
                  <div className="col-span-2 flex h-24 items-center justify-center text-center text-muted-foreground">
                    No hay diapositivas disponibles
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="elementos" className="flex-1 p-4 pt-2">
            {diapositivaSeleccionada ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <img 
                    src={diapositivaSeleccionada.urlImagen} 
                    alt={diapositivaSeleccionada.titulo}
                    className="h-16 w-24 object-cover rounded-sm border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-slide.png'
                    }}
                  />
                  <div>
                    <h3 className="font-medium text-sm">
                      {diapositivaSeleccionada.titulo || `Diapositiva ${diapositivaSeleccionada.indice + 1}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {diapositivaSeleccionada.elementos?.length || 0} elementos editables
                    </p>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="space-y-2">
                    {diapositivaSeleccionada.elementos?.length ? (
                      diapositivaSeleccionada.elementos.map((elemento) => (
                        <div 
                          key={elemento.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                            elementoSeleccionado?.id === elemento.id 
                              ? 'bg-primary/10' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => onSeleccionarElemento(elemento)}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {elemento.tipo}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {elemento.contenido.substring(0, 50)}
                              {elemento.contenido.length > 50 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No hay elementos editables en esta diapositiva
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                Selecciona una diapositiva para ver sus elementos
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 