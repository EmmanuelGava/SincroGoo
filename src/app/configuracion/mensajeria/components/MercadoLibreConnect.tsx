'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

const ML_COLOR = '#FFE600';
const ML_TEXT = '#2D3277';

type Estado = {
  configurado: boolean;
  conectado: boolean;
  nickname: string | null;
  renovable: boolean;
  es_admin: boolean;
};

export default function MercadoLibreConnect() {
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/mercadolibre');
      if (res.ok) setEstado(await res.json());
    } catch {
      setError('No se pudo leer el estado de Mercado Libre');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const resultado = searchParams.get('mercadolibre');
    if (resultado === 'conectado') setAviso('Mercado Libre conectado. Las preguntas nuevas van a entrar al chat.');
    if (resultado === 'cancelado') setAviso('Conexión cancelada.');
    if (resultado === 'error') setError(searchParams.get('motivo') || 'No se pudo conectar Mercado Libre');
  }, [searchParams]);

  const conectar = async () => {
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/mercadolibre/connect');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo iniciar la conexión');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la conexión');
      setTrabajando(false);
    }
  };

  const desconectar = async () => {
    if (!window.confirm('¿Desconectar Mercado Libre? Los chats quedan guardados pero no entran preguntas nuevas.')) return;
    setTrabajando(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/mercadolibre', { method: 'DELETE' });
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
          <StorefrontIcon sx={{ color: ML_TEXT, bgcolor: ML_COLOR, borderRadius: 1, p: 0.5, fontSize: 32 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Mercado Libre</Typography>
            <Typography variant="body2" color="text.secondary">
              Preguntas de tus publicaciones en el mismo chat
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
              Vendedor: <strong>{estado.nickname}</strong>
            </Typography>
            {!estado.renovable && (
              <Alert severity="warning">
                La app de Mercado Libre no tiene el permiso <code>offline_access</code>: la conexión se corta a las 6 h.
              </Alert>
            )}
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
            Mercado Libre todavía no está habilitado en este servidor (faltan las credenciales de la app).
          </Alert>
        ) : !estado.es_admin ? (
          <Alert severity="info">Solo un administrador puede conectar Mercado Libre.</Alert>
        ) : (
          <Button
            variant="contained"
            startIcon={<StorefrontIcon />}
            onClick={conectar}
            disabled={trabajando}
            sx={{ bgcolor: ML_COLOR, color: ML_TEXT, '&:hover': { bgcolor: '#F5DC00' } }}
          >
            {trabajando ? 'Abriendo Mercado Libre…' : 'Conectar Mercado Libre'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
