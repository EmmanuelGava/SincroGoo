"use client"

import { useState } from "react"
import { Button, SxProps, Theme } from "@mui/material"
import { Refresh as RefreshIcon } from "@mui/icons-material"
import { ElementoDiapositiva } from "@/tipos/diapositivas"
import { FilaSeleccionada } from "@/tipos/hojas"
import { useEditor } from "../../contexto/EditorContext"

interface BotonSincronizarProps {
  elementos: ElementoDiapositiva[]
  filaSeleccionada: FilaSeleccionada | null
  disabled?: boolean
  sx?: SxProps<Theme>
}

export function BotonSincronizar({ 
  elementos, 
  filaSeleccionada,
  disabled = false,
  sx
}: BotonSincronizarProps) {
  const [sincronizando, setSincronizando] = useState(false)
  const { sincronizarElementosAsociados, guardando } = useEditor()

  const handleSincronizar = async () => {
    if (sincronizando || guardando || disabled || !filaSeleccionada || elementos.length === 0) return
    
    try {
      setSincronizando(true)
      await sincronizarElementosAsociados()
    } catch (error) {
      console.error("Error al sincronizar elementos:", error)
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={handleSincronizar}
      disabled={sincronizando || guardando || disabled || !filaSeleccionada || elementos.length === 0}
      startIcon={
        <RefreshIcon 
          fontSize="small" 
          sx={{ 
            animation: (sincronizando || guardando) ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': {
                transform: 'rotate(0deg)',
              },
              '100%': {
                transform: 'rotate(360deg)',
              },
            },
          }} 
        />
      }
      sx={sx}
    >
      {sincronizando || guardando ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  )
} 