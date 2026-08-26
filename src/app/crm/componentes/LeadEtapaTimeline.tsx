'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { formatEtapaHistorialLine, type EtapaHistorialRow } from '@/lib/crm/leadEtapaHistorial';

type LeadEtapaTimelineProps = {
  leadId: string;
  compact?: boolean;
};

export default function LeadEtapaTimeline({ leadId, compact = false }: LeadEtapaTimelineProps) {
  const [historial, setHistorial] = useState<EtapaHistorialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/etapa-historial`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial');
        if (!cancelled) {
          setHistorial(Array.isArray(data.historial) ? data.historial : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar historial');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: compact ? 1 : 2 }}>
        <CircularProgress size={compact ? 20 : 28} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="warning" sx={{ my: 1 }}>{error}</Alert>;
  }

  return (
    <Box>
      <Typography
        variant={compact ? 'subtitle2' : 'h6'}
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
      >
        <HistoryIcon fontSize="small" color="primary" />
        Historial de etapas
      </Typography>
      {historial.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin movimientos de etapa
        </Typography>
      ) : (
        <List dense disablePadding>
          {historial.map((row) => (
            <ListItem key={`${row.fecha}-${row.estado_nuevo_nombre}`} disableGutters sx={{ py: 0.5 }}>
              <ListItemText
                primary={formatEtapaHistorialLine(row)}
                secondary={new Date(row.fecha).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
