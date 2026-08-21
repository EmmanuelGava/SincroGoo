'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

export type Contacto = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  empresa: string | null;
  notas: string | null;
};

const EMPTY_COPY = 'No hay contactos. Creá uno o arrastrá un chat al Kanban.';

export function ContactosList() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const firstLoad = useRef(true);

  const cargar = useCallback(async (query: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contactos?q=${encodeURIComponent(query.trim())}`, {
        signal,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContactos([]);
        setError(typeof data.error === 'string' ? data.error : 'No se pudieron cargar los contactos');
        return;
      }
      setContactos(Array.isArray(data.contactos) ? data.contactos : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setContactos([]);
      setError('No se pudieron cargar los contactos');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (firstLoad.current) {
      firstLoad.current = false;
      void cargar(q, controller.signal);
      return () => controller.abort();
    }
    const timeout = window.setTimeout(() => {
      void cargar(q, controller.signal);
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [q, cargar]);

  const resetForm = () => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setFormError(null);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    resetForm();
  };

  const handleCreate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/contactos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono,
          email,
          empresa: '',
          notas: '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'No se pudo crear el contacto');
        return;
      }
      setDialogOpen(false);
      resetForm();
      await cargar(q);
    } catch {
      setFormError('No se pudo crear el contacto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          label="Buscar"
          placeholder="Nombre, teléfono o email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={() => setDialogOpen(true)} sx={{ flexShrink: 0 }}>
          Nuevo
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : contactos.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          {EMPTY_COPY}
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Empresa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contactos.map((contacto) => (
                <TableRow
                  key={contacto.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/contactos/${contacto.id}`)}
                >
                  <TableCell>{contacto.nombre}</TableCell>
                  <TableCell>{contacto.telefono || '—'}</TableCell>
                  <TableCell>{contacto.email || '—'}</TableCell>
                  <TableCell>{contacto.empresa || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo contacto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
