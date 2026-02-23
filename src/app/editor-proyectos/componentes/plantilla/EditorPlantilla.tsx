"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Stack from "@mui/material/Stack"
import LinearProgress from "@mui/material/LinearProgress"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import IconButton from "@mui/material/IconButton"
import VisibilityIcon from "@mui/icons-material/Visibility"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { EncabezadoSistema } from "@/app/componentes/EncabezadoSistema"
import { TablaPlantillaSheet } from "./TablaPlantillaSheet"
import { useSheets } from "../../contexts"

const SLIDES_EDIT_URL = (id: string) =>
  `https://docs.google.com/presentation/d/${id}/edit`

const CHIP_COLORS = [
  '#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
  '#EC4899', '#84CC16'
]

interface EditorPlantillaProps {
  idPresentacion: string
  idHojaCalculo: string
  idProyecto: string
  columnMapping?: Record<string, string>
  templateType?: string
}

export function EditorPlantilla({
  idPresentacion,
  idHojaCalculo,
  idProyecto,
  columnMapping = {},
  templateType = ''
}: EditorPlantillaProps) {
  const { columnas, filas } = useSheets()
  const [hasPlaceholders, setHasPlaceholders] = useState(false)
  const [cargandoPlaceholders, setCargandoPlaceholders] = useState(true)
  const [previewAbierto, setPreviewAbierto] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generarAbierto, setGenerarAbierto] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [resultado, setResultado] = useState<{
    generadas: number
    total: number
    fallidas: number
    errores: { fila: number; error: string }[]
    presentationId?: string
  } | null>(null)

  const encabezados = columnas.map((c) => c.titulo).filter(Boolean)
  const placeholdersMapeados = Object.keys(columnMapping).length > 0
    ? Object.keys(columnMapping)
    : encabezados

  const copiarPlaceholder = (titulo: string) => {
    const placeholder = `{{${titulo}}}`
    navigator.clipboard.writeText(placeholder)
    toast.success(`${placeholder} copiado — pégalo en tu diapositiva`)
  }

  useEffect(() => {
    const check = async () => {
      setCargandoPlaceholders(true)
      try {
        const res = await fetch(
          `/api/google/slides/plantilla/check-placeholders?presentationId=${idPresentacion}`
        )
        const data = await res.json()
        if (data.exito && data.datos) {
          setHasPlaceholders(data.datos.hasPlaceholders)
        }
      } catch {
        setHasPlaceholders(false)
      } finally {
        setCargandoPlaceholders(false)
      }
    }
    check()
  }, [idPresentacion])

  const handlePreview = async () => {
    try {
      toast.info("Creando vista previa...")
      const body: Record<string, unknown> = {
        presentationId: idPresentacion,
        spreadsheetId: idHojaCalculo
      }
      if (Object.keys(columnMapping).length > 0) {
        body.columnMapping = columnMapping
      } else {
        body.encabezados = encabezados
      }
      const res = await fetch("/api/google/slides/plantilla/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.exito && data.datos?.url) {
        setPreviewUrl(data.datos.url)
        setPreviewAbierto(true)
      } else {
        toast.error(data.error || "Error al crear vista previa")
      }
    } catch (err) {
      toast.error("Error al crear vista previa")
    }
  }

  const handleGenerarClick = () => {
    setResultado(null)
    setGenerarAbierto(true)
  }

  const pollJob = async (jobId: string) => {
    const interval = 2000
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/google/slides/plantilla/job/${jobId}`)
        const data = await res.json()
        if (!data.exito || !data.datos) return
        const { estado, total_filas, filas_procesadas, filas_error, errores, presentation_id } = data.datos
        const pct = total_filas > 0 ? Math.round(((filas_procesadas + filas_error) / total_filas) * 100) : 0
        setProgreso(Math.min(pct, 99))
        setResultado({
          generadas: filas_procesadas,
          total: total_filas,
          fallidas: filas_error,
          errores: Array.isArray(errores) ? errores : []
        })
        if (estado === "completado") {
          setProgreso(100)
          setGenerando(false)
          toast.success(`Se generaron ${filas_procesadas} diapositivas correctamente`)
          if (filas_error > 0) {
            toast.warning(`${filas_error} filas fallaron. Revisa el resumen.`)
          }
          setResultado((r) => (r ? { ...r, presentationId: presentation_id } : r))
          return
        }
        if (estado === "error") {
          setGenerando(false)
          toast.error("Error en la generación")
          return
        }
        setTimeout(poll, interval)
      } catch {
        setTimeout(poll, interval)
      }
    }
    poll()
  }

  const handleGenerarConfirmar = async () => {
    setGenerando(true)
    setProgreso(0)
    setResultado(null)
    try {
      const body: Record<string, unknown> = {
        presentationId: idPresentacion,
        spreadsheetId: idHojaCalculo,
        proyectoId: idProyecto,
        templateType: templateType || undefined
      }
      if (Object.keys(columnMapping).length > 0) {
        body.columnMapping = columnMapping
      } else {
        body.encabezados = encabezados
      }
      const res = await fetch("/api/google/slides/plantilla/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.exito && data.datos?.job_id) {
        toast.info("Generación iniciada. Procesando en segundo plano...")
        pollJob(data.datos.job_id)
      } else {
        toast.error(data.error || "Error al iniciar generación")
        setGenerando(false)
      }
    } catch {
      toast.error("Error al generar diapositivas")
      setGenerando(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <EncabezadoSistema />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <Typography variant="subtitle2" color="text.secondary">
              {Object.keys(columnMapping).length > 0 ? "Placeholders mapeados" : "Columnas disponibles"}
            </Typography>
            {placeholdersMapeados.map((ph, idx) => (
              <Chip
                key={ph}
                label={`{{${ph}}}`}
                size="small"
                onClick={() => copiarPlaceholder(ph)}
                icon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                sx={{
                  cursor: "pointer",
                  backgroundColor: CHIP_COLORS[idx % CHIP_COLORS.length] + "22",
                  color: CHIP_COLORS[idx % CHIP_COLORS.length],
                  borderColor: CHIP_COLORS[idx % CHIP_COLORS.length] + "66"
                }}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-96 flex-shrink-0 overflow-auto p-4 border-r border-gray-200">
            <Typography variant="h6" sx={{ mb: 2 }}>
              Datos del Sheet
            </Typography>
            <TablaPlantillaSheet />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={handlePreview}
                size="small"
              >
                Preview con primera fila
              </Button>
              {(hasPlaceholders || !cargandoPlaceholders) && (
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerarClick}
                  size="small"
                >
                  Generar todas las diapositivas
                </Button>
              )}
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, p: 2, display: "flex", flexDirection: "column" }}>
              <iframe
                src={SLIDES_EDIT_URL(idPresentacion)}
                className="w-full flex-1 min-h-0 border rounded"
                title="Editor de plantilla"
              />
            </Box>
          </div>
        </div>
      </main>

      <Dialog open={previewAbierto} onClose={() => setPreviewAbierto(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview con datos reales</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <iframe
              src={previewUrl.replace("/edit", "/embed")}
              style={{ width: "100%", height: 500, border: "none", display: "block" }}
              title="Preview"
              allow="fullscreen"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => previewUrl && window.open(previewUrl)}>
            Abrir en nueva pestaña
          </Button>
          <Button onClick={() => setPreviewAbierto(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={generarAbierto}
        onClose={() => !generando && setGenerarAbierto(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generar todas las diapositivas</DialogTitle>
        <DialogContent>
          {!generando && !resultado ? (
            <Typography sx={{ mb: 2 }}>
              Se van a generar {filas.length} diapositivas, una por cada fila
              del Sheet. El proceso se ejecuta en segundo plano para evitar límites de la API. ¿Continuar?
            </Typography>
          ) : generando || (resultado && resultado.generadas + resultado.fallidas < resultado.total) ? (
            <Box>
              <Typography sx={{ mb: 1 }}>
                Procesando fila {(resultado?.generadas ?? 0) + (resultado?.fallidas ?? 0) + 1} de {resultado?.total ?? filas.length}...
              </Typography>
              <LinearProgress variant="determinate" value={progreso} sx={{ mt: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {progreso}%
              </Typography>
            </Box>
          ) : resultado ? (
            <Box>
              <Typography color="success.main" fontWeight={600}>
                Se generaron {resultado.generadas} diapositivas correctamente
              </Typography>
              {resultado.fallidas > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography color="warning.main">
                    {resultado.fallidas} fallaron
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 0.5, maxHeight: 120, overflow: "auto" }}>
                    {resultado.errores.map((e) => (
                      <li key={e.fila}>
                        <Typography variant="body2" color="text.secondary">
                          Fila {e.fila}: {e.error}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {!resultado || (resultado && resultado.generadas + resultado.fallidas < resultado.total) ? (
            <>
              <Button onClick={() => setGenerarAbierto(false)} disabled={generando}>
                Cancelar
              </Button>
              {!generando ? (
                <Button variant="contained" onClick={handleGenerarConfirmar}>
                  Continuar
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                variant="contained"
                href={SLIDES_EDIT_URL(resultado.presentationId || idPresentacion)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver presentación
              </Button>
              <Button onClick={() => { setGenerarAbierto(false); setResultado(null) }}>
                Cerrar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}
