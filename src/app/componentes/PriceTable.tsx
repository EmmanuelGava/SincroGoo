import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Checkbox,
  TextField,
  Tooltip,
  Badge,
  Paper,
  TableContainer,
} from '@/componentes/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Search, Refresh, Visibility } from '@mui/icons-material'

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TextField
            size="small"
            placeholder="Filtrar procedimientos..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{
              startAdornment: <Search fontSize="small" />
            }}
          />
          <Tooltip title="Limpiar filtro de búsqueda">
            <Button
              variant="outlined"
              size="small"
              onClick={() => setFilter('')}
            >
              Limpiar
            </Button>
          </Tooltip>
        </div>
        <Tooltip title="Actualizar los precios seleccionados en las diapositivas">
          <span>
            <Button
              variant="contained"
              size="small"
              onClick={handleSync}
              disabled={selectedPrices.length === 0 || isSyncing}
              startIcon={<Refresh />}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Seleccionados'}
            </Button>
          </span>
        </Tooltip>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    filteredPrices.length > 0 &&
                    filteredPrices.every(p => selectedPrices.includes(p.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  indeterminate={
                    selectedPrices.length > 0 &&
                    selectedPrices.length < filteredPrices.length
                  }
                />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('procedure')}
                style={{ cursor: 'pointer' }}
              >
                Procedimiento
                {sortConfig.key === 'procedure' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell 
                align="right"
                onClick={() => handleSort('currentPrice')}
                style={{ cursor: 'pointer' }}
              >
                Precio Actual
                {sortConfig.key === 'currentPrice' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell 
                align="right"
                onClick={() => handleSort('newPrice')}
                style={{ cursor: 'pointer' }}
              >
                Nuevo Precio
                {sortConfig.key === 'newPrice' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell 
                align="right"
                onClick={() => handleSort('changePercentage')}
                style={{ cursor: 'pointer' }}
              >
                % Cambio
                {sortConfig.key === 'changePercentage' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell 
                onClick={() => handleSort('lastUpdate')}
                style={{ cursor: 'pointer' }}
              >
                Última Actualización
                {sortConfig.key === 'lastUpdate' && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell>Preview</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPrices.map((price) => (
              <TableRow key={price.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedPrices.includes(price.id)}
                    onChange={(e) => handleSelect(price.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell>{price.procedure}</TableCell>
                <TableCell align="right">
                  ${price.currentPrice.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  ${price.newPrice.toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: price.changePercentage > 10 
                      ? 'error.main' 
                      : price.changePercentage > 5 
                      ? 'warning.main' 
                      : 'success.main'
                  }}
                >
                  {price.changePercentage.toFixed(1)}%
                  {price.changePercentage > 10 && (
                    <Badge 
                      color="error" 
                      sx={{ ml: 1 }}
                    >
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
                    variant="text"
                    size="small"
                    onClick={() => onPreview(price.id)}
                    startIcon={<Visibility />}
                  >
                    Ver Slide
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
} 