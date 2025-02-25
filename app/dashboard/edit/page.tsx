"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import type { SessionContextValue } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCcw, Pencil, Check, X, Link, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PreviewModal } from "@/components/ui/preview-modal"
import type { PreviewChange } from "@/types/preview"

interface TextElement {
  slideIndex: number
  content: string
  elementId: string
  type: string
  position?: {
    x: number
    y: number
  }
  context?: {
    before: string
    after: string
  }
}

interface PriceUpdate {
  sheetCell: string
  oldPrice: string
  newPrice: string
  slideLocation: string
  selectedElementId?: string
  isEditing?: boolean
}

export default function EditPage() {
  const router = useRouter()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace("/")
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([])
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [previewChanges, setPreviewChanges] = useState<PreviewChange[]>([])

  // Función para cargar los IDs de los documentos
  const loadDocumentIds = useCallback(() => {
    try {
      const sheetsId = localStorage.getItem("connectedSheets")
      const slidesId = localStorage.getItem("connectedSlides")
      
      if (!sheetsId || !slidesId) {
        console.log("No se encontraron IDs guardados")
        return null
      }

      console.log("IDs cargados:", { sheetsId, slidesId })
      sessionStorage.setItem("connectedSheets", sheetsId)
      sessionStorage.setItem("connectedSlides", slidesId)
      return { sheetsId, slidesId }
    } catch (error) {
      console.error("Error cargando IDs:", error)
      return null
    }
  }, [])

  // Inicialización y verificación de sesión
  useEffect(() => {
    let isMounted = true

    const initializeComponent = async () => {
      try {
        console.log("Estado de sesión:", status)
        console.log("Datos de sesión:", session)

        // Si está cargando o el componente está desmontado, salimos
        if (!isMounted) return

        // Si la sesión está cargando, mantenemos el estado de carga
        if (status === "loading") {
          setIsLoading(true)
          return
        }

        // Si no hay sesión o token, redirigimos
        if (!session?.accessToken) {
          router.replace("/")
          return
        }

        // Intentamos cargar los documentos
        const docs = loadDocumentIds()
        if (!docs) {
          router.replace("/dashboard")
          return
        }

        // Cargamos los datos solo si no se han inicializado
        if (!isInitialized) {
          await loadPriceUpdates()
          if (isMounted) {
            setIsInitialized(true)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error("Error en inicialización:", error)
        if (isMounted) {
          setError("Error al inicializar la página")
          setIsLoading(false)
        }
      }
    }

    initializeComponent()

    return () => {
      isMounted = false
    }
  }, [status, session, router, loadDocumentIds, isInitialized])

  const loadPriceUpdates = async () => {
    if (!session?.accessToken) {
      console.log("No hay token de acceso disponible")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sheetsId = sessionStorage.getItem("connectedSheets")
      const slidesId = sessionStorage.getItem("connectedSlides")

      if (!sheetsId || !slidesId) {
        console.log("No se encontraron IDs en sessionStorage")
        router.replace("/dashboard")
        return
      }

      console.log("Cargando datos con:", { sheetsId, slidesId })

      const [sheetsResponse, slidesResponse] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/A1:Z100`, {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`https://slides.googleapis.com/v1/presentations/${slidesId}`, {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!sheetsResponse.ok || !slidesResponse.ok) {
        const [sheetsError, slidesError] = await Promise.all([
          sheetsResponse.json().catch(() => ({})),
          slidesResponse.json().catch(() => ({}))
        ])

        console.error("Error responses:", { sheetsError, slidesError })

        if (sheetsResponse.status === 401 || slidesResponse.status === 401) {
          throw new Error("Error de autenticación. Por favor, inicia sesión nuevamente.")
        }

        throw new Error("Error al obtener datos de Google")
      }

      const [sheetsData, slidesData] = await Promise.all([
        sheetsResponse.json(),
        slidesResponse.json()
      ])

      // Extraer todos los elementos de texto de las diapositivas
      const elements: TextElement[] = []
      slidesData.slides.forEach((slide: any, slideIndex: number) => {
        if (slide.pageElements) {
          slide.pageElements.forEach((element: any) => {
            if (element.shape?.text?.textElements) {
              // Obtener todos los fragmentos de texto
              const textFragments = element.shape.text.textElements
                .map((te: any) => te.textRun?.content || '')
                .filter(Boolean)

              const fullText = textFragments.join('').trim()
              
              if (fullText) {
                // Encontrar el índice del precio en el texto completo
                const priceMatch = fullText.match(/\$?\d+([.,]\d{1,2})?\$?/)
                if (priceMatch) {
                  const priceIndex = priceMatch.index
                  const price = priceMatch[0]
                  
                  // Obtener contexto (hasta 20 caracteres antes y después del precio)
                  const before = fullText.slice(Math.max(0, priceIndex - 20), priceIndex).trim()
                  const after = fullText.slice(priceIndex + price.length, priceIndex + price.length + 20).trim()

                  elements.push({
                    slideIndex: slideIndex + 1,
                    content: fullText,
                    elementId: element.objectId,
                    type: element.shape.shapeType || 'TEXT_BOX',
                    position: element.transform ? {
                      x: element.transform.translateX || 0,
                      y: element.transform.translateY || 0
                    } : undefined,
                    context: {
                      before,
                      after
                    }
                  })
                }
              }
            }
          })
        }
      })
      setTextElements(elements)
      
      const updates = processData(sheetsData, slidesData)
      setPriceUpdates(updates)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar los precios"
      setError(message)
      toast.error(message)
      
      if (message.includes("autenticación")) {
        router.replace("/")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Agregar función helper para describir la posición
  const getPositionDescription = (x: number, y: number, slideWidth = 720, slideHeight = 405) => {
    let horizontal = ''
    let vertical = ''

    // División en tercios para más precisión
    if (x < slideWidth / 3) horizontal = 'izquierda'
    else if (x < (slideWidth * 2) / 3) horizontal = 'centro'
    else horizontal = 'derecha'

    if (y < slideHeight / 3) vertical = 'arriba'
    else if (y < (slideHeight * 2) / 3) vertical = 'medio'
    else vertical = 'abajo'

    return `${vertical} ${horizontal}`
  }

  // Modificar la extracción de elementos y la asociación automática
  const processData = (sheetsData: any, slidesData: any): PriceUpdate[] => {
    try {
      const updates: PriceUpdate[] = []
      
      if (!sheetsData.values) {
        return updates
      }

      // Procesar datos de Sheets
      sheetsData.values.forEach((row: any[], rowIndex: number) => {
        row.forEach((cell: any, colIndex: number) => {
          const cellValue = String(cell || '').trim()
          
          const pricePatterns = [
            /^\$\s*\d+(?:[.,]\d{1,2})?$/, // $123 o $123.45
            /^\d+(?:[.,]\d{1,2})?\s*\$$/, // 123$ o 123.45$
            /^\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/ // $1,234.56
          ]

          if (pricePatterns.some(pattern => pattern.test(cellValue))) {
            const normalizedPrice = cellValue.replace(/\s+/g, '')
            const normalizedPriceForComparison = normalizedPrice.replace(/[.,\s]/g, '')
            
            // Buscar coincidencia en las diapositivas
            let matchedElementId: string | undefined
            let matchedSlideIndex: number | undefined

            if (slidesData.slides) {
              slidesLoop:
              for (const [slideIndex, slide] of slidesData.slides.entries()) {
                if (slide.pageElements) {
                  for (const element of slide.pageElements) {
                    if (element.shape?.text?.textElements) {
                      const content = element.shape.text.textElements
                        .map((te: any) => te.textRun?.content || '')
                        .join('')
                        .trim()
                      const normalizedContent = content.replace(/[.,\s]/g, '')
                      
                      if (normalizedContent.includes(normalizedPriceForComparison)) {
                        matchedElementId = element.objectId
                        matchedSlideIndex = slideIndex + 1
                        break slidesLoop
                      }
                    }
                  }
                }
              }
            }
            
            updates.push({
              sheetCell: `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`,
              oldPrice: normalizedPrice,
              newPrice: normalizedPrice,
              slideLocation: matchedSlideIndex ? `Diapositiva ${matchedSlideIndex}` : 'Buscando en diapositivas...',
              selectedElementId: matchedElementId
            })
          }
        })
      })

      return updates
    } catch (error) {
      console.error("Error procesando datos:", error)
      return []
    }
  }

  const handleLinkElement = (index: number, elementId: string) => {
    setPriceUpdates(current =>
      current.map((update, i) => {
        if (i === index) {
          const element = textElements.find(e => e.elementId === elementId)
          return {
            ...update,
            selectedElementId: elementId,
            slideLocation: element ? `Diapositiva ${element.slideIndex}` : update.slideLocation
          }
        }
        return update
      })
    )
  }

  const handleSync = async () => {
    if (!session?.accessToken) {
      toast.error("No hay sesión activa")
      return
    }

    setIsSyncing(true)
    setError(null)
    try {
      const slidesId = sessionStorage.getItem("connectedSlides")
      const sheetsId = sessionStorage.getItem("connectedSheets")

      if (!slidesId || !sheetsId) {
        throw new Error("No se encontró la información necesaria")
      }

      // Validar que haya elementos seleccionados para actualizar
      const elementsToUpdate = priceUpdates.filter(update => update.selectedElementId)
      if (elementsToUpdate.length === 0) {
        throw new Error("No hay elementos seleccionados para actualizar")
      }

      console.log("Iniciando sincronización:", {
        elementsToUpdate,
        sheetsId,
        slidesId
      })

      // Actualizar Google Sheets
      const sheetsUpdates = priceUpdates.map(update => ({
        range: update.sheetCell,
        values: [[update.newPrice]]
      }))

      console.log("Actualizando Sheets:", sheetsUpdates)

      const sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: sheetsUpdates
          }),
        }
      )

      if (!sheetsResponse.ok) {
        const errorData = await sheetsResponse.json()
        console.error("Error en Sheets:", errorData)
        throw new Error(`Error al actualizar la hoja de cálculo: ${errorData.error?.message || 'Error desconocido'}`)
      }

      // Actualizar Google Slides
      const slidesRequests = elementsToUpdate.map(update => {
        const element = textElements.find(e => e.elementId === update.selectedElementId)
        if (!element) return null

        return {
          replace_all_text: {
            replace_text: update.newPrice,
            contains_text: {
              text: update.oldPrice
            }
          }
        }
      }).filter(Boolean)

      const slidesPayload = {
        requests: slidesRequests
      }

      console.log("JSON a enviar a Slides:", JSON.stringify(slidesPayload, null, 2))

      const slidesResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${slidesId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slidesPayload)
      })

      if (!slidesResponse.ok) {
        const errorData = await slidesResponse.json()
        console.error("Error en Slides:", errorData)
        throw new Error(`Error al actualizar las diapositivas: ${errorData.error?.message || 'Error desconocido'}`)
      }

      const slidesResult = await slidesResponse.json()
      console.log("Resultado de la actualización:", slidesResult)

      toast.success("¡Cambios guardados correctamente!")
      await loadPriceUpdates() // Recargar los datos después de actualizar
    } catch (error) {
      console.error("Error en sincronización:", error)
      const message = error instanceof Error ? error.message : "Error al guardar los cambios"
      setError(message)
      toast.error(message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEdit = (index: number) => {
    setPriceUpdates(current =>
      current.map((update, i) => ({
        ...update,
        isEditing: i === index ? true : update.isEditing
      }))
    )
  }

  const handleSave = (index: number, field: 'sheetCell' | 'newPrice', value: string) => {
    setPriceUpdates(current =>
      current.map((update, i) => {
        if (i === index) {
          return {
            ...update,
            [field]: value,
            isEditing: false
          }
        }
        return update
      })
    )
  }

  const handleCancel = (index: number) => {
    setPriceUpdates(current =>
      current.map((update, i) => ({
        ...update,
        isEditing: i === index ? false : update.isEditing
      }))
    )
  }

  const generatePreview = async (update: PriceUpdate) => {
    setIsGeneratingPreview(true)
    setIsPreviewOpen(true)
    try {
      const slidesId = sessionStorage.getItem("connectedSlides")
      if (!slidesId || !session?.accessToken || !update.selectedElementId) {
        throw new Error("No se encontró la información necesaria")
      }

      // Obtener los elementos específicos de las diapositivas
      const response = await fetch(
        `https://slides.googleapis.com/v1/presentations/${slidesId}?fields=slides.pageElements(objectId,transform,shape)`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error("Error al obtener los elementos de las diapositivas")
      }

      const data = await response.json()
      
      const element = textElements.find(e => e.elementId === update.selectedElementId)
      const slideElement = data.slides?.find((s: any) => 
        s.pageElements?.some((el: any) => el.objectId === update.selectedElementId)
      )?.pageElements?.find((el: any) => el.objectId === update.selectedElementId)
      
      if (!element || !slideElement) {
        throw new Error("No se encontró el elemento en la diapositiva")
      }

      const previewChange: PreviewChange = {
        slideIndex: element.slideIndex,
        oldPrice: update.oldPrice,
        newPrice: update.newPrice,
        elementId: update.selectedElementId,
        position: slideElement.transform ? {
          x: slideElement.transform.translateX || 0,
          y: slideElement.transform.translateY || 0
        } : undefined,
        elementData: {
          width: slideElement.transform?.scaleX || 1,
          height: slideElement.transform?.scaleY || 1,
          rotation: slideElement.transform?.rotateAngle || 0,
          text: element.content,
          type: slideElement.shape?.shapeType || 'TEXT_BOX',
          style: slideElement.shape?.text?.textElements?.[0]?.textRun?.style || {}
        }
      }

      setPreviewChanges([previewChange])
    } catch (error) {
      console.error("Error generando vista previa:", error)
      toast.error(error instanceof Error ? error.message : "Error al generar la vista previa")
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // Mostrar loading mientras se verifica la sesión o se cargan los datos
  if (isLoading && !isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">
              {status === "loading" ? "Verificando sesión..." : "Cargando datos..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actualización de Precios</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadPriceUpdates()} disabled={isSyncing}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button onClick={handleSync} disabled={isSyncing || priceUpdates.length === 0}>
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar Cambios
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-center text-red-500 py-8">{error}</p>
          ) : priceUpdates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No se encontraron precios para actualizar</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Celda</TableHead>
                  <TableHead>Precio Actual</TableHead>
                  <TableHead>Nuevo Precio</TableHead>
                  <TableHead>Texto en Diapositiva</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceUpdates.map((update, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {update.isEditing ? (
                        <Input
                          defaultValue={update.sheetCell}
                          className="w-24"
                          onBlur={(e) => handleSave(index, 'sheetCell', e.target.value)}
                        />
                      ) : (
                        update.sheetCell
                      )}
                    </TableCell>
                    <TableCell>
                      {update.oldPrice}
                    </TableCell>
                    <TableCell>
                      {update.isEditing ? (
                        <Input
                          defaultValue={update.newPrice}
                          className="w-32"
                          onBlur={(e) => handleSave(index, 'newPrice', e.target.value)}
                        />
                      ) : (
                        <span className="font-medium text-primary">{update.newPrice}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={update.selectedElementId}
                        onValueChange={(value) => handleLinkElement(index, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar texto" />
                        </SelectTrigger>
                        <SelectContent>
                          {textElements.map((element, i) => (
                            <SelectItem key={i} value={element.elementId} className="flex flex-col gap-1">
                              <div>
                                Diapositiva {element.slideIndex}
                                {element.type !== 'TEXT_BOX' ? ` (${element.type})` : ''} 
                                {element.position && ` - ${getPositionDescription(element.position.x, element.position.y)}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {element.context?.before && <span className="opacity-70">{element.context.before}</span>}
                                <span className="font-bold mx-1">{element.content.match(/\$?\d+([.,]\d{1,2})?\$?/)?.[0]}</span>
                                {element.context?.after && <span className="opacity-70">{element.context.after}</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {update.isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSave(index, 'newPrice', update.newPrice)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {update.selectedElementId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generatePreview(update)}
                                disabled={isGeneratingPreview}
                              >
                                {isGeneratingPreview ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        changes={previewChanges}
        isLoading={isGeneratingPreview}
      />
    </div>
  )
}

