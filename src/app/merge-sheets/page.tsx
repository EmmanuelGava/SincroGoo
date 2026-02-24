'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  TextField, Stack, Card, CardActionArea, CardContent, InputAdornment,
  Checkbox, FormControlLabel, RadioGroup, Radio, FormControl, FormLabel,
  Chip, Divider,
} from '@mui/material'
import {
  MergeType as MergeIcon, Search as SearchIcon, TableChart as TableChartIcon,
  Refresh as RefreshIcon, OpenInNew as OpenInNewIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

interface GoogleSheet {
  id: string
  name: string
  lastModified?: string
}

export default function MergeSheetsPage() {
  const { data: session, status } = useSession()
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [cargando, setCargando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<GoogleSheet[]>([])
  const [nombreResultado, setNombreResultado] = useState('Datos fusionados')
  const [modo, setModo] = useState<'append' | 'merge_by_key'>('append')
  const [columnaKey, setColumnaKey] = useState('')
  const [resultado, setResultado] = useState<{ spreadsheetId: string; url: string; filas: number; columnas: number } | null>(null)

  useEffect(() => {
    if (status === 'authenticated') cargarSheets()
  }, [status])

  const cargarSheets = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/google/documents?type=sheets')
      if (!res.ok) { if (res.status === 401) { signIn('google'); return } throw new Error('Error') }
      const data = await res.json()
      setSheets((data.documents || []).filter((d: any) => d.type === 'sheets').map((d: any) => ({
        id: d.id, name: d.name, lastModified: d.lastModified,
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setCargando(false)
    }
  }

  const toggleSheet = (sheet: GoogleSheet) => {
    setSeleccionados(prev =>
      prev.find(s => s.id === sheet.id)
        ? prev.filter(s => s.id !== sheet.id)
        : [...prev, sheet]
    )
  }

  const fusionar = async () => {
    if (seleccionados.length < 2) return
    setProcesando(true)
    setError(null)
    setResultado(null)
    try {
      const res = await fetch('/api/google/sheets/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheets: seleccionados.map(s => ({ spreadsheetId: s.id, name: s.name })),
          nombreResultado,
          modo,
          columnaKey: modo === 'merge_by_key' ? columnaKey : undefined,
        }),
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setResultado(data.datos)
      toast.success(`Sheets fusionados: ${data.datos.filas} filas`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      toast.error('Error al fusionar')
    } finally {
      setProcesando(false)
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
            Fusionar Sheets
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Selecciona 2 o más Google Sheets y combínalos en uno nuevo
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {resultado ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Se fusionaron {resultado.filas} filas en {resultado.columnas} columnas
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => window.open(resultado.url, '_blank')}>
                  Abrir en Google Sheets
                </Button>
                <Button variant="outlined" onClick={() => { setResultado(null); setSeleccionados([]) }}>
                  Fusionar otros
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              {seleccionados.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                    Seleccionados ({seleccionados.length}):
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {seleccionados.map(s => (
                      <Chip key={s.id} label={s.name} onDelete={() => toggleSheet(s)} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

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
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
              ) : filtrados.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  {sheets.length === 0 ? 'No se encontraron sheets' : 'Sin resultados'}
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
                  <Stack spacing={0.5}>
                    {filtrados.map((sheet) => {
                      const isSelected = !!seleccionados.find(s => s.id === sheet.id)
                      return (
                        <Card key={sheet.id} sx={{ border: 2, borderColor: isSelected ? 'primary.main' : 'divider', transition: 'all 0.15s' }}>
                          <CardActionArea onClick={() => toggleSheet(sheet)} sx={{ p: 1 }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '0 !important' }}>
                              <Checkbox checked={isSelected} size="small" />
                              <TableChartIcon color={isSelected ? 'primary' : 'action'} fontSize="small" />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={500} noWrap>{sheet.name}</Typography>
                              </Box>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      )
                    })}
                  </Stack>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <TextField fullWidth size="small" label="Nombre del Sheet resultado" value={nombreResultado}
                onChange={(e) => setNombreResultado(e.target.value)} sx={{ mb: 2 }}
              />

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend" sx={{ fontSize: '0.85rem' }}>Modo de fusión</FormLabel>
                <RadioGroup row value={modo} onChange={(e) => setModo(e.target.value as any)}>
                  <FormControlLabel value="append" control={<Radio size="small" />} label="Apilar filas (append)" />
                  <FormControlLabel value="merge_by_key" control={<Radio size="small" />} label="Combinar por columna clave" />
                </RadioGroup>
              </FormControl>

              {modo === 'merge_by_key' && (
                <TextField fullWidth size="small" label="Nombre de la columna clave (ej: Email, ID)"
                  value={columnaKey} onChange={(e) => setColumnaKey(e.target.value)} sx={{ mb: 2 }}
                />
              )}

              <Button fullWidth variant="contained" size="large" disabled={seleccionados.length < 2 || procesando || !nombreResultado}
                onClick={fusionar} startIcon={procesando ? <CircularProgress size={20} /> : <MergeIcon />}
              >
                {procesando ? 'Fusionando...' : `Fusionar ${seleccionados.length} Sheets`}
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
