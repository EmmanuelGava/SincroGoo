'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

export default function InvitarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const aceptar = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de invitación en el enlace.');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/organizacion/aceptar-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'No se pudo aceptar la invitación');
        return;
      }
      setStatus('ok');
      setMessage('¡Te uniste al equipo! Redirigiendo al CRM…');
      window.setTimeout(() => router.replace('/crm'), 1500);
    } catch {
      setStatus('error');
      setMessage('Error de red al aceptar la invitación');
    }
  };

  useEffect(() => {
    if (token) void aceptar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <EncabezadoSistema />
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Unirse al equipo
          </Typography>
          {!token && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Este enlace no incluye un token válido. Pedile al administrador un nuevo enlace.
            </Alert>
          )}
          {status === 'loading' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={24} />
              <Typography>Procesando invitación…</Typography>
            </Box>
          )}
          {status === 'ok' && <Alert severity="success">{message}</Alert>}
          {status === 'error' && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Button variant="contained" onClick={() => void aceptar()} disabled={!token}>
                Reintentar
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
