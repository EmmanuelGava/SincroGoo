"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import type { FilaHoja, ColumnaHoja } from "../../types"
import { LAYOUTS } from "@/app/servicios/google/slides/plantilla-layouts"
import { PLANTILLAS } from "../../plantilla/templates"

/** Slide ~720x405 pt, convertimos a % para CSS */
const SLIDE_W = 720
const SLIDE_H = 405

function ptToPercent(value: number, total: number): string {
  return `${(value / total) * 100}%`
}

interface PreviewSlideCSSProps {
  templateType: string
  columnMapping: Record<string, string>
  columnas: ColumnaHoja[]
  primeraFila: FilaHoja | null
}

/** Obtiene el valor de la primera fila para un placeholder */
function getValorPlaceholder(
  placeholder: string,
  columnMapping: Record<string, string>,
  columnas: ColumnaHoja[],
  primeraFila: FilaHoja | null
): string {
  if (!primeraFila) return `{{${placeholder}}}`
  const colName = columnMapping[placeholder] ?? placeholder
  const col = columnas.find((c) => c.titulo === colName)
  if (!col) return `{{${placeholder}}}`
  const celda = primeraFila.valores.find((v) => v.columnaId === col.id)
  const val = celda?.valor?.toString().trim()
  return val || `{{${placeholder}}}`
}

export function PreviewSlideCSS({
  templateType,
  columnMapping,
  columnas,
  primeraFila
}: PreviewSlideCSSProps) {
  const plantilla = PLANTILLAS.find((p) => p.id === templateType)
  const layout = LAYOUTS[templateType]

  const bgColor = plantilla?.bgColor ?? "#FFFFFF"
  const textColor = plantilla?.textColor ?? "#1F2937"
  const accentColor = plantilla?.accentColor ?? "#6B7280"

  if (!layout || layout.length === 0) {
    return (
      <Box
        sx={{
          aspectRatio: "16/9",
          maxWidth: 480,
          bgcolor: bgColor,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Plantilla en blanco o sin diseño definido
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        aspectRatio: "16/9",
        maxWidth: 480,
        bgcolor: bgColor,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {layout.map((el) => {
        const valor = getValorPlaceholder(
          el.placeholder,
          columnMapping,
          columnas,
          primeraFila
        )
        const displayVal = valor.length > 80 ? valor.slice(0, 77) + "…" : valor
        return (
          <Box
            key={el.placeholder}
            sx={{
              position: "absolute",
              left: ptToPercent(el.x, SLIDE_W),
              top: ptToPercent(el.y, SLIDE_H),
              width: ptToPercent(el.w, SLIDE_W),
              height: ptToPercent(el.h, SLIDE_H),
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-start"
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: Math.max(10, (el.fontSize ?? 14) * 0.6),
                fontWeight: el.bold ? 700 : 400,
                color: textColor,
                lineHeight: 1.2,
                wordBreak: "break-word"
              }}
            >
              {displayVal || `{{${el.placeholder}}}`}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
