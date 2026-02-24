'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  TextField, Stack, Card, CardActionArea, CardContent, InputAdornment,
  Chip, Divider, Stepper, Step, StepLabel,
} from '@mui/material'
import {
  Description as WordIcon, Search as SearchIcon, TableChart as TableChartIcon,
  Refresh as RefreshIcon, Upload as UploadIcon, Download as DownloadIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

interface GoogleSheet { id: string; name: string }

const pasos = ['Subir plantilla Word', 'Seleccionar Sheet', 'Generar documento']

export default function SheetsToWordPage() {
  const { data: session, status } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [paso, setPaso] = useState(0)
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [cargando, setCargando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [template, setTemplate] = useState<File | null>(null)
  const [seleccionado, setSeleccionado] = useState<GoogleSheet | null>(null)
  const [nombreDoc, setNombreDoc] = useState('Documento generado')
  const [placeholders, setPlaceholders] = useState<string[]>([])

  useEffect(() => {
    if (status === 'authenticated') cargarSheets()
  }, [status])

  const cargarSheets = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/google/documents?type=sheets')
      if (!res.ok) { if (res.status === 401) signIn('google'); return }
      const data = await res.json()
      setSheets((data.documents || []).filter((d: any) => d.type === 'sheets').map((d: any) => ({
        id: d.id, name: d.name,
      })))
    } catch { setError('Error al cargar sheets') }
    finally { setCargando(false) }
  }

  const handleTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTemplate(file)
    setNombreDoc(file.name.replace(/\.docx$/i, ''))

    try {
      const text = await file.text()
      const matches = text.match(/\{([^}]+)\}/g) || []
      const unique = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
      setPlaceholders(unique)
    } catch {
      setPlaceholders([])
    }

    setPaso(1)
  }

  const generar = async () => {
    if (!template || !seleccionado) return
    setGenerando(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('template', template)
      formData.append('spreadsheetId', seleccionado.id)
      formData.append('nombreDocumento', nombreDoc)

      const res = await fetch('/api/google/sheets/to-word', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
        throw new Error(err.error)
      }

      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${nombreDoc}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Documento descargado')
      setPaso(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      toast.error('Error al generar')
    } finally {
      setGenerando(false)
    }
  }

  const filtrados = sheets.filter(s => s.name.toLowerCase().includes(busqueda.toLowerCase()))

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
            Sheet → Word
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sube una plantilla Word con placeholders {'{columna}'} y genera documentos con datos de un Sheet
          </Typography>

          <Stepper activeStep={paso} sx={{ mb: 4 }}>
            {pasos.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {paso === 2 ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>Documento generado y descargado</Alert>
              <Button variant="outlined" onClick={() => { setPaso(0); setTemplate(null); setSeleccionado(null) }}>
                Generar otro documento
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <input ref={fileRef} type="file" accept=".docx" hidden onChange={handleTemplate} />
                <Button
                  variant={template ? 'outlined' : 'contained'}
                  startIcon={<UploadIcon />}
                  onClick={() => fileRef.current?.click()}
                  fullWidth
                  size="large"
                >
                  {template ? `Plantilla: ${template.name}` : 'Subir plantilla Word (.docx)'}
                </Button>
                {placeholders.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Placeholders detectados:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {placeholders.map(p => <Chip key={p} label={`{${p}}`} size="small" variant="outlined" />)}
                    </Stack>
                  </Box>
                )}
              </Box>

              {paso >= 1 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField fullWidth size="small" placeholder="Buscar sheets..."
                      value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    />
                    <Button variant="outlined" onClick={cargarSheets} disabled={cargando} startIcon={<RefreshIcon />} sx={{ whiteSpace: 'nowrap' }}>
                      Recargar
                    </Button>
                  </Stack>

                  {cargando ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                  ) : (
                    <Box sx={{ maxHeight: 250, overflow: 'auto', mb: 3 }}>
                      <Stack spacing={0.5}>
                        {filtrados.map((sheet) => (
                          <Card key={sheet.id} sx={{ border: 2, borderColor: seleccionado?.id === sheet.id ? 'primary.main' : 'divider', transition: 'all 0.15s' }}>
                            <CardActionArea onClick={() => setSeleccionado(sheet)} sx={{ p: 1 }}>
                              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '0 !important' }}>
                                <TableChartIcon color={seleccionado?.id === sheet.id ? 'primary' : 'action'} fontSize="small" />
                                <Typography variant="body2" fontWeight={500} noWrap>{sheet.name}</Typography>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <TextField fullWidth size="small" label="Nombre del documento" value={nombreDoc}
                    onChange={(e) => setNombreDoc(e.target.value)} sx={{ mb: 2 }}
                  />

                  <Button fullWidth variant="contained" size="large" disabled={!seleccionado || !template || generando}
                    onClick={generar} startIcon={generando ? <CircularProgress size={20} /> : <DownloadIcon />}
                  >
                    {generando ? 'Generando...' : 'Generar y descargar Word'}
                  </Button>
                </>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
