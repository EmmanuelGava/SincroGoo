"use client"

import React from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import FormControl from "@mui/material/FormControl"
import FormLabel from "@mui/material/FormLabel"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import Card from "@mui/material/Card"
import CardActionArea from "@mui/material/CardActionArea"
import InputAdornment from "@mui/material/InputAdornment"
import ImageIcon from "@mui/icons-material/Image"
import { PreviewSlideCSS, PersonalizacionPreview } from "@/app/editor-proyectos/componentes/plantilla/PreviewSlideCSS"
import { ColorPickerButton } from "@/components/ColorPickerButton"
import type { ColumnaHoja, FilaHoja } from "@/app/editor-proyectos/types"

export const FUENTES = [
  { id: "Roboto", nombre: "Roboto", fontFamily: "Roboto" },
  { id: "Montserrat", nombre: "Montserrat", fontFamily: "Montserrat" },
  { id: "Playfair Display", nombre: "Playfair Display", fontFamily: "'Playfair Display'" },
  { id: "Lato", nombre: "Lato", fontFamily: "Lato" },
  { id: "Oswald", nombre: "Oswald", fontFamily: "Oswald" }
] as const

export const PALETAS = [
  {
    id: "oscuro_profesional",
    nombre: "Oscuro profesional",
    fondo: "#1a1a2e",
    texto: "#ffffff",
    acento: "#7c3aed"
  },
  {
    id: "blanco_limpio",
    nombre: "Blanco limpio",
    fondo: "#ffffff",
    texto: "#1f2937",
    acento: "#2563eb"
  },
  {
    id: "verde_naturaleza",
    nombre: "Verde naturaleza",
    fondo: "#f0fdf4",
    texto: "#14532d",
    acento: "#16a34a"
  },
  {
    id: "naranja_energia",
    nombre: "Naranja energía",
    fondo: "#fff7ed",
    texto: "#431407",
    acento: "#ea580c"
  },
  {
    id: "azul_corporativo",
    nombre: "Azul corporativo",
    fondo: "#eff6ff",
    texto: "#1e3a5f",
    acento: "#1d4ed8"
  },
  {
    id: "rosa_moderno",
    nombre: "Rosa moderno",
    fondo: "#fdf2f8",
    texto: "#500724",
    acento: "#db2777"
  },
  {
    id: "gris_minimalista",
    nombre: "Gris minimalista",
    fondo: "#f9fafb",
    texto: "#111827",
    acento: "#374151"
  },
  {
    id: "negro_premium",
    nombre: "Negro premium",
    fondo: "#0f0f0f",
    texto: "#f5f5f5",
    acento: "#fbbf24"
  }
] as const

export const POSICIONES_LOGO = [
  { id: "superior_izquierda", label: "Superior izquierda" },
  { id: "superior_derecha", label: "Superior derecha" },
  { id: "inferior_izquierda", label: "Inferior izquierda" },
  { id: "inferior_derecha", label: "Inferior derecha" }
] as const

export const CONDICIONES_FILTRO = [
  { id: "contiene", label: "contiene" },
  { id: "igual", label: "es igual a" },
  { id: "mayor_que", label: "mayor que" },
  { id: "menor_que", label: "menor que" }
] as const

export interface PersonalizacionState {
  fontFamily: string
  paletaId: string
  colores: { fondo: string; texto: string; acento: string }
  logo: { url: string; posicion: string } | null
  portada: { activa: boolean; titulo: string; subtitulo: string }
  ordenamiento: { columna: string; direccion: "sin" | "ASC" | "DESC" }
  filtro: { activo: boolean; columna: string; condicion: string; valor: string }
}

export const PERSONALIZACION_DEFAULT: PersonalizacionState = {
  fontFamily: "Roboto",
  paletaId: "blanco_limpio",
  colores: { fondo: PALETAS[1].fondo, texto: PALETAS[1].texto, acento: PALETAS[1].acento },
  logo: null,
  portada: { activa: false, titulo: "", subtitulo: "" },
  ordenamiento: { columna: "", direccion: "sin" },
  filtro: { activo: false, columna: "", condicion: "igual", valor: "" }
}

interface PersonalizacionPlantillaProps {
  templateType: string
  columnMapping: Record<string, string>
  columnas: ColumnaHoja[]
  primeraFila: FilaHoja | null
  personalizacion: PersonalizacionState
  onPersonalizacionChange: (p: PersonalizacionState) => void
}

