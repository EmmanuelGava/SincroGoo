'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

type Linea = {
  id?: string;
  catalogo_id: string | null;
  cantidad: number;
  precio: number | null;
  nombre: string;
};

type CatalogoOption = {
  id: string;
  nombre: string;
  precio: number | null;
};

type LeadLineasEditorProps = {
  leadId: string;
};

function nuevaLinea(): Linea {
  return { catalogo_id: null, cantidad: 1, precio: null, nombre: '' };
}

export default function LeadLineasEditor({ leadId }: LeadLineasEditorProps) {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setOk(false);
      try {
        const [lineasRes, catalogoRes] = await Promise.all([
          fetch(`/api/leads/${encodeURIComponent(leadId)}/lineas`, { cache: 'no-store' }),
          fetch('/api/chat/catalogo', { cache: 'no-store' }),
        ]);
        const lineasData = await lineasRes.json();
        const catalogoData = await catalogoRes.json();
        if (!lineasRes.ok) throw new Error(lineasData.error || 'No se pudieron cargar los ítems');
        if (cancelled) return;
        setLineas(Array.isArray(lineasData.lineas) ? lineasData.lineas : []);
        setCatalogo(
          Array.isArray(catalogoData.items)
            ? catalogoData.items.map((item: CatalogoOption) => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio ?? null,
              }))
            : [],
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar ítems');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const update = (index: number, patch: Partial<Linea>) => {
    setOk(false);
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, ...patch } : linea)));
  };

  const agregarProducto = (catalogoId: string) => {
    const item = catalogo.find((row) => row.id === catalogoId);
    if (!item) return;
    setOk(false);
    setLineas((prev) => {
      const idx = prev.findIndex((linea) => linea.catalogo_id === item.id);
      if (idx >= 0) {
        return prev.map((linea, i) => (i === idx ? { ...linea, cantidad: linea.cantidad + 1 } : linea));
      }
      return [
        ...prev,
        { catalogo_id: item.id, cantidad: 1, precio: item.precio, nombre: item.nombre },
      ];
    });
  };

  const guardar = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/lineas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineas: lineas.map((linea) => ({
            catalogo_id: linea.catalogo_id,
            cantidad: Number(linea.cantidad),
            precio: linea.precio,
            nombre: linea.nombre,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los ítems');
      setLineas(Array.isArray(data.lineas) ? data.lineas : []);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Ítems del deal</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        El stock en Propuesta y Ganado usa estas líneas. Si no hay ninguna, se infieren del chat.
      </Typography>
      {loading ? (
        <Typography variant="body2" color="text.secondary">Cargando ítems…</Typography>
      ) : (
        <Stack spacing={1}>
          {lineas.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin ítems. Se cargan al enviar un presupuesto desde el chat, o podés agregarlos acá.
            </Typography>
          ) : null}
          {lineas.map((linea, index) => (
            <Box key={linea.id || `${linea.catalogo_id || 'libre'}-${index}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                label="Nombre"
                value={linea.nombre}
                onChange={(e) => update(index, { nombre: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Cant."
                type="number"
                value={linea.cantidad}
                onChange={(e) => update(index, { cantidad: Number(e.target.value) })}
                inputProps={{ min: 1, step: 1 }}
                sx={{ width: 80 }}
              />
              <TextField
                size="small"
                label="Precio"
                type="number"
                value={linea.precio ?? ''}
                onChange={(e) => update(index, { precio: e.target.value === '' ? null : Number(e.target.value) })}
                sx={{ width: 110 }}
              />
              <IconButton type="button" aria-label="Quitar ítem" onClick={() => {
                setOk(false);
                setLineas((prev) => prev.filter((_, i) => i !== index));
              }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {catalogo.length > 0 ? (
              <TextField
                select
                size="small"
                label="Agregar del catálogo"
                value=""
                onChange={(e) => agregarProducto(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="" disabled>Elegir producto</MenuItem>
                {catalogo.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.nombre}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <Button type="button" size="small" onClick={() => { setOk(false); setLineas((prev) => [...prev, nuevaLinea()]); }}>
              Ítem a mano
            </Button>
            <Button type="button" size="small" variant="contained" disabled={saving} onClick={() => void guardar()}>
              {saving ? 'Guardando…' : 'Guardar ítems'}
            </Button>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {ok ? <Alert severity="success">Ítems guardados</Alert> : null}
        </Stack>
      )}
    </Box>
  );
}
