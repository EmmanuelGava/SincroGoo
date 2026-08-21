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
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
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
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importAnchor, setImportAnchor] = useState<null | HTMLElement>(null);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [sheets, setSheets] = useState<Array<{ id: string; name: string }>>([]);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
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

  const applyImportResult = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportMsg(typeof data.error === 'string' ? data.error : 'No se pudo importar');
      return;
    }
    setImportMsg(
      `Importados ${data.created || 0} nuevos, ${data.updated || 0} actualizados`
      + (data.skipped ? `, ${data.skipped} omitidos` : '')
      + '.'
    );
    await cargar(q);
  };

  const importFromCsv = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const form = new FormData();
      form.append('source', 'csv');
      form.append('file', file);
      const res = await fetch('/api/contactos/import', { method: 'POST', body: form });
      await applyImportResult(res);
    } catch {
      setImportMsg('No se pudo importar el CSV');
    } finally {
      setImporting(false);
    }
  };

  const importFromGoogle = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/contactos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'google' }),
      });
      await applyImportResult(res);
    } catch {
      setImportMsg('No se pudo importar Google Contacts');
    } finally {
      setImporting(false);
    }
  };

  const openSheetsPicker = async () => {
    setSheetsOpen(true);
    setSheetsError(null);
    setSheets([]);
    try {
      const res = await fetch('/api/google/documents?type=sheets', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSheetsError(typeof data.error === 'string' ? data.error : 'No se pudieron listar los Sheets');
        return;
      }
      setSheets(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      setSheetsError('No se pudieron listar los Sheets');
    }
  };

  const importFromSheet = async (spreadsheetId: string) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/contactos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'sheets', spreadsheetId }),
      });
      await applyImportResult(res);
      setSheetsOpen(false);
    } catch {
      setImportMsg('No se pudo importar el Sheet');
    } finally {
      setImporting(false);
    }
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
        <Button
          variant="outlined"
          onClick={(e) => setImportAnchor(e.currentTarget)}
          disabled={importing}
          sx={{ flexShrink: 0 }}
        >
          {importing ? 'Importando…' : 'Importar'}
        </Button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void importFromCsv(file);
          }}
        />
        <Menu
          anchorEl={importAnchor}
          open={Boolean(importAnchor)}
          onClose={() => setImportAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setImportAnchor(null);
              csvInputRef.current?.click();
            }}
          >
            CSV
          </MenuItem>
          <MenuItem
            onClick={() => {
              setImportAnchor(null);
              void openSheetsPicker();
            }}
          >
            Google Sheet
          </MenuItem>
          <MenuItem
            onClick={() => {
              setImportAnchor(null);
              void importFromGoogle();
            }}
          >
            Google Contacts
          </MenuItem>
        </Menu>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {importMsg ? <Alert severity="info" onClose={() => setImportMsg(null)}>{importMsg}</Alert> : null}

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

      <Dialog open={sheetsOpen} onClose={() => !importing && setSheetsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar desde Google Sheet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            La primera fila tiene que ser encabezados: nombre, telefono, email, empresa.
          </Typography>
          {sheetsError ? <Alert severity="error">{sheetsError}</Alert> : null}
          {!sheetsError && sheets.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {sheets.map((sheet) => (
                <ListItemButton
                  key={sheet.id}
                  disabled={importing}
                  onClick={() => void importFromSheet(sheet.id)}
                >
                  <ListItemText primary={sheet.name} />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSheetsOpen(false)} disabled={importing}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
