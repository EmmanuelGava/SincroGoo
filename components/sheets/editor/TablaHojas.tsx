"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, Filter, ChevronDown, ChevronUp, Edit, Save } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FilaHoja, FilaSeleccionada } from "@/tipos/hojas"

interface TablaHojasProps {
  columnas: string[]
  filas: FilaHoja[]
  cargando: boolean
  filaSeleccionada: FilaSeleccionada | null
  onSeleccionarFila: (fila: FilaSeleccionada) => void
  onActualizarFila?: (fila: FilaHoja) => Promise<void>
  titulo?: string
}

export default function TablaHojas({
  columnas,
  filas,
  cargando,
  filaSeleccionada,
  onSeleccionarFila,
  onActualizarFila,
  titulo = "Datos de la Hoja de Cálculo"
}: TablaHojasProps) {
  const [busqueda, setBusqueda] = useState("")
  const [columnaOrden, setColumnaOrden] = useState<string | null>(null)
  const [ordenAscendente, setOrdenAscendente] = useState(true)
  const [filasFiltradas, setFilasFiltradas] = useState<FilaHoja[]>([])
  const [editandoFila, setEditandoFila] = useState<string | null>(null)
  const [valoresEditados, setValoresEditados] = useState<{[key: string]: string}>({})
  
  useEffect(() => {
    let resultado = [...filas]
    
    if (busqueda.trim()) {
      const terminoBusqueda = busqueda.toLowerCase()
      resultado = resultado.filter(fila => 
        Object.entries(fila.valores).some(([_, valor]) => 
          String(valor).toLowerCase().includes(terminoBusqueda)
        )
      )
    }
    
    if (columnaOrden) {
      resultado.sort((a, b) => {
        const valorA = a.valores[columnaOrden]
        const valorB = b.valores[columnaOrden]
        
        if (typeof valorA === 'number' && typeof valorB === 'number') {
          return ordenAscendente ? valorA - valorB : valorB - valorA
        }
        
        const strA = String(valorA || '').toLowerCase()
        const strB = String(valorB || '').toLowerCase()
        
        return ordenAscendente 
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA)
      })
    }
    
    setFilasFiltradas(resultado)
  }, [filas, busqueda, columnaOrden, ordenAscendente])
  
  const manejarOrdenar = (columna: string) => {
    if (columnaOrden === columna) {
      setOrdenAscendente(!ordenAscendente)
    } else {
      setColumnaOrden(columna)
      setOrdenAscendente(true)
    }
  }
  
  const renderizarIndicadorOrden = (columna: string) => {
    if (columnaOrden !== columna) return null
    return ordenAscendente 
      ? <ChevronUp className="ml-1 h-4 w-4" />
      : <ChevronDown className="ml-1 h-4 w-4" />
  }

  const iniciarEdicion = (fila: FilaHoja) => {
    setEditandoFila(fila.id)
    setValoresEditados(fila.valores)
  }

  const actualizarValor = (columna: string, valor: string) => {
    setValoresEditados(prev => ({
      ...prev,
      [columna]: valor
    }))
  }

  const guardarCambios = async (fila: FilaHoja) => {
    if (!onActualizarFila) return

    const filaActualizada: FilaHoja = {
      ...fila,
      valores: valoresEditados,
      ultimaActualizacion: new Date()
    }

    await onActualizarFila(filaActualizada)
    setEditandoFila(null)
    setValoresEditados({})
  }

  const convertirAFilaSeleccionada = (fila: FilaHoja): FilaSeleccionada => ({
    ...fila,
    ultimaActualizacion: fila.ultimaActualizacion || new Date(),
    numeroFila: fila.numeroFila || 0
  })
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{titulo}</h2>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                {columnas.map(columna => (
                  <TableHead 
                    key={columna}
                    className="sticky top-0 bg-background cursor-pointer hover:bg-muted/50"
                    onClick={() => manejarOrdenar(columna)}
                  >
                    <div className="flex items-center">
                      {columna}
                      {renderizarIndicadorOrden(columna)}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 bg-background w-[100px]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columnas.map((columna, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filasFiltradas.length > 0 ? (
                filasFiltradas.map((fila) => (
                  <TableRow 
                    key={fila.id}
                    className={`hover:bg-muted/50 ${
                      filaSeleccionada?.id === fila.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    {columnas.map(columna => (
                      <TableCell key={columna}>
                        {editandoFila === fila.id ? (
                          <Input
                            value={valoresEditados[columna] || ''}
                            onChange={(e) => actualizarValor(columna, e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          String(fila.valores[columna] || '')
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editandoFila === fila.id ? (
                          <Button
                            size="sm"
                            onClick={() => guardarCambios(fila)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => iniciarEdicion(fila)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onSeleccionarFila(convertirAFilaSeleccionada(fila))}
                        >
                          Ver Slides
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columnas.length + 1} className="h-24 text-center">
                    {filas.length === 0 
                      ? "No hay datos disponibles" 
                      : "No se encontraron resultados para tu búsqueda"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {filasFiltradas.length} resultados
        {busqueda.trim() && ` para "${busqueda}"`}
        {filas.length > 0 && ` de ${filas.length} total`}
      </div>
    </div>
  )
} 