'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Card,
  CardActionArea,
  CardContent,
  InputAdornment,
  Chip,
} from '@mui/material'
import {
  TableChart as TableChartIcon,
  Search as SearchIcon,
  Slideshow as SlideshowIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

interface GooglePresentation {
  id: string
  name: string
  lastModified?: string
}

export default function SlidesToSheetPage() {
  const { data: session, status } = useSession()
  const [presentaciones, setPresentaciones] = useState<GooglePresentation[]>([])
  const [cargando, setCargando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionada, setSeleccionada] = useState<GooglePresentation | null>(null)
  const [resultado, setResultado] = useState<{ spreadsheetId: string; url: string; slides: number; titulo: string } | null>(null)

  useEffect(() => {
    if (status === 'authenticated') cargarPresentaciones()
  }, [status])

  const cargarPresentaciones = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/google/documents?type=slides')
      if (!res.ok) {
        if (res.status === 401) { signIn('google'); return }
        throw new Error('Error al cargar presentaciones')
      }
      const data = await res.json()
      const docs = (data.documents || [])
        .filter((d: { type: string }) => d.type === 'slides')
        .map((d: { id: string; name: string; lastModified?: string }) => ({
          id: d.id,
          name: d.name,
          lastModified: d.lastModified,
        }))
      setPresentaciones(docs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setCargando(false)
    }
  }

  const extraer = async () => {
    if (!seleccionada) return
    setProcesando(true)
    setError(null)
    setResultado(null)
    try {
      const res = await fetch('/api/google/slides/slides-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationId: seleccionada.id,
          nombreSheet: `Datos de: ${seleccionada.name}`,
        }),
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error || 'Error al extraer datos')
      setResultado(data.datos)
      toast.success('Sheet creado exitosamente')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      toast.error('Error al crear el Sheet')
    } finally {
      setProcesando(false)
    }
  }

  const filtradas = presentaciones.filter(p =>
    p.name.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
            Slides → Sheet
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Extrae los textos de una presentación de Google Slides y crea un Google Sheet
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {resultado ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Se extrajeron {resultado.slides} slides y se creó el Sheet "{resultado.titulo}"
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => window.open(resultado.url, '_blank')}
                >
                  Abrir en Google Sheets
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setResultado(null)
                    setSeleccionada(null)
                  }}
                >
                  Extraer otra presentación
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar presentaciones..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={cargarPresentaciones}
                  disabled={cargando}
                  startIcon={<RefreshIcon />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Recargar
                </Button>
              </Stack>

              {cargando ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : filtradas.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  {presentaciones.length === 0 ? 'No se encontraron presentaciones' : 'Sin resultados para la búsqueda'}
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
                  <Stack spacing={1}>
                    {filtradas.map((pres) => (
                      <Card
                        key={pres.id}
                        sx={{
                          border: 2,
                          borderColor: seleccionada?.id === pres.id ? 'primary.main' : 'divider',
                          transition: 'all 0.15s',
                        }}
                      >
                        <CardActionArea onClick={() => setSeleccionada(pres)} sx={{ p: 1.5 }}>
                          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '0 !important' }}>
                            <SlideshowIcon color={seleccionada?.id === pres.id ? 'primary' : 'action'} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body1" fontWeight={500} noWrap>{pres.name}</Typography>
                              {pres.lastModified && (
                                <Typography variant="caption" color="text.secondary">
                                  Modificado: {new Date(pres.lastModified).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!seleccionada || procesando}
                onClick={extraer}
                startIcon={procesando ? <CircularProgress size={20} /> : <TableChartIcon />}
              >
                {procesando
                  ? 'Extrayendo textos...'
                  : seleccionada
                    ? `Extraer textos de "${seleccionada.name}" a Sheet`
                    : 'Selecciona una presentación'}
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
