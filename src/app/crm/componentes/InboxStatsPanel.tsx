'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
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
  esperandoSeguimiento: number;
  tiempoPrimeraRespuesta: FirstResponseStats;
  conversionPorEtapa: ConversionPorEtapa[];
  definitions?: {
    nuevas?: string;
    noRespondidas?: string;
    esperandoSeguimiento?: string;
    tiempoPrimeraRespuesta?: string;
    conversionPorEtapa?: string;
  };
  error?: string;
};

function CompactStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string | null;
}) {
  const theme = useTheme();
  const content = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0.5,
        px: 0.85,
        py: 0.35,
        borderRadius: 1,
        bgcolor: theme.palette.action.hover,
        borderLeft: accent ? `2px solid ${accent}` : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: '0.65rem', lineHeight: 1 }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{ fontSize: '0.75rem', lineHeight: 1, color: 'text.primary' }}
      >
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 28 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Stats…
        </Typography>
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>
        {error}
      </Typography>
    );
  }

  if (!data) return null;

  const medianLabel = formatDurationMs(data.tiempoPrimeraRespuesta.medianMs);
  const avgLabel = formatDurationMs(data.tiempoPrimeraRespuesta.averageMs);
  const samples = data.tiempoPrimeraRespuesta.sampleCount;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      flexWrap="wrap"
      useFlexGap
      alignItems="center"
      sx={{
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <CompactStat
        label="24h"
        value={data.nuevas24h}
        hint={data.definitions?.nuevas || 'Nuevas (24h)'}
      />
      <CompactStat
        label="7d"
        value={data.nuevas7d}
        hint={data.definitions?.nuevas || 'Nuevas (7d)'}
      />
      <CompactStat
        label="Sin resp."
        value={data.noRespondidas}
        hint={data.definitions?.noRespondidas}
      />
      <CompactStat
        label="Seguim."
        value={data.esperandoSeguimiento}
        hint={data.definitions?.esperandoSeguimiento}
        accent="#ed6c02"
      />
      <CompactStat
        label="1ª resp."
        value={medianLabel}
        hint={
          samples > 0
            ? `Mediana ${medianLabel} · promedio ${avgLabel} (${samples} conv., 7d). ${data.definitions?.tiempoPrimeraRespuesta || ''}`
            : data.definitions?.tiempoPrimeraRespuesta || 'Sin muestras en 7d'
        }
      />
      {data.conversionPorEtapa.length > 0 && (
        <>
          <Box
            sx={{
              width: '1px',
              alignSelf: 'stretch',
              bgcolor: theme.palette.divider,
              mx: 0.25,
              minHeight: 16,
            }}
          />
          {data.conversionPorEtapa.map((etapa: ConversionPorEtapa) => (
            <CompactStat
              key={etapa.estadoId}
              label={etapa.nombre}
              value={etapa.count}
              accent={etapa.color}
              hint={data.definitions?.conversionPorEtapa}
            />
          ))}
        </>
      )}
    </Stack>
  );
}
