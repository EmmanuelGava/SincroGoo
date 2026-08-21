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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { WA } from '@/app/chat/chatTheme';
import {
  CATEGORIA_LABEL,
  categoriaDeAtajo,
  type RespuestaCategoria,
  type RespuestaRapida,
} from '@/lib/chat/respuestasRapidas';

export function QuickReplyPicker({
  items,
  selectedIndex,
  onHover,
  onSelect,
  onManage,
}: {
  items: RespuestaRapida[];
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: RespuestaRapida) => void;
  onManage: () => void;
}) {
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
        zIndex: 20,
      }}
    >
      <Typography sx={{ px: 1.5, py: 0.75, fontSize: '0.75rem', color: WA.muted }}>
        Respuestas rápidas
      </Typography>
      {items.length === 0 ? (
        <Typography sx={{ px: 1.5, pb: 1, fontSize: '0.85rem', color: WA.muted }}>
          No hay coincidencias. Creá una con Gestionar.
        </Typography>
      ) : (
        items.map((item, index) => (
          <Box
            key={item.id}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            sx={{
              px: 1.5,
              py: 0.9,
              cursor: 'pointer',
              bgcolor: index === selectedIndex ? WA.selected : 'transparent',
              '&:hover': { bgcolor: WA.selected },
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: WA.accent }}>
              /{item.atajo}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: WA.muted }} noWrap>
              {item.texto}
            </Typography>
          </Box>
        ))
      )}
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
        Gestionar respuestas
      </Box>
    </Box>
  );
}

export function QuickReplyManager({
  open,
  onClose,
  items,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  items: RespuestaRapida[];
  onChanged: () => void;
}) {
  const [atajo, setAtajo] = useState('');
  const [texto, setTexto] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setAtajo('');
      setTexto('');
      setEditingId(null);
      setError(null);
    }
  }, [open]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/chat/respuestas-rapidas/${editingId}` : '/api/chat/respuestas-rapidas',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ atajo, texto }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar');
        return;
      }
      setAtajo('');
      setTexto('');
      setEditingId(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/chat/respuestas-rapidas/${id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Respuestas rápidas</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          En el chat escribí <strong>/</strong> y el atajo. Editá cualquier texto: son tuyos.
          Variables: {'{{nombre}}'}, {'{{telefono}}'} y {'{{producto}}'} (si no hay producto, queda [producto] para completar).
        </Typography>
        {(['venta', 'producto', 'general', 'custom'] as const).map((categoria) => {
          const group = items.filter((item) => categoriaDeAtajo(item.atajo) === categoria);
          if (group.length === 0) return null;
          return (
            <Box key={categoria} sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {CATEGORIA_LABEL[categoria as RespuestaCategoria | 'custom']}
              </Typography>
              {group.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => {
                      setEditingId(item.id);
                      setAtajo(item.atajo);
                      setTexto(item.texto);
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: WA.accent }}>/{item.atajo}</Typography>
                    <Typography variant="body2" noWrap>{item.texto}</Typography>
                  </Box>
                  <IconButton size="small" aria-label={`Borrar /${item.atajo}`} onClick={() => void remove(item.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          );
        })}
        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
          <TextField
            label="Atajo"
            placeholder="precio o mi_atajo"
            value={atajo}
            onChange={(e) => setAtajo(e.target.value)}
            size="small"
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>/</Typography> }}
          />
          <TextField
            label="Texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            size="small"
            multiline
            minRows={2}
            placeholder="Hola {{nombre}}, el precio de {{producto}} es $____"
          />
          {error ? (
            <Typography color="error" variant="caption">{error}</Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => void save()}
          disabled={saving}
        >
          {editingId ? 'Guardar' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
