import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { PreviewChange } from "@/types/preview"

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  changes: PreviewChange[]
  isLoading: boolean
}

export function PreviewModal({ isOpen, onClose, changes, isLoading }: PreviewModalProps) {
  const getRgbaColor = (color?: { opaqueColor?: { rgbColor?: { red?: number, green?: number, blue?: number } } }) => {
    if (!color?.opaqueColor?.rgbColor) return 'currentColor'
    const { red = 0, green = 0, blue = 0 } = color.opaqueColor.rgbColor
    return `rgb(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)})`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Cambios</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generando vista previa...</span>
          </div>
        ) : changes.length > 0 ? (
          <div className="space-y-4">
            {changes.map((change, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-semibold">Diapositiva {change.slideIndex}</span>
                    <div className="text-sm text-muted-foreground">
                      <span>Tipo: {change.elementData.type}</span>
                    </div>
                  </div>
                  
                  {/* Contenedor de la vista previa */}
                  <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border bg-[#f0f0f0]">
                    {/* Cuadrícula de fondo */}
                    <div className="absolute inset-0" style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '40px 40px'
                    }} />
                    
                    {/* Elemento de texto */}
                    <div 
                      className="absolute"
                      style={{
                        left: `${(change.position?.x || 0) / 720 * 100}%`,
                        top: `${(change.position?.y || 0) / 405 * 100}%`,
                        transform: `
                          translate(-50%, -50%) 
                          rotate(${change.elementData.rotation || 0}deg)
                          scale(${change.elementData.width || 1}, ${change.elementData.height || 1})
                        `,
                        fontSize: change.elementData.style.fontSize?.magnitude 
                          ? `${change.elementData.style.fontSize.magnitude}${change.elementData.style.fontSize.unit || 'pt'}`
                          : '16px',
                        fontFamily: change.elementData.style.fontFamily || 'Arial',
                        color: getRgbaColor(change.elementData.style.foregroundColor),
                        fontWeight: change.elementData.style.bold ? 'bold' : 'normal',
                        fontStyle: change.elementData.style.italic ? 'italic' : 'normal',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        minWidth: '80px',
                        textAlign: 'center' as const,
                        whiteSpace: 'nowrap' as const
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-white/75 line-through">{change.oldPrice}</span>
                        <span className="text-sm font-bold text-white">{change.newPrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Posición:</span><br/>
                        X: {Math.round(change.position?.x || 0)}<br/>
                        Y: {Math.round(change.position?.y || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Rotación:</span><br/>
                        {Math.round(change.elementData.rotation || 0)}°
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Estilo:</span><br/>
                        {change.elementData.style.fontFamily || 'Arial'}<br/>
                        {change.elementData.style.fontSize?.magnitude 
                          ? `${change.elementData.style.fontSize.magnitude}${change.elementData.style.fontSize.unit || 'pt'}`
                          : '16px'}
                      </p>
                      <p>
                        {change.elementData.style.bold && 'Negrita '}
                        {change.elementData.style.italic && 'Cursiva'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay elementos para previsualizar
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Agregar estos estilos en tu archivo globals.css
// .bg-grid-pattern {
//   background-image: linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
//                     linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px);
//   background-size: 20px 20px;
//   background-color: #f8f9fa;
// } 