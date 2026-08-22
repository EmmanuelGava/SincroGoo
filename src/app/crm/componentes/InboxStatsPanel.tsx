'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  formatDurationMs,
  type ConversionPorEtapa,
  type FirstResponseStats,
} from '@/lib/crm/inboxStats';

type InboxStatsResponse = {
  nuevas24h: number;
  nuevas7d: number;
  noRespondidas: number;
  tiempoPrimeraRespuesta: FirstResponseStats;
  conversionPorEtapa: ConversionPorEtapa[];
  definitions?: {
    nuevas?: string;
    noRespondidas?: string;
    tiempoPrimeraRespuesta?: string;
    conversionPorEtapa?: string;
  };
  error?: string;
};

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  const theme = useTheme();
  const content = (
    <Box
      sx={{
        minWidth: 88,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 0.25, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );

  if (!hint) return content;
  return (
    <Tooltip title={hint} arrow enterDelay={400}>
      {content}
    </Tooltip>
  );
}

export default function InboxStatsPanel() {
  const theme = useTheme();
  const [data, setData] = useState<InboxStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/crm/stats', { cache: 'no-store' });
      const json = (await res.json()) as InboxStatsResponse;
      if (!res.ok) {
        setError(json.error || 'No se pudieron cargar las stats');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('No se pudieron cargar las stats');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Cargando stats del inbox…
        </Typography>
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Typography variant="caption" color="error" sx={{ mb: 1.5, display: 'block' }}>
        {error}
      </Typography>
    );
  }

  if (!data) return null;

  const medianLabel = formatDurationMs(data.tiempoPrimeraRespuesta.medianMs);
  const avgLabel = formatDurationMs(data.tiempoPrimeraRespuesta.averageMs);
  const samples = data.tiempoPrimeraRespuesta.sampleCount;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        useFlexGap
      >
        <StatCell
          label="Nuevas (24h)"
          value={data.nuevas24h}
          hint={data.definitions?.nuevas || 'Actividad en las últimas 24h'}
        />
        <StatCell
          label="Nuevas (7d)"
          value={data.nuevas7d}
          hint={data.definitions?.nuevas || 'Actividad en los últimos 7 días'}
        />
        <StatCell
          label="Sin respuesta"
          value={data.noRespondidas}
          hint={data.definitions?.noRespondidas}
        />
        <StatCell
          label="1ª respuesta"
          value={medianLabel}
          hint={
            samples > 0
              ? `Mediana ${medianLabel} · promedio ${avgLabel} (${samples} conversaciones, 7d). ${data.definitions?.tiempoPrimeraRespuesta || ''}`
              : data.definitions?.tiempoPrimeraRespuesta || 'Sin muestras en 7d'
          }
        />
      </Stack>

      {data.conversionPorEtapa.length > 0 && (
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1.25 }}
          alignItems="center"
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Embudo:
          </Typography>
          {data.conversionPorEtapa.map((etapa) => (
            <Chip
              key={etapa.estadoId}
              size="small"
              label={`${etapa.nombre}: ${etapa.count}`}
              sx={{
                height: 24,
                bgcolor: etapa.color ? `${etapa.color}22` : theme.palette.action.hover,
                border: `1px solid ${etapa.color || theme.palette.divider}`,
                '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
              }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
