import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChangeRecord {
  id: string
  timestamp: Date
  user: string
  procedure: string
  oldPrice: number
  newPrice: number
  slideId: string
}

interface ChangeHistoryProps {
  changes: ChangeRecord[]
  onExport: () => void
}

export function ChangeHistory({ changes, onExport }: ChangeHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)

  const getChangePercentage = (oldPrice: number, newPrice: number) => {
    const percentage = ((newPrice - oldPrice) / oldPrice) * 100
    return percentage.toFixed(1)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Ver Historial</Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Historial de Cambios</SheetTitle>
          <SheetDescription>
            Registro de todas las actualizaciones de precios
          </SheetDescription>
        </SheetHeader>
        <div className="flex justify-end py-4">
          <Button onClick={onExport} variant="outline" size="sm">
            Exportar a Excel
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-8">
            {changes.map((change) => (
              <div
                key={change.id}
                className="border-b border-gray-200 pb-6 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{change.procedure}</div>
                  <div className="text-sm text-gray-500">
                    {format(change.timestamp, "d 'de' MMMM, yyyy HH:mm", {
                      locale: es,
                    })}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Por: {change.user}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Precio Anterior</div>
                    <div className="font-medium">
                      {formatPrice(change.oldPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Nuevo Precio</div>
                    <div className="font-medium">
                      {formatPrice(change.newPrice)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  Cambio:{' '}
                  <span
                    className={
                      change.newPrice > change.oldPrice
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {getChangePercentage(change.oldPrice, change.newPrice)}%
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  ID de Diapositiva: {change.slideId}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 