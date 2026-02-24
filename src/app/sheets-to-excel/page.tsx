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
} from '@mui/material'
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  TableChart as TableChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

interface GoogleSheet {
  id: string
  name: string
  iconUrl?: string
  lastModified?: string
}

export default function SheetsToExcelPage() {
  const { data: session, status } = useSession()
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<GoogleSheet | null>(null)

  useEffect(() => {
    if (status === 'authenticated') cargarSheets()
  }, [status])

  const cargarSheets = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/google/documents?type=sheets')
      if (!res.ok) {
        if (res.status === 401) { signIn('google'); return }
        throw new Error('Error al cargar hojas de cálculo')
      }
      const data = await res.json()
      const docs = (data.documents || [])
        .filter((d: { type: string }) => d.type === 'sheets')
        .map((d: { id: string; name: string; iconUrl?: string; lastModified?: string }) => ({
          id: d.id,
          name: d.name,
          iconUrl: d.iconUrl,
          lastModified: d.lastModified,
        }))
      setSheets(docs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setCargando(false)
    }
  }

  const descargar = async () => {
    if (!seleccionado) return
    setDescargando(true)
    try {
      const url = `/api/google/sheets/export-excel?spreadsheetId=${seleccionado.id}&nombre=${encodeURIComponent(seleccionado.name)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = seleccionado.name.replace(/[^a-zA-Z0-9_\-\s.áéíóúñ]/gi, '_') + '.xlsx'
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Archivo descargado')
    } catch (e) {
      toast.error('Error al descargar el archivo')
    } finally {
      setDescargando(false)
    }
  }

  const sheetsFiltrados = sheets.filter(s =>
    s.name.toLowerCase().includes(busqueda.toLowerCase())
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
            Sheets → Excel
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Selecciona un Google Sheet y descárgalo como archivo Excel (.xlsx)
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar hojas de cálculo..."
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
              onClick={cargarSheets}
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
          ) : sheetsFiltrados.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              {sheets.length === 0 ? 'No se encontraron hojas de cálculo' : 'Sin resultados para la búsqueda'}
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
              <Stack spacing={1}>
                {sheetsFiltrados.map((sheet) => (
                  <Card
                    key={sheet.id}
                    sx={{
                      border: 2,
                      borderColor: seleccionado?.id === sheet.id ? 'primary.main' : 'divider',
                      transition: 'all 0.15s',
                    }}
                  >
                    <CardActionArea onClick={() => setSeleccionado(sheet)} sx={{ p: 1.5 }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '0 !important' }}>
                        <TableChartIcon color={seleccionado?.id === sheet.id ? 'primary' : 'action'} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={500} noWrap>{sheet.name}</Typography>
                          {sheet.lastModified && (
                            <Typography variant="caption" color="text.secondary">
                              Modificado: {new Date(sheet.lastModified).toLocaleDateString()}
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
            disabled={!seleccionado || descargando}
            onClick={descargar}
            startIcon={descargando ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {descargando ? 'Descargando...' : seleccionado ? `Descargar "${seleccionado.name}" como Excel` : 'Selecciona un Sheet'}
          </Button>
        </Paper>
      </Container>
    </Box>
  )
}
