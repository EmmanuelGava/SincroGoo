'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  TextField, Stack, Card, CardActionArea, CardContent, InputAdornment,
  Chip, List, ListItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material'
import {
  CleaningServices as CleanIcon, Search as SearchIcon,
  TableChart as TableChartIcon, Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon, Warning as WarningIcon,
  ContentCopy as DuplicateIcon, TextFields as TextIcon,
  Phone as PhoneIcon, Email as EmailIcon, SpaceBar as SpaceIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { toast } from 'sonner'

interface GoogleSheet { id: string; name: string; lastModified?: string }

interface Problema {
  tipo: string
  descripcion: string
  columna?: string
  filas: number
  ejemplos: string[]
}

const iconoPorTipo: Record<string, React.ReactNode> = {
  duplicados: <DuplicateIcon fontSize="small" color="error" />,
  espacios: <SpaceIcon fontSize="small" color="warning" />,
  telefonos: <PhoneIcon fontSize="small" color="info" />,
  emails: <EmailIcon fontSize="small" color="error" />,
  capitalizacion: <TextIcon fontSize="small" color="warning" />,
  vacias: <WarningIcon fontSize="small" color="action" />,
}

export default function CleanDataPage() {
  const { data: session, status } = useSession()
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [cargando, setCargando] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<GoogleSheet | null>(null)
  const [problemas, setProblemas] = useState<Problema[] | null>(null)
  const [infoSheet, setInfoSheet] = useState<{ totalFilas: number; totalColumnas: number } | null>(null)
  const [resultado, setResultado] = useState<{ url: string; filasOriginales: number; filasLimpias: number; eliminadas: number } | null>(null)

  useEffect(() => {
    if (status === 'authenticated') cargarSheets()
  }, [status])

  const cargarSheets = async () => {
    setCargando(true); setError(null)
    try {
      const res = await fetch('/api/google/documents?type=sheets')
      if (!res.ok) { if (res.status === 401) { signIn('google'); return } throw new Error('Error') }
      const data = await res.json()
      setSheets((data.documents || []).filter((d: any) => d.type === 'sheets').map((d: any) => ({
        id: d.id, name: d.name, lastModified: d.lastModified,
      })))
    } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setCargando(false) }
  }

  const analizar = async () => {
    if (!seleccionado) return
    setAnalizando(true); setError(null); setProblemas(null); setResultado(null)
    try {
      const res = await fetch('/api/google/sheets/clean-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: seleccionado.id }),
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setProblemas(data.datos.problemas)
      setInfoSheet({ totalFilas: data.datos.totalFilas, totalColumnas: data.datos.totalColumnas })
      if (data.datos.problemas.length === 0) toast.success('No se encontraron problemas')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); toast.error('Error al analizar') }
    finally { setAnalizando(false) }
  }

  const aplicar = async () => {
    if (!seleccionado) return
    setAplicando(true); setError(null)
    try {
      const res = await fetch('/api/google/sheets/clean-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: seleccionado.id, accion: 'aplicar' }),
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setResultado(data.datos)
      toast.success('Datos limpiados exitosamente')
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); toast.error('Error al limpiar') }
    finally { setAplicando(false) }
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
            Limpiar datos
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Analiza un Google Sheet, detecta problemas y crea una copia limpia
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {resultado ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Copia limpia creada: {resultado.filasLimpias} filas ({resultado.eliminadas} eliminadas)
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={() => window.open(resultado.url, '_blank')}>
                  Abrir Sheet limpio
                </Button>
                <Button variant="outlined" onClick={() => { setResultado(null); setProblemas(null); setSeleccionado(null) }}>
                  Analizar otro
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
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
              ) : (
                <Box sx={{ maxHeight: 250, overflow: 'auto', mb: 3 }}>
                  <Stack spacing={0.5}>
                    {filtrados.map((sheet) => (
                      <Card key={sheet.id} sx={{ border: 2, borderColor: seleccionado?.id === sheet.id ? 'primary.main' : 'divider', transition: 'all 0.15s' }}>
                        <CardActionArea onClick={() => { setSeleccionado(sheet); setProblemas(null) }} sx={{ p: 1 }}>
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

              <Button fullWidth variant="outlined" size="large" disabled={!seleccionado || analizando}
                onClick={analizar} startIcon={analizando ? <CircularProgress size={20} /> : <SearchIcon />} sx={{ mb: 2 }}
              >
                {analizando ? 'Analizando...' : seleccionado ? `Analizar "${seleccionado.name}"` : 'Selecciona un Sheet'}
              </Button>

              {problemas !== null && (
                <>
                  <Divider sx={{ my: 2 }} />
                  {infoSheet && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {infoSheet.totalFilas} filas, {infoSheet.totalColumnas} columnas
                    </Typography>
                  )}
                  {problemas.length === 0 ? (
                    <Alert severity="success" icon={<CheckIcon />}>
                      No se encontraron problemas en los datos
                    </Alert>
                  ) : (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        {problemas.length} problema(s) detectado(s):
                      </Typography>
                      <List dense>
                        {problemas.map((p, i) => (
                          <ListItem key={i} sx={{ alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                              {iconoPorTipo[p.tipo] || <WarningIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={p.descripcion}
                              secondary={
                                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">{p.filas} filas afectadas</Typography>
                                  {p.ejemplos.map((ej, j) => (
                                    <Typography key={j} variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{ej}</Typography>
                                  ))}
                                </Stack>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                      <Button fullWidth variant="contained" color="primary" size="large"
                        disabled={aplicando} onClick={aplicar}
                        startIcon={aplicando ? <CircularProgress size={20} /> : <CleanIcon />}
                      >
                        {aplicando ? 'Limpiando...' : 'Crear copia limpia'}
                      </Button>
                      <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 1 }}>
                        Se crea una copia nueva. El Sheet original no se modifica.
                      </Typography>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  )
}
