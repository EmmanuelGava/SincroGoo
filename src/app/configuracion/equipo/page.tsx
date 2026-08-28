'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { useOrganizacionMiembros, type MiembroOrganizacion } from '@/hooks/useOrganizacionMiembros';

export default function EquipoConfigPage() {
  const { miembros, rol, loading, reload } = useOrganizacionMiembros();
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteRol, setInviteRol] = useState<'agente' | 'admin'>('agente');
  const [inviting, setInviting] = useState(false);
  const [snack, setSnack] = useState('');

  const generarInvitacion = async () => {
    setInviting(true);
    try {
      const res = await fetch('/api/organizacion/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: inviteRol }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSnack(data.error || 'Error al invitar');
        return;
      }
      setInviteUrl(data.invite_url || '');
      setSnack('Enlace de invitación generado');
    } catch {
      setSnack('Error de red');
    } finally {
      setInviting(false);
    }
  };

  const copiarLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setSnack('Enlace copiado');
    } catch {
      setSnack('No se pudo copiar');
    }
  };

  const cambiarRol = async (usuarioId: string, nuevoRol: 'admin' | 'agente') => {
    const res = await fetch(`/api/organizacion/miembros/${encodeURIComponent(usuarioId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: nuevoRol }),
    });
    if (res.ok) {
      await reload();
      setSnack('Rol actualizado');
    } else {
      const data = await res.json();
      setSnack(data.error || 'Error al cambiar rol');
    }
  };

  const quitarMiembro = async (usuarioId: string) => {
    if (!window.confirm('¿Quitar a este miembro del equipo?')) return;
    const res = await fetch(`/api/organizacion/miembros/${encodeURIComponent(usuarioId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await reload();
      setSnack('Miembro quitado');
    } else {
      const data = await res.json();
      setSnack(data.error || 'Error al quitar miembro');
    }
  };

  const esAdmin = rol === 'admin';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <EncabezadoSistema />
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupOutlinedIcon /> Equipo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Miembros que comparten leads, chats y catálogo de tu negocio.
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Miembros ({miembros.length})
          </Typography>
          {loading ? (
            <Typography color="text.secondary">Cargando…</Typography>
          ) : (
            <List dense>
              {miembros.map((m: MiembroOrganizacion) => (
                <ListItem
                  key={m.usuario_id}
                  secondaryAction={
                    esAdmin ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={m.rol}
                            onChange={(e) =>
                              void cambiarRol(m.usuario_id, e.target.value as 'admin' | 'agente')
                            }
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="agente">Agente</MenuItem>
                          </Select>
                        </FormControl>
                        <IconButton
                          edge="end"
                          aria-label="Quitar miembro"
                          onClick={() => void quitarMiembro(m.usuario_id)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Chip size="small" label={m.rol === 'admin' ? 'Admin' : 'Agente'} />
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={m.avatar_url || undefined}>
                      {(m.nombre || m.email || '?')[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={m.nombre} secondary={m.email} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {esAdmin ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Invitar miembro
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Rol</InputLabel>
                <Select
                  label="Rol"
                  value={inviteRol}
                  onChange={(e) => setInviteRol(e.target.value as 'admin' | 'agente')}
                >
                  <MenuItem value="agente">Agente</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={() => void generarInvitacion()} disabled={inviting}>
                Generar enlace
              </Button>
            </Box>
            {inviteUrl && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField fullWidth size="small" value={inviteUrl} InputProps={{ readOnly: true }} />
                <IconButton onClick={() => void copiarLink()} aria-label="Copiar enlace">
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              El agente no puede conectar WhatsApp; solo los administradores escanean el QR.
            </Alert>
          </Paper>
        ) : (
          <Alert severity="info">Solo los administradores pueden invitar o gestionar roles.</Alert>
        )}
      </Box>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
