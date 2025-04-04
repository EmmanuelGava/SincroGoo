"use client"

import { IconButton } from "@mui/material"
import { RefreshCw } from "lucide-react"
import { useSheets } from "../../contexts"
import { useUI } from "../../contexts"

export function BotonSincronizar() {
  const { sincronizarHojas } = useSheets()
  const { cargando } = useUI()

  return (
    <IconButton
      onClick={sincronizarHojas}
      disabled={cargando}
      size="small"
      color="primary"
      sx={{ 
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <RefreshCw className={cargando ? 'animate-spin' : ''} />
    </IconButton>
  )
} 