export function PersonalizacionPlantilla({
  templateType,
  columnMapping,
  columnas,
  primeraFila,
  personalizacion,
  onPersonalizacionChange
}: PersonalizacionPlantillaProps) {
  const update = (partial: Partial<PersonalizacionState>) => {
    onPersonalizacionChange({ ...personalizacion, ...partial })
  }

  const previewPersonalizacion: PersonalizacionPreview = {
    fontFamily: personalizacion.fontFamily,
    colores: personalizacion.colores
  }

  const [subiendoLogo, setSubiendoLogo] = React.useState(false)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    setSubiendoLogo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd })
      const data = await res.json()
      if (data.exito && data.url) {
        update({
          logo: {
            url: data.url,
            posicion: personalizacion.logo?.posicion ?? "superior_derecha"
          }
        })
      }
    } finally {
      setSubiendoLogo(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 4 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Tipografía
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {FUENTES.map((f) => (
              <Card
                key={f.id}
                sx={{
                  width: 120,
                  border: 2,
                  borderColor: personalizacion.fontFamily === f.fontFamily ? "primary.main" : "divider",
                  "&:hover": { borderColor: "primary.main" }
                }}
              >
                <CardActionArea
                  onClick={() => update({ fontFamily: f.fontFamily })}
                  sx={{ p: 1.5, fontFamily: f.fontFamily }}
                >
                  <Typography variant="body2" sx={{ fontFamily: f.fontFamily }}>
                    {f.nombre}
                  </Typography>
                </CardActionArea>
              </Card>
            ))}
          </Stack>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 2 }}>
            Paleta de colores
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {PALETAS.map((p) => (
              <Card
                key={p.id}
                sx={{
                  width: 80,
                  height: 80,
                  border: 2,
                  borderColor: personalizacion.paletaId === p.id ? "primary.main" : "divider",
                  overflow: "hidden",
                  "&:hover": { borderColor: "primary.main" }
                }}
              >
                <CardActionArea
                  onClick={() => {
                    update({
                      paletaId: p.id,
                      colores: { fondo: p.fondo, texto: p.texto, acento: p.acento }
                    })
                  }}
                  sx={{ height: "100%" }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      background: `linear-gradient(135deg, ${p.fondo} 0%, ${p.acento} 50%, ${p.texto} 100%)`
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      right: 4,
                      fontSize: 10,
                      color: p.fondo === "#ffffff" || p.fondo === "#f0fdf4" ? "#333" : "#fff",
                      fontWeight: 600
                    }}
                  >
                    {p.nombre.slice(0, 12)}
                  </Box>
                </CardActionArea>
              </Card>
            ))}
            <Card
              sx={{
                width: 80,
                height: 80,
                border: 2,
                borderColor: personalizacion.paletaId === "personalizado" ? "primary.main" : "divider",
                overflow: "visible",
                "&:hover": { borderColor: "primary.main" }
              }}
            >
              <CardActionArea
                onClick={() => update({ paletaId: "personalizado" })}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 0.5
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.25,
                    mb: 0.5
                  }}
                >
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: personalizacion.colores.fondo, border: "1px solid", borderColor: "divider" }} />
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: personalizacion.colores.texto, border: "1px solid", borderColor: "divider" }} />
                  <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: personalizacion.colores.acento, border: "1px solid", borderColor: "divider" }} />
                </Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: 9 }}>
                  Personalizar
                </Typography>
              </CardActionArea>
            </Card>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Personaliza con el selector de color:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <ColorPickerButton
              label="Fondo"
              value={personalizacion.colores.fondo}
              onChange={(hex) =>
                update({
                  colores: { ...personalizacion.colores, fondo: hex },
                  paletaId: "personalizado"
                })
              }
            />
            <ColorPickerButton
              label="Texto"
              value={personalizacion.colores.texto}
              onChange={(hex) =>
                update({
                  colores: { ...personalizacion.colores, texto: hex },
                  paletaId: "personalizado"
                })
              }
            />
            <ColorPickerButton
              label="Acento"
              value={personalizacion.colores.acento}
              onChange={(hex) =>
                update({
                  colores: { ...personalizacion.colores, acento: hex },
                  paletaId: "personalizado"
                })
              }
            />
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Vista previa
          </Typography>
          <PreviewSlideCSS
            templateType={templateType}
            columnMapping={columnMapping}
            columnas={columnas}
            primeraFila={primeraFila}
            personalizacion={previewPersonalizacion}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Opciones adicionales
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel>Logo (opcional)</FormLabel>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<ImageIcon />}
              disabled={subiendoLogo}
            >
              {subiendoLogo ? "Subiendo…" : "Subir imagen"}
              <input type="file" hidden accept="image/png,image/jpeg,image/jpg" onChange={handleLogoUpload} />
            </Button>
            {personalizacion.logo ? (
              <>
                <Box
                  component="img"
                  src={personalizacion.logo.url}
                  alt="Logo"
                  sx={{ width: 48, height: 48, objectFit: "contain" }}
                />
                <TextField
                  select
                  size="small"
                  label="Posición"
                  value={personalizacion.logo.posicion}
                  onChange={(e) =>
                    update({
                      logo: personalizacion.logo
                        ? { ...personalizacion.logo, posicion: e.target.value }
                        : null
                    })
                  }
                  sx={{ minWidth: 180 }}
                >
                  {POSICIONES_LOGO.map((pos) => (
                    <MenuItem key={pos.id} value={pos.id}>
                      {pos.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: "pointer" }}
                  onClick={() => update({ logo: null })}
                >
                  Quitar
                </Typography>
              </>
            ) : null}
          </Stack>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={personalizacion.portada.activa}
                onChange={(e) =>
                  update({
                    portada: { ...personalizacion.portada, activa: e.target.checked }
                  })
                }
              />
            }
            label="Slide de portada"
          />
          {personalizacion.portada.activa && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
              <TextField
                size="small"
                label="Título de portada"
                value={personalizacion.portada.titulo}
                onChange={(e) =>
                  update({
                    portada: { ...personalizacion.portada, titulo: e.target.value }
                  })
                }
                fullWidth
              />
              <TextField
                size="small"
                label="Subtítulo"
                value={personalizacion.portada.subtitulo}
                onChange={(e) =>
                  update({
                    portada: { ...personalizacion.portada, subtitulo: e.target.value }
                  })
                }
                fullWidth
              />
            </Stack>
          )}
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <FormLabel>Ordenar filas</FormLabel>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              select
              size="small"
              label="Orden"
              value={personalizacion.ordenamiento.direccion}
              onChange={(e) =>
                update({
                  ordenamiento: {
                    ...personalizacion.ordenamiento,
                    direccion: e.target.value as "sin" | "ASC" | "DESC"
                  }
                })
              }
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="sin">Sin ordenar</MenuItem>
              <MenuItem value="ASC">A-Z por columna</MenuItem>
              <MenuItem value="DESC">Z-A por columna</MenuItem>
            </TextField>
            {personalizacion.ordenamiento.direccion !== "sin" && (
              <TextField
                select
                size="small"
                label="Columna"
                value={personalizacion.ordenamiento.columna}
                onChange={(e) =>
                  update({
                    ordenamiento: { ...personalizacion.ordenamiento, columna: e.target.value }
                  })
                }
                sx={{ minWidth: 180 }}
              >
                {columnas.map((c) => (
                  <MenuItem key={c.id} value={c.titulo}>
                    {c.titulo}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </FormControl>

        <FormControl fullWidth>
          <FormControlLabel
            control={
              <Switch
                checked={personalizacion.filtro.activo}
                onChange={(e) =>
                  update({
                    filtro: { ...personalizacion.filtro, activo: e.target.checked }
                  })
                }
              />
            }
            label="Filtrar filas"
          />
          {personalizacion.filtro.activo && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
              <TextField
                select
                size="small"
                label="Columna"
                value={personalizacion.filtro.columna}
                onChange={(e) =>
                  update({ filtro: { ...personalizacion.filtro, columna: e.target.value } })
                }
                sx={{ minWidth: 140 }}
              >
                {columnas.map((c) => (
                  <MenuItem key={c.id} value={c.titulo}>
                    {c.titulo}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Condición"
                value={personalizacion.filtro.condicion}
                onChange={(e) =>
                  update({ filtro: { ...personalizacion.filtro, condicion: e.target.value } })
                }
                sx={{ minWidth: 130 }}
              >
                {CONDICIONES_FILTRO.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Valor"
                value={personalizacion.filtro.valor}
                onChange={(e) =>
                  update({ filtro: { ...personalizacion.filtro, valor: e.target.value } })
                }
                sx={{ minWidth: 140 }}
              />
            </Stack>
          )}
        </FormControl>
      </Box>
    </Box>
  )
}
