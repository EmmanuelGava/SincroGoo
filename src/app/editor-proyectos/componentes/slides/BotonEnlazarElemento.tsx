"use client"

import { useState } from "react"
import { IconButton, Tooltip, Menu, MenuItem, Typography, ListItemText, Box, ListItemIcon } from "@mui/material"
import { Link, Unlink } from "lucide-react"
import { useSlides } from "../../contexts"
import { useSheets } from "../../contexts/SheetsContext"
import { ElementoDiapositiva } from "../../types"
import { useNotificacion } from "../../contexts/NotificacionContext"

interface BotonEnlazarElementoProps {
  elemento: ElementoDiapositiva
}

export function BotonEnlazarElemento({ elemento }: BotonEnlazarElementoProps) {
  const { filaSeleccionada, columnas } = useSheets()
  const { enlazarElemento, desenlazarElemento } = useSlides()
  const { mostrarNotificacion } = useNotificacion()
  const [cargando, setCargando] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (elemento.columnaAsociada) {
      handleDesenlazar()
      return
    }
    
    if (!filaSeleccionada) {
      mostrarNotificacion({
        tipo: 'warning',
        mensaje: 'Selecciona una fila primero',
        titulo: 'Atención'
      })
      return
    }
    
    setAnchorEl(event.currentTarget)
  }
  
  const handleCloseMenu = () => {
    setAnchorEl(null)
  }
  
  const handleSeleccionarColumna = async (columnaId: string, titulo: string) => {
    try {
      setCargando(true)
      await enlazarElemento(elemento.id, columnaId)
      mostrarNotificacion({
        tipo: 'success',
        mensaje: `Elemento enlazado con la columna "${titulo}"`,
        titulo: 'Éxito'
      })
    } catch (error) {
      console.error('Error al enlazar elemento:', error)
      mostrarNotificacion({
        tipo: 'error',
        mensaje: 'Error al enlazar el elemento',
        titulo: 'Error'
      })
    } finally {
      setCargando(false)
      handleCloseMenu()
    }
  }

  const handleDesenlazar = async () => {
    try {
      setCargando(true)
      await desenlazarElemento(elemento.id)
      mostrarNotificacion({
        tipo: 'success',
        mensaje: 'Elemento desenlazado correctamente',
        titulo: 'Éxito'
      })
    } catch (error) {
      console.error('Error al desenlazar elemento:', error)
      mostrarNotificacion({
        tipo: 'error',
        mensaje: 'Error al desenlazar el elemento',
        titulo: 'Error'
      })
    } finally {
      setCargando(false)
    }
  }

  // Obtener valor de celda para una columna específica
  const obtenerValorCelda = (columnaId: string): string => {
    if (!filaSeleccionada) return 'Sin valor';
    
    const valorCelda = filaSeleccionada.valores.find(v => v.columnaId === columnaId);
    if (!valorCelda || valorCelda.valor === null || valorCelda.valor === undefined || valorCelda.valor === '') {
      return 'Sin valor';
    }
    return String(valorCelda.valor);
  };

  const tituloTooltip = elemento.columnaAsociada 
    ? 'Desenlazar elemento'
    : 'Enlazar con columna'

  return (
    <>
      <Tooltip title={tituloTooltip}>
        <IconButton
          onClick={handleOpenMenu}
          disabled={cargando}
          color={elemento.columnaAsociada ? "primary" : "inherit"}
          size="small"
        >
          {elemento.columnaAsociada ? (
            <Unlink size={14} className="text-primary" />
          ) : (
            <Link size={14} className="text-gray-400" />
          )}
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Selecciona una columna
        </Typography>
        
        {columnas
          .map((columna) => {
            const valorCelda = obtenerValorCelda(columna.id);
            
            // No mostrar columnas sin valor o con valor vacío
            if (valorCelda === 'Sin valor') {
              return null;
            }
            
            return (
              <MenuItem 
                key={columna.id} 
                onClick={() => handleSeleccionarColumna(columna.id, columna.titulo)}
                dense
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                <Box sx={{ 
                  width: '100%',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  pb: 0.5,
                  mb: 0.5
                }}>
                  <Typography 
                    variant="subtitle2" 
                    color="primary" 
                    fontWeight="medium"
                  >
                    {columna.titulo}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {valorCelda}
                </Typography>
              </MenuItem>
            );
          })
          .filter(Boolean) // Eliminar los nulls (columnas sin valor)
        }
        
        {columnas.filter(columna => obtenerValorCelda(columna.id) !== 'Sin valor').length === 0 && (
          <Typography variant="body2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            No hay valores disponibles para enlazar en esta fila
          </Typography>
        )}
      </Menu>
    </>
  )
} 