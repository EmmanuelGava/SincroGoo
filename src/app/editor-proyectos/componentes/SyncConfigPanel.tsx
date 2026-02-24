'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Checkbox,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import { toast } from 'sonner'

interface SyncConfig {
  sync_automatica: boolean
  sync_frecuencia: string
  ultima_sync: string | null
  sync_notificacion: { email: boolean; whatsapp: boolean }
}

interface Props {
  projectId: string
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

export function SyncConfigPanel({ projectId }: Props) {
  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargar()
  }, [projectId])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/supabase/projects/${projectId}/sync-config`)
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setConfig(data.datos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar configuración')
    } finally {
      setCargando(false)
    }
  }

  const guardar = async (updates: Partial<SyncConfig>) => {
    setGuardando(true)
    try {
      const res = await fetch(`/api/supabase/projects/${projectId}/sync-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!data.exito) throw new Error(data.error)
      setConfig(prev => prev ? { ...prev, ...updates } : prev)
      toast.success('Configuración guardada')
    } catch (e) {
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error || !config) {
    return <Alert severity="warning" sx={{ my: 1 }}>No se pudo cargar la configuración de sync</Alert>
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SyncIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>
          Sincronización automática
        </Typography>
        {guardando && <CircularProgress size={16} />}
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={config.sync_automatica}
            onChange={(e) => guardar({ sync_automatica: e.target.checked })}
            disabled={guardando}
          />
        }
        label={config.sync_automatica ? 'Activada' : 'Desactivada'}
      />

      {config.sync_automatica && (
        <Box sx={{ mt: 2 }}>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
              Frecuencia
            </FormLabel>
            <RadioGroup
              row
              value={config.sync_frecuencia}
              onChange={(e) => guardar({ sync_frecuencia: e.target.value })}
            >
              <FormControlLabel
                value="hora"
                control={<Radio size="small" />}
                label="Cada hora"
                disabled={guardando}
              />
              <FormControlLabel
                value="dia"
                control={<Radio size="small" />}
                label="Cada día"
                disabled={guardando}
              />
              <FormControlLabel
                value="semana"
                control={<Radio size="small" />}
                label="Cada semana"
                disabled={guardando}
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Notificaciones al completar
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={config.sync_notificacion?.email ?? false}
                  onChange={(e) =>
                    guardar({
                      sync_notificacion: {
                        ...config.sync_notificacion,
                        email: e.target.checked,
                      },
                    })
                  }
                  disabled={guardando}
                />
              }
              label="Email"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={config.sync_notificacion?.whatsapp ?? false}
                  onChange={(e) =>
                    guardar({
                      sync_notificacion: {
                        ...config.sync_notificacion,
                        whatsapp: e.target.checked,
                      },
                    })
                  }
                  disabled={guardando}
                />
              }
              label="WhatsApp"
            />
          </Box>

          {config.ultima_sync && (
            <Box sx={{ mt: 2 }}>
              <Chip
                icon={<ScheduleIcon />}
                label={`Última sync: ${formatTimeAgo(config.ultima_sync)}`}
                size="small"
                variant="outlined"
                color="info"
              />
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <WebhookInstructions />
        </Box>
      )}
    </Paper>
  )
}

function WebhookInstructions() {
  const [abierto, setAbierto] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const script = `function onEdit(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch("${baseUrl}/api/webhooks/sheet-change", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      spreadsheetId: ss.getId(),
      sheetName: e.source.getActiveSheet().getName()
    })
  });
}`

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
        onClick={() => setAbierto(!abierto)}
      >
        <CodeIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>
          {abierto ? 'Ocultar' : 'Sync por cambio en Sheet (Apps Script)'}
        </Typography>
      </Box>
      {abierto && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Pega este script en Extensiones → Apps Script de tu Google Sheet para sincronizar al editar:
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <Box
              component="pre"
              sx={{
                fontSize: '0.7rem',
                bgcolor: 'grey.100',
                p: 1.5,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 150,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {script}
            </Box>
            <Tooltip title="Copiar script">
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 4, right: 4 }}
                onClick={() => {
                  navigator.clipboard.writeText(script)
                  toast.success('Script copiado')
                }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  )
}
