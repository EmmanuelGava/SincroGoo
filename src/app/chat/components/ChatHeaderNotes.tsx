'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useWaTheme } from '@/app/chat/chatTheme';

export type ChatHeaderNote = {
  id: string;
  contenido: string;
  fecha_mensaje: string;
  autor_nombre?: string | null;
  autor_usuario_id?: string | null;
};

interface ChatHeaderNotesProps {
  conversacionId: string;
  refreshKey?: number;
}

export default function ChatHeaderNotes({ conversacionId, refreshKey = 0 }: ChatHeaderNotesProps) {
  const WA = useWaTheme();
  const [notas, setNotas] = useState<ChatHeaderNote[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chat/conversaciones/${encodeURIComponent(conversacionId)}/nota-interna`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      if (res.ok) {
        setNotas(Array.isArray(data.notas) ? data.notas : []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [conversacionId]);

  useEffect(() => {
    void loadNotas();
  }, [loadNotas, refreshKey]);

  const removeNota = async (id: string) => {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch(
        `/api/chat/conversaciones/${encodeURIComponent(conversacionId)}/nota-interna?nota_id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) await loadNotas();
    } catch {
      await loadNotas();
    }
  };

  if (loading && notas.length === 0) return null;
  if (notas.length === 0) return null;

  return (
    <Box
      sx={{
        px: 2,
        pb: 1,
        pt: 0.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        maxHeight: 120,
        overflowY: 'auto',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: WA.muted,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: '0.7rem',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 12 }} />
        Notas de equipo — no se envían al cliente
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {notas.map((nota) => (
          <Box
            key={nota.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              px: 1,
              py: 0.6,
              borderRadius: 1,
              bgcolor: 'rgba(255, 235, 59, 0.22)',
              border: '1px solid rgba(255, 193, 7, 0.45)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {nota.autor_nombre ? (
                <Typography
                  variant="caption"
                  sx={{ color: WA.muted, display: 'block', fontSize: '0.65rem', mb: 0.25 }}
                >
                  {nota.autor_nombre}
                  {' · '}
                  {new Date(nota.fecha_mensaje).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              ) : null}
              <Typography
                variant="body2"
                sx={{
                  color: WA.text,
                  fontSize: '0.8rem',
                  lineHeight: 1.35,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {nota.contenido}
              </Typography>
            </Box>
            <Tooltip title="Quitar nota">
              <IconButton
                size="small"
                onClick={() => void removeNota(nota.id)}
                aria-label="Quitar nota"
                sx={{ color: WA.muted, mt: -0.25 }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
