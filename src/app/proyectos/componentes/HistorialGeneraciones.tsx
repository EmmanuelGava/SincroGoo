'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Collapse,
  Alert,
} from '@mui/material'
import {
  OpenInNew as OpenInNewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  PlayCircle as RunningIcon,
} from '@mui/icons-material'

interface GeneracionJob {
  id: string
  proyecto_id: string | null
  estado: string
  presentation_id: string | null
  spreadsheet_id: string | null
  template_type: string | null
  total_filas: number
  filas_procesadas: number
  filas_error: number
  errores: any[] | null
  created_at: string | null
  updated_at: string | null
}

interface Props {
  proyectoId?: string
}

const estadoConfig: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default'; icon: React.ReactNode }> = {
  completado: { label: 'Completado', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  error: { label: 'Error', color: 'error', icon: <ErrorIcon fontSize="small" /> },
  procesando: { label: 'Procesando', color: 'info', icon: <RunningIcon fontSize="small" /> },
  pendiente: { label: 'Pendiente', color: 'warning', icon: <PendingIcon fontSize="small" /> },
}

export function HistorialGeneraciones({ proyectoId }: Props) {
  const [jobs, setJobs] = useState<GeneracionJob[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const url = proyectoId
        ? `/api/supabase/generacion-jobs?proyecto_id=${proyectoId}`
        : '/api/supabase/generacion-jobs'
      const res = await fetch(url)
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setJobs(data.datos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [proyectoId])

  const getEstado = (estado: string) => {
    return estadoConfig[estado] || { label: estado, color: 'default' as const, icon: null }
  }

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (jobs.length === 0) {
    return (
      <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
        No hay generaciones registradas
      </Typography>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Historial de generaciones
        </Typography>
        <Tooltip title="Recargar">
          <IconButton size="small" onClick={cargar}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Filas</TableCell>
              <TableCell align="center">OK</TableCell>
              <TableCell align="center">Errores</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => {
              const est = getEstado(job.estado)
              const tieneErrores = job.errores && Array.isArray(job.errores) && job.errores.length > 0
              return (
                <>
                  <TableRow key={job.id} hover>
                    <TableCell>
                      {tieneErrores && (
                        <IconButton size="small" onClick={() => setExpandido(expandido === job.id ? null : job.id)}>
                          {expandido === job.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString('es', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={est.label}
                        color={est.color}
                        size="small"
                        icon={est.icon as React.ReactElement}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">{job.total_filas}</TableCell>
                    <TableCell align="center">{job.filas_procesadas}</TableCell>
                    <TableCell align="center">
                      {job.filas_error > 0 ? (
                        <Chip label={job.filas_error} color="error" size="small" variant="outlined" />
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {job.template_type || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {job.presentation_id && (
                        <Tooltip title="Abrir presentación">
                          <IconButton
                            size="small"
                            onClick={() => window.open(`https://docs.google.com/presentation/d/${job.presentation_id}/edit`, '_blank')}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                  {tieneErrores && (
                    <TableRow key={`${job.id}-errores`}>
                      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                        <Collapse in={expandido === job.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: 'error.50' }}>
                            <Typography variant="subtitle2" gutterBottom>Detalle de errores:</Typography>
                            {(job.errores as any[]).slice(0, 10).map((err: any, i: number) => (
                              <Typography key={i} variant="caption" display="block" color="error.main">
                                Fila {err.fila ?? i + 1}: {err.error ?? err.message ?? JSON.stringify(err)}
                              </Typography>
                            ))}
                            {(job.errores as any[]).length > 10 && (
                              <Typography variant="caption" color="text.secondary">
                                ...y {(job.errores as any[]).length - 10} errores más
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
