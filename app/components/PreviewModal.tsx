import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { PreviewChange } from "@/types/preview"

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  changes: PreviewChange[]
  isLoading: boolean
}

export function PreviewModal({ isOpen, onClose, changes, isLoading }: PreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista Previa de Cambios</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generando vista previa...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {changes.map((change, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="mb-2">
                    <span className="font-semibold">Diapositiva {change.slideIndex}</span>
                  </div>
                  
                  <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                    {change.thumbnail ? (
                      <img 
                        src={change.thumbnail} 
                        alt={`Preview slide ${change.slideIndex}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-muted-foreground">Vista previa no disponible</span>
                      </div>
                    )}
                    
                    {/* Indicador de cambio de precio */}
                    {change.position && (
                      <div 
                        className="absolute flex flex-col items-center bg-black/75 text-white p-2 rounded"
                        style={{
                          left: `${(change.position.x / 720) * 100}%`,
                          top: `${(change.position.y / 405) * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <span className="text-xs line-through opacity-75">{change.oldPrice}</span>
                        <span className="text-sm font-bold">{change.newPrice}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 