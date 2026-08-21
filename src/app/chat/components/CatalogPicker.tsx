'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { WA } from '@/app/chat/chatTheme';
import {
  CATALOGO_TIPO_LABEL,
  CATALOGO_TIPOS,
  type CatalogoItem,
  type CatalogoTipo,
} from '@/lib/chat/catalogoVentas';
import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';
import { FileUploadService } from '@/app/servicios/storage/FileUploadService';

export function CatalogPicker({
  items,
  onSelect,
  onManage,
}: {
  items: CatalogoItem[];
  onSelect: (item: CatalogoItem) => void;
  onManage: () => void;
}) {
  const [tipo, setTipo] = useState<CatalogoTipo | 'todos'>('todos');
  const visibles = tipo === 'todos' ? items : items.filter((item) => item.tipo === tipo);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 8,
        right: 8,
        mb: 0.5,
        bgcolor: WA.menu,
        color: WA.text,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        zIndex: 21,
        maxHeight: 360,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography sx={{ px: 1.5, pt: 1, fontSize: '0.75rem', color: WA.muted }}>
        Elegí un producto, presupuesto o propuesta
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, py: 1 }}>
        {(['todos', ...CATALOGO_TIPOS] as const).map((key) => (
          <Box
            key={key}
            onMouseDown={(e) => {
              e.preventDefault();
              setTipo(key);
            }}
            sx={{
              px: 1,
              py: 0.35,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.75rem',
              bgcolor: tipo === key ? WA.accent : WA.selected,
              color: tipo === key ? '#111b21' : WA.text,
            }}
          >
            {key === 'todos' ? 'Todos' : CATALOGO_TIPO_LABEL[key]}
          </Box>
        ))}
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {visibles.length === 0 ? (
          <Typography sx={{ px: 1.5, pb: 1.5, fontSize: '0.85rem', color: WA.muted }}>
            Todavía no hay ítems. Cargá uno para usarlo en la respuesta.
          </Typography>
        ) : (
          visibles.map((item) => (
            <Box
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              sx={{
                display: 'flex',
                gap: 1,
                px: 1.5,
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: WA.selected },
              }}
            >
              {item.imagen_url ? (
                <Box
                  component="img"
                  src={item.imagen_url}
                  alt=""
                  sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{
                  width: 44, height: 44, borderRadius: 1, bgcolor: WA.selected,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: WA.muted, textAlign: 'center', px: 0.3,
                }}>
                  {CATALOGO_TIPO_LABEL[item.tipo].slice(0, 4)}
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }} noWrap>
                  {item.nombre}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: WA.muted }} noWrap>
                  {CATALOGO_TIPO_LABEL[item.tipo]}
                  {item.precio != null ? ` · ${formatCatalogPrecio(item.precio)}` : ''}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
      <Box
        onMouseDown={(e) => {
          e.preventDefault();
          onManage();
        }}
        sx={{
          px: 1.5,
          py: 1,
          borderTop: '1px solid #2a3942',
          color: WA.muted,
          fontSize: '0.8rem',
          cursor: 'pointer',
          '&:hover': { color: WA.text },
        }}
      >
        Cargar al catálogo
      </Box>
    </Box>
  );
}

export function CatalogManager({
  open,
  onClose,
  items,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  items: CatalogoItem[];
  onChanged: () => void;
}) {
  const [tipo, setTipo] = useState<CatalogoTipo>('producto');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTipo('producto');
      setNombre('');
      setPrecio('');
      setDescripcion('');
      setImagenUrl(null);
      setArchivoUrl(null);
      setEditingId(null);
      setError(null);
    }
  }, [open]);

  const upload = async (file: File, kind: 'imagen' | 'archivo') => {
    const result = await FileUploadService.uploadFile(file, 'catalogo');
    if (!result.success || !result.url) {
      setError(result.error || 'No se pudo subir el archivo');
      return;
    }
    if (kind === 'imagen') setImagenUrl(result.url);
    else setArchivoUrl(result.url);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/chat/catalogo/${editingId}` : '/api/chat/catalogo',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            nombre,
            precio,
            descripcion,
            imagen_url: imagenUrl,
            archivo_url: archivoUrl,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar');
        return;
      }
      setNombre('');
      setPrecio('');
      setDescripcion('');
      setImagenUrl(null);
      setArchivoUrl(null);
      setEditingId(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/chat/catalogo/${id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Catálogo de venta</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Cargá productos, presupuestos o propuestas. En el chat, al usar /precio o /producto, los elegís desde el chip.
        </Typography>
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              gap: 1,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              onClick={() => {
                setEditingId(item.id);
                setTipo(item.tipo);
                setNombre(item.nombre);
                setPrecio(item.precio != null ? String(item.precio) : '');
                setDescripcion(item.descripcion || '');
                setImagenUrl(item.imagen_url);
                setArchivoUrl(item.archivo_url);
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{item.nombre}</Typography>
              <Typography variant="caption" color="text.secondary">
                {CATALOGO_TIPO_LABEL[item.tipo]}
                {item.precio != null ? ` · ${formatCatalogPrecio(item.precio)}` : ''}
              </Typography>
            </Box>
            <IconButton size="small" aria-label={`Borrar ${item.nombre}`} onClick={() => void remove(item.id)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
          <TextField
            select
            label="Tipo"
            size="small"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as CatalogoTipo)}
          >
            {CATALOGO_TIPOS.map((key) => (
              <MenuItem key={key} value={key}>{CATALOGO_TIPO_LABEL[key]}</MenuItem>
            ))}
          </TextField>
          <TextField label="Nombre" size="small" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <TextField label="Precio" size="small" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="12500" />
          <TextField
            label="Descripción"
            size="small"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            multiline
            minRows={2}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button component="label" size="small" variant="outlined">
              {imagenUrl ? 'Cambiar foto' : 'Subir foto'}
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, 'imagen');
                  e.target.value = '';
                }}
              />
            </Button>
            <Button component="label" size="small" variant="outlined">
              {archivoUrl ? 'Cambiar PDF' : 'Subir PDF'}
              <input
                hidden
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, 'archivo');
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>
          {error ? <Typography color="error" variant="caption">{error}</Typography> : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {editingId ? 'Guardar' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
