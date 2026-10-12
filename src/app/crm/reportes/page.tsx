'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import {
  REPORTE_PERIODOS,
  formatearDuracion,
  type ReporteAgenteFila,
  type ReportePeriodo,
} from '@/lib/crm/reporteAgentes';

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const COLUMNAS: Array<{ id: string; label: string; ayuda: string }> = [
  { id: 'agente', label: 'Agente', ayuda: 'Miembro del equipo al que están asignados los leads y conversaciones.' },
  { id: 'abiertos', label: 'Leads abiertos', ayuda: 'Leads asignados hoy que no están en Ganado ni Perdido.' },
  { id: 'nuevos', label: 'Leads nuevos', ayuda: 'Leads creados en el período.' },
  { id: 'ganados', label: 'Ganados', ayuda: 'Leads que pasaron a Ganado en el período.' },
  { id: 'perdidos', label: 'Perdidos', ayuda: 'Leads que pasaron a Perdido en el período.' },
  { id: 'conversion', label: 'Conversión', ayuda: 'Ganados sobre el total de cierres (ganados + perdidos) del período.' },
  { id: 'valor', label: 'Valor ganado', ayuda: 'Suma del valor potencial de los leads ganados en el período.' },
  { id: 'conversaciones', label: 'Conversaciones', ayuda: 'Conversaciones asignadas con mensajes en el período.' },
  { id: 'enviados', label: 'Mensajes enviados', ayuda: 'Mensajes salientes en esas conversaciones.' },
  {
    id: 'respuesta',
    label: 'Tiempo de respuesta',
    ayuda: 'Mediana del tiempo entre el primer mensaje del cliente y la respuesta. Entre paréntesis, el promedio.',
  },
  { id: 'sin_responder', label: 'Sin responder', ayuda: 'Conversaciones no archivadas cuyo último mensaje es del cliente.' },
];

function Encabezado({ label, ayuda }: { label: string; ayuda: string }) {
  return (
    <Tooltip title={ayuda} placement="top">
      <span style={{ cursor: 'help' }}>{label}</span>
    </Tooltip>
  );
}

export default function ReportesAgentesPage() {
  const [dias, setDias] = useState<ReportePeriodo>(30);
  const [filas, setFilas] = useState<ReporteAgenteFila[]>([]);
  const [esAdmin, setEsAdmin] = useState(true);
  const [truncado, setTruncado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (periodo: ReportePeriodo) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/reportes/agentes?dias=${periodo}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el reporte');
      setFilas(Array.isArray(data.filas) ? data.filas : []);
      setEsAdmin(Boolean(data.es_admin));
      setTruncado(Boolean(data.truncado));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar(dias);
  }, [cargar, dias]);

  return (
    <>
      <EncabezadoSistema />
      <Box sx={{ pt: '86px', px: { xs: 2, md: 4 }, pb: 4, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button component={Link} href="/crm" size="small" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none' }}>
            Kanban
          </Button>
          <InsightsOutlinedIcon color="primary" />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={600}>
              Reportes por agente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {esAdmin
                ? 'Tiempo de respuesta y conversión de cada miembro del equipo.'
                : 'Tus números del período. Los administradores ven al equipo completo.'}
            </Typography>
          </Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={dias}
            onChange={(_e, value: ReportePeriodo | null) => value && setDias(value)}
          >
            {REPORTE_PERIODOS.map((p) => (
              <ToggleButton key={p} value={p} sx={{ textTransform: 'none', px: 1.5 }}>
                {p} días
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {truncado && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Hay muchos mensajes en el período: el tiempo de respuesta se calculó con los primeros 20.000.
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLUMNAS.map((c, i) => (
                  <TableCell key={c.id} align={i === 0 ? 'left' : 'right'} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Encabezado label={c.label} ayuda={c.ayuda} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length} align="center" sx={{ py: 4 }}>
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length} align="center" sx={{ py: 4 }}>
                    No hay datos para este período.
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((f) => (
                  <TableRow key={f.usuario_id ?? 'sin_asignar'} hover>
                    <TableCell sx={{ fontStyle: f.usuario_id ? 'normal' : 'italic' }}>{f.nombre}</TableCell>
                    <TableCell align="right">{f.leads_abiertos}</TableCell>
                    <TableCell align="right">{f.leads_nuevos}</TableCell>
                    <TableCell align="right">{f.ganados}</TableCell>
                    <TableCell align="right">{f.perdidos}</TableCell>
                    <TableCell align="right">
                      {f.tasa_conversion === null ? '—' : `${Math.round(f.tasa_conversion * 100)}%`}
                    </TableCell>
                    <TableCell align="right">{f.valor_ganado ? moneda.format(f.valor_ganado) : '—'}</TableCell>
                    <TableCell align="right">{f.conversaciones_activas}</TableCell>
                    <TableCell align="right">{f.mensajes_enviados}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {formatearDuracion(f.tiempo_respuesta_mediana_seg)}
                      {f.respuestas > 1 && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({formatearDuracion(f.tiempo_respuesta_promedio_seg)})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component="span"
                        variant="body2"
                        color={f.sin_responder > 0 ? 'warning.main' : 'text.primary'}
                        fontWeight={f.sin_responder > 0 ? 600 : 400}
                      >
                        {f.sin_responder}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Los resultados se atribuyen a quien tiene asignado el lead o la conversación hoy. El tiempo de respuesta
          cuenta horas no laborables.
        </Typography>
      </Box>
    </>
  );
}
