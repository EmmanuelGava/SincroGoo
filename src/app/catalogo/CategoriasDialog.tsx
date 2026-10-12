'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  normalizeCategoriaSlug,
  type CategoriaCatalogo,
} from '@/lib/catalogo/catalogoCategorias';

type Draft = { nombre: string; slug: string; incluir: boolean };

function draftDe(cat: CategoriaCatalogo): Draft {
  return { nombre: cat.nombre, slug: cat.slug, incluir: cat.incluir_sin_stock_en_lista };
}

function cambio(cat: CategoriaCatalogo, draft: Draft): boolean {
  return (
    draft.nombre.trim() !== cat.nombre ||
    (normalizeCategoriaSlug(draft.slug) ?? '') !== cat.slug ||
    draft.incluir !== cat.incluir_sin_stock_en_lista
  );
}

export function CategoriasDialog({
  open,
  categorias,
  itemsPorCategoria,
  onClose,
  onChanged,
}: {
  open: boolean;
  categorias: CategoriaCatalogo[];
  itemsPorCategoria: Map<string, number>;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoSlug, setNuevoSlug] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDrafts(Object.fromEntries(categorias.map((c) => [c.id, draftDe(c)])));
    setError(null);
  }, [open, categorias]);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const leerError = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return typeof data.error === 'string' ? data.error : fallback;
  };

  const crear = async () => {
    setError(null);
    setBusyId('nuevo');
    try {
      const res = await fetch('/api/chat/catalogo/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre, slug: nuevoSlug || nuevoNombre }),
      });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo crear la categoría'));
        return;
      }
      setNuevoNombre('');
      setNuevoSlug('');
      setSlugTocado(false);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const guardar = async (cat: CategoriaCatalogo) => {
    const draft = drafts[cat.id];
    if (!draft) return;
    setError(null);
    setBusyId(cat.id);
    try {
      const res = await fetch(`/api/chat/catalogo/categorias/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: draft.nombre,
          slug: draft.slug,
          incluir_sin_stock_en_lista: draft.incluir,
        }),
      });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo guardar la categoría'));
        return;
      }
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const borrar = async (cat: CategoriaCatalogo) => {
    const usados = itemsPorCategoria.get(cat.slug) ?? 0;
    const aviso = usados > 0
      ? `¿Borrar "${cat.nombre}"? ${usados} ítem(s) quedan sin categoría.`
      : `¿Borrar "${cat.nombre}"?`;
    if (!window.confirm(aviso)) return;
    setError(null);
    setBusyId(cat.id);
    try {
      const res = await fetch(`/api/chat/catalogo/categorias/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo borrar la categoría'));
        return;
      }
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const slugNuevoPreview = normalizeCategoriaSlug(nuevoSlug || nuevoNombre);

  return (
    <Dialog open={open} onClose={() => !busyId && onClose()} fullWidth maxWidth="md">
      <DialogTitle>Categorías</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            El slug es el atajo del chat (<b>/slug</b>) y la lista de precios. Si cambiás el slug, se
            actualizan todos los ítems de esa categoría.
          </Typography>
          {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
            <TextField
              label="Nueva categoría"
              size="small"
              value={nuevoNombre}
              onChange={(e) => {
                setNuevoNombre(e.target.value);
                if (!slugTocado) setNuevoSlug('');
              }}
              placeholder="Vapers"
              fullWidth
            />
            <TextField
              label="Slug"
              size="small"
              value={slugTocado ? nuevoSlug : slugNuevoPreview ?? ''}
              onChange={(e) => {
                setSlugTocado(true);
                setNuevoSlug(e.target.value);
              }}
              helperText={slugNuevoPreview ? `/${slugNuevoPreview}` : ' '}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => void crear()}
              disabled={busyId !== null || nuevoNombre.trim().length < 2 || !slugNuevoPreview}
              sx={{ flexShrink: 0, mt: { sm: 0.25 } }}
            >
              Crear
            </Button>
          </Stack>

          {categorias.length === 0 ? (
            <Typography color="text.secondary">
              Todavía no hay categorías. También se crean solas al guardar un ítem con categoría.
            </Typography>
          ) : (
            categorias.map((cat) => {
              const draft = drafts[cat.id] ?? draftDe(cat);
              const dirty = cambio(cat, draft);
              const usados = itemsPorCategoria.get(cat.slug) ?? 0;
              return (
                <Box
                  key={cat.id}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                    <TextField
                      label="Nombre"
                      size="small"
                      value={draft.nombre}
                      onChange={(e) => setDraft(cat.id, { nombre: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Slug"
                      size="small"
                      value={draft.slug}
                      onChange={(e) => setDraft(cat.id, { slug: e.target.value })}
                      fullWidth
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={draft.incluir}
                          onChange={(e) => setDraft(cat.id, { incluir: e.target.checked })}
                        />
                      }
                      label="Mostrar sin stock"
                      sx={{ flexShrink: 0, mr: 0 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 56 }}>
                      {usados} ítem{usados === 1 ? '' : 's'}
                    </Typography>
                    <Button
                      size="small"
                      variant={dirty ? 'contained' : 'outlined'}
                      disabled={!dirty || busyId !== null}
                      onClick={() => void guardar(cat)}
                      sx={{ flexShrink: 0 }}
                    >
                      Guardar
                    </Button>
                    <Tooltip title="Borrar categoría">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyId !== null}
                          onClick={() => void borrar(cat)}
                          aria-label={`Borrar ${cat.nombre}`}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busyId !== null}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
