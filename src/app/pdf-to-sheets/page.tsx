'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  TextField, Stack, FormControlLabel, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material'
import {
  Upload as UploadIcon, PictureAsPdf as PdfIcon,
  OpenInNew as OpenInNewIcon, TableChart as TableChartIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

export default function PdfToSheetsPage() {
  const { data: session, status } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [nombre, setNombre] = useState('')
  const [modoTabla, setModoTabla] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    url: string; filas: number; columnas: number; paginas: number; preview: string[][]
  } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setNombre(f.name.replace(/\.pdf$/i, ''))
    setResultado(null); setError(null)
  }

  const convertir = async () => {
    if (!file) return
    setSubiendo(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombreSheet', nombre)
      formData.append('modoTabla', modoTabla.toString())

      const res = await fetch('/api/google/sheets/from-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setResultado(data.datos)
      toast.success(`PDF convertido: ${data.datos.filas} filas`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      toast.error('Error al convertir')
    } finally {
      setSubiendo(false)
    }
  }

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
            PDF → Sheets
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Extrae texto de un PDF y crea un Google Sheet con los datos
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {resultado ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                PDF convertido: {resultado.filas} filas, {resultado.columnas} columnas ({resultado.paginas} páginas)
              </Alert>

              {resultado.preview && resultado.preview.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 250 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {resultado.preview[0]?.map((h, i) => (
                          <TableCell key={i} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultado.preview.slice(1).map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => window.open(resultado.url, '_blank')}>
                  Abrir en Google Sheets
                </Button>
                <Button variant="outlined" onClick={() => { setResultado(null); setFile(null) }}>
                  Convertir otro PDF
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={3}>
              <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleFile} />
              <Button
                variant={file ? 'outlined' : 'contained'}
                startIcon={file ? <PdfIcon /> : <UploadIcon />}
                onClick={() => fileRef.current?.click()}
                fullWidth size="large"
              >
                {file ? file.name : 'Seleccionar archivo PDF'}
              </Button>

              {file && (
                <>
                  <TextField fullWidth size="small" label="Nombre del Sheet"
                    value={nombre} onChange={(e) => setNombre(e.target.value)}
                  />

                  <FormControlLabel
                    control={<Switch checked={modoTabla} onChange={(e) => setModoTabla(e.target.checked)} />}
                    label={
                      <Box>
                        <Typography variant="body2">Detectar tablas</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Intenta detectar columnas y separadores en el PDF
                        </Typography>
                      </Box>
                    }
                  />

                  <Button fullWidth variant="contained" size="large" disabled={subiendo}
                    onClick={convertir} startIcon={subiendo ? <CircularProgress size={20} /> : <TableChartIcon />}
                  >
                    {subiendo ? 'Extrayendo...' : 'Extraer y crear Sheet'}
                  </Button>
                </>
              )}
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
