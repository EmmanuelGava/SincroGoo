'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import {
  CAMPO_TIPOS,
  type CampoDefinicion,
  type CampoEntidad,
  type CampoTipo,
} from '@/lib/crm/camposPersonalizados';

type Formulario = {
  id?: string;
  etiqueta: string;
  tipo: CampoTipo;
  opciones: string;
  mostrar_en_tarjeta: boolean;
};

const FORM_VACIO: Formulario = { etiqueta: '', tipo: 'texto', opciones: '', mostrar_en_tarjeta: false };

const tipoLabel = (tipo: CampoTipo) => CAMPO_TIPOS.find((t) => t.id === tipo)?.label || tipo;

export default function CamposPersonalizadosPage() {
  const [entidad, setEntidad] = useState<CampoEntidad>('lead');
  const [campos, setCampos] = useState<CampoDefinicion[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campos-personalizados', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los campos');
      setCampos(Array.isArray(data.campos) ? data.campos : []);
      setEsAdmin(Boolean(data.es_admin));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los campos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = campos.filter((c) => c.entidad === entidad).sort((a, b) => a.orden - b.orden);

  const abrirNuevo = () => {
    setFormError(null);
    setForm({ ...FORM_VACIO });
  };

  const abrirEdicion = (campo: CampoDefinicion) => {
    setFormError(null);
    setForm({
      id: campo.id,
      etiqueta: campo.etiqueta,
      tipo: campo.tipo,
      opciones: campo.opciones.join(', '),
      mostrar_en_tarjeta: campo.mostrar_en_tarjeta,
    });
  };

  const guardar = async () => {
    if (!form) return;
    setGuardando(true);
    setFormError(null);
    try {
      const body = form.id
        ? { etiqueta: form.etiqueta, opciones: form.opciones, mostrar_en_tarjeta: form.mostrar_en_tarjeta }
        : { entidad, ...form };
      const res = await fetch(form.id ? `/api/campos-personalizados/${form.id}` : '/api/campos-personalizados', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el campo');
      setForm(null);
      await cargar();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar el campo');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (campo: CampoDefinicion) => {
    if (!window.confirm(`¿Borrar el campo "${campo.etiqueta}"? Deja de mostrarse en todos los ${entidad === 'lead' ? 'leads' : 'contactos'}.`)) return;
    setError(null);
    const res = await fetch(`/api/campos-personalizados/${campo.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || 'No se pudo borrar el campo');
    await cargar();
  };

  const mover = async (index: number, delta: -1 | 1) => {
    const a = visibles[index];
    const b = visibles[index + delta];
    if (!a || !b) return;
    setError(null);
    const ordenA = a.orden === b.orden ? a.orden + delta : b.orden;
    const ordenB = a.orden;
    const results = await Promise.all([
      fetch(`/api/campos-personalizados/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden: ordenA }),
      }),
      fetch(`/api/campos-personalizados/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden: ordenB }),
      }),
    ]);
    if (results.some((r) => !r.ok)) setError('No se pudo cambiar el orden');
    await cargar();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <EncabezadoSistema />
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 4, px: 2, pt: '90px' }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon /> Campos personalizados
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Datos propios de tu negocio (rubro, CUIT, cantidad de empleados…) en cada lead o contacto. Los ve y completa todo el equipo.
        </Typography>

        <Tabs value={entidad} onChange={(_e, v: CampoEntidad) => setEntidad(v)} sx={{ mb: 2 }}>
          <Tab value="lead" label="Leads (deals)" />
          <Tab value="contacto" label="Contactos" />
        </Tabs>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {!loading && !esAdmin ? (
          <Alert severity="info" sx={{ mb: 2 }}>Solo un administrador puede crear o editar campos.</Alert>
        ) : null}

        <Paper sx={{ p: 2 }}>
          {loading ? (
            <Typography color="text.secondary">Cargando…</Typography>
          ) : visibles.length === 0 ? (
            <Typography color="text.secondary">
              Todavía no hay campos para {entidad === 'lead' ? 'leads' : 'contactos'}.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {visibles.map((campo, index) => (
                <Box
                  key={campo.id}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap>{campo.etiqueta}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {tipoLabel(campo.tipo)}
                      {campo.tipo === 'opcion' ? `: ${campo.opciones.join(', ')}` : ''}
                    </Typography>
                  </Box>
                  {campo.mostrar_en_tarjeta ? <Chip size="small" label="En tarjeta" /> : null}
                  {esAdmin ? (
                    <>
                      <IconButton size="small" aria-label="Subir" disabled={index === 0} onClick={() => void mover(index, -1)}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Bajar" disabled={index === visibles.length - 1} onClick={() => void mover(index, 1)}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Editar" onClick={() => abrirEdicion(campo)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="Borrar" onClick={() => void borrar(campo)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
          {esAdmin ? (
            <Button startIcon={<AddIcon />} onClick={abrirNuevo} sx={{ mt: 2 }}>
              Nuevo campo
            </Button>
          ) : null}
        </Paper>
      </Box>

      <Dialog open={Boolean(form)} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? 'Editar campo' : 'Nuevo campo'}</DialogTitle>
        <DialogContent>
          {form ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nombre"
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
                inputProps={{ maxLength: 60 }}
                autoFocus
                fullWidth
              />
              <TextField
                select
                label="Tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as CampoTipo })}
                disabled={Boolean(form.id)}
                helperText={form.id ? 'El tipo no se puede cambiar después de crearlo.' : undefined}
                fullWidth
              >
                {CAMPO_TIPOS.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
                ))}
              </TextField>
              {form.tipo === 'opcion' ? (
                <TextField
                  label="Opciones"
                  value={form.opciones}
                  onChange={(e) => setForm({ ...form, opciones: e.target.value })}
                  helperText="Separadas por coma. Ej: Gastronomía, Retail, Servicios"
                  fullWidth
                />
              ) : null}
              {entidad === 'lead' ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.mostrar_en_tarjeta}
                      onChange={(e) => setForm({ ...form, mostrar_en_tarjeta: e.target.checked })}
                    />
                  }
                  label="Mostrar en la tarjeta del Kanban"
                />
              ) : null}
              {formError ? <Alert severity="error">{formError}</Alert> : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void guardar()} disabled={guardando || !form?.etiqueta.trim()}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
