import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/componentes/ui/table'
import { Checkbox } from '@/componentes/ui/checkbox'
import { Button } from '@/componentes/ui/button'
import { Input } from '@/componentes/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/componentes/ui/tooltip'
import { Badge } from '@/componentes/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Price {
  id: string
  procedure: string
  currentPrice: number
  newPrice: number
  lastUpdate: Date
  slidePreview?: string
  changePercentage: number
}

interface PriceTableProps {
  prices: Price[]
  onSync: (selectedPrices: string[]) => Promise<void>
  onPreview: (priceId: string) => void
}

export function PriceTable({ prices, onSync, onPreview }: PriceTableProps) {
  const [selectedPrices, setSelectedPrices] = useState<string[]>([])
  const [filter, setFilter] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Price
    direction: 'asc' | 'desc'
  }>({ key: 'procedure', direction: 'asc' })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrices(filteredPrices.map(p => p.id))
    } else {
      setSelectedPrices([])
    }
  }

  const handleSelect = (priceId: string, checked: boolean) => {
    if (checked) {
      setSelectedPrices([...selectedPrices, priceId])
    } else {
      setSelectedPrices(selectedPrices.filter(id => id !== priceId))
    }
  }

  const handleSort = (key: keyof Price) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  const filteredPrices = prices
    .filter(price =>
      price.procedure.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (sortConfig.key === 'lastUpdate') {
        return sortConfig.direction === 'asc'
          ? (aValue as Date).getTime() - (bValue as Date).getTime()
          : (bValue as Date).getTime() - (aValue as Date).getTime()
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }

      return 0
    })

  const handleSync = async () => {
    if (selectedPrices.length === 0) return
    
    setIsSyncing(true)
    try {
      await onSync(selectedPrices)
    } catch (error) {
      console.error('Error al sincronizar:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const getChangeColor = (percentage: number) => {
    if (percentage > 10) return 'text-red-500'
    if (percentage > 5) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filtrar procedimientos..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setFilter('')}
                >
                  Limpiar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Limpiar filtro de búsqueda</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSync}
                disabled={selectedPrices.length === 0 || isSyncing}
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Seleccionados'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar los precios seleccionados en las diapositivas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredPrices.length > 0 &&
                    filteredPrices.every(p => selectedPrices.includes(p.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('procedure')}
              >
                Procedimiento
                {sortConfig.key === 'procedure' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort('currentPrice')}
              >
                Precio Actual
                {sortConfig.key === 'currentPrice' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort('newPrice')}
              >
                Nuevo Precio
                {sortConfig.key === 'newPrice' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort('changePercentage')}
              >
                % Cambio
                {sortConfig.key === 'changePercentage' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('lastUpdate')}
              >
                Última Actualización
                {sortConfig.key === 'lastUpdate' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrices.map((price) => (
              <TableRow key={price.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedPrices.includes(price.id)}
                    onCheckedChange={(checked) =>
                      handleSelect(price.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>{price.procedure}</TableCell>
                <TableCell className="text-right">
                  ${price.currentPrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ${price.newPrice.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right ${getChangeColor(
                    price.changePercentage
                  )}`}
                >
                  {price.changePercentage.toFixed(1)}%
                  {price.changePercentage > 10 && (
                    <Badge variant="destructive" className="ml-2">
                      Alto
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {format(price.lastUpdate, "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(price.id)}
                  >
                    Ver Slide
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 