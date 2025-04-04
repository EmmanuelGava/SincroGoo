"use client"

import { Button } from "@mui/material"
import { Close as CloseIcon } from "@mui/icons-material"
import { useUI } from "../../contexts"

interface BotonCancelarElementosProps {
  onCancelar: () => void
}

export function BotonCancelarElementos({ onCancelar }: BotonCancelarElementosProps) {
  const { cargando } = useUI()

  return (
    <Button
      variant="outlined"
      onClick={onCancelar}
      disabled={cargando}
      startIcon={<CloseIcon />}
    >
      Cancelar
    </Button>
  )
} 