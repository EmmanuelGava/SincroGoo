'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  TextField, Stack,
} from '@mui/material'
import {
  Upload as UploadIcon, Slideshow as SlideshowIcon, OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

export default function PptxToSlidesPage() {
  const { data: session, status } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [nombre, setNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ presentationId: string; url: string; nombre: string } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setNombre(f.name.replace(/\.pptx$/i, ''))
    setResultado(null)
    setError(null)
  }

  const importar = async () => {
    if (!file) return
    setSubiendo(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombre', nombre)

      const res = await fetch('/api/google/slides/import-pptx', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setResultado(data.datos)
      toast.success('Presentación importada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      toast.error('Error al importar')
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
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
            PowerPoint → Slides
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sube un archivo .pptx y conviértelo a Google Slides
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {resultado ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                "{resultado.nombre}" importado exitosamente
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => window.open(resultado.url, '_blank')}>
                  Abrir en Google Slides
                </Button>
                <Button variant="outlined" onClick={() => { setResultado(null); setFile(null) }}>
                  Importar otro
                </Button>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={3}>
              <input ref={fileRef} type="file" accept=".pptx" hidden onChange={handleFile} />
              <Button
                variant={file ? 'outlined' : 'contained'}
                startIcon={<UploadIcon />}
                onClick={() => fileRef.current?.click()}
                fullWidth size="large"
              >
                {file ? file.name : 'Seleccionar archivo .pptx'}
              </Button>

              {file && (
                <>
                  <TextField fullWidth size="small" label="Nombre de la presentación"
                    value={nombre} onChange={(e) => setNombre(e.target.value)}
                  />
                  <Button fullWidth variant="contained" size="large" disabled={subiendo}
                    onClick={importar} startIcon={subiendo ? <CircularProgress size={20} /> : <SlideshowIcon />}
                  >
                    {subiendo ? 'Importando...' : 'Importar a Google Slides'}
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
