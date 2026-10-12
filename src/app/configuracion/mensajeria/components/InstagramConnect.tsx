'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';

const IG_COLOR = '#E1306C';

type Estado = {
  configurado: boolean;
  conectado: boolean;
  username: string | null;
  token_expires_at: string | null;
  es_admin: boolean;
};

export default function InstagramConnect() {
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/instagram');
      if (res.ok) setEstado(await res.json());
    } catch {
      setError('No se pudo leer el estado de Instagram');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const resultado = searchParams.get('instagram');
    if (resultado === 'conectado') setAviso('Instagram conectado. Los DMs nuevos van a entrar al chat.');
    if (resultado === 'cancelado') setAviso('Conexión cancelada.');
    if (resultado === 'error') setError(searchParams.get('motivo') || 'No se pudo conectar Instagram');
  }, [searchParams]);

  const conectar = async () => {
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/instagram/connect');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo iniciar la conexión');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la conexión');
      setTrabajando(false);
    }
  };

  const desconectar = async () => {
    if (!window.confirm('¿Desconectar Instagram? Los chats quedan guardados pero no entran DMs nuevos.')) return;
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/instagram', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo desconectar');
      setAviso(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desconectar');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <InstagramIcon sx={{ color: IG_COLOR, fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Instagram DM</Typography>
            <Typography variant="body2" color="text.secondary">
              Mensajes directos de tu cuenta profesional en el mismo chat
            </Typography>
          </Box>
          {estado?.conectado && <Chip label="Conectado" color="success" size="small" />}
        </Box>

        {aviso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAviso(null)}>{aviso}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {!estado ? (
          <CircularProgress size={24} />
        ) : estado.conectado ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2">
              Cuenta: <strong>@{estado.username}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Instagram solo deja responder dentro de las 24 h desde el último mensaje del cliente.
            </Typography>
            {estado.es_admin && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={conectar} disabled={trabajando}>
                  Reconectar
                </Button>
                <Button color="error" onClick={desconectar} disabled={trabajando}>
                  Desconectar
                </Button>
              </Box>
            )}
          </Box>
        ) : !estado.configurado ? (
          <Alert severity="info">
            Instagram todavía no está habilitado en este servidor (faltan las credenciales de la app de Meta).
          </Alert>
        ) : !estado.es_admin ? (
          <Alert severity="info">Solo un administrador puede conectar Instagram.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Necesitás una cuenta de Instagram profesional (empresa o creador).
            </Typography>
            <Button
              variant="contained"
              startIcon={<InstagramIcon />}
              onClick={conectar}
              disabled={trabajando}
              sx={{ bgcolor: IG_COLOR, '&:hover': { bgcolor: '#C1275B' }, alignSelf: 'flex-start' }}
            >
              {trabajando ? 'Abriendo Instagram…' : 'Conectar Instagram'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
