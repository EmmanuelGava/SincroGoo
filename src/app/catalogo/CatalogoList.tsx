'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  CATALOGO_FILE_ACCEPT,
  CATALOGO_TIPO_LABEL,
  CATALOGO_TIPOS,
  type CatalogoItem,
  type CatalogoTipo,
} from '@/lib/chat/catalogoVentas';
import { CATALOGO_CSV_TEMPLATE } from '@/lib/chat/importCatalogo';
import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';
import { FileUploadService } from '@/app/servicios/storage/FileUploadService';

type FilterTipo = CatalogoTipo | 'todos';

function fileKindLabel(url: string | null) {
  if (!url) return '';
  const lower = url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) return 'Foto';
  if (/\.pdf(\?|$)/.test(lower)) return 'PDF';
  if (/\.(docx?|doc)(\?|$)/.test(lower)) return 'Word';
  if (/\.(xlsx?|xls)(\?|$)/.test(lower)) return 'Excel';
  if (/\.(pptx?|ppt)(\?|$)/.test(lower)) return 'PowerPoint';
  return 'Archivo';
}

export function CatalogoList() {
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tipoFilter, setTipoFilter] = useState<FilterTipo>('todos');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importAnchor, setImportAnchor] = useState<null | HTMLElement>(null);
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [sheets, setSheets] = useState<Array<{ id: string; name: string }>>([]);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<CatalogoTipo>('producto');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [stock, setStock] = useState('0');
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/catalogo', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItems([]);
        setError(typeof data.error === 'string' ? data.error : 'No se pudo cargar el catálogo');
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
      setError('No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const categorias = Array.from(
    new Set(
      items
        .map((item) => (item.categoria || '').trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const visibles = items.filter((item) => {
    if (tipoFilter !== 'todos' && item.tipo !== tipoFilter) return false;
    if (categoriaFilter !== 'todas') {
      const cat = (item.categoria || '').trim().toLowerCase();
      if (cat !== categoriaFilter) return false;
    }
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return `${item.nombre} ${item.descripcion || ''} ${item.categoria || ''}`.toLowerCase().includes(query);
  });

  const applyResult = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(typeof data.error === 'string' ? data.error : fallback);
      return;
    }
    setMsg(`Cargados ${data.created || 0} nuevos, ${data.updated || 0} actualizados.`);
    await cargar();
  };

  const importSheet = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('tipo', tipoFilter === 'todos' ? 'producto' : tipoFilter);
      const res = await fetch('/api/chat/catalogo/import', { method: 'POST', body: form });
      await applyResult(res, 'No se pudo importar la planilla');
    } catch {
      setMsg('No se pudo importar la planilla');
    } finally {
      setBusy(false);
    }
  };

  const importFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append('tipo', tipoFilter === 'todos' ? 'producto' : tipoFilter);
      list.forEach((file) => form.append('files', file));
      const res = await fetch('/api/chat/catalogo/archivos', { method: 'POST', body: form });
      await applyResult(res, 'No se pudieron subir los archivos');
    } catch {
      setMsg('No se pudieron subir los archivos');
    } finally {
      setBusy(false);
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
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/chat/catalogo/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'sheets',
          spreadsheetId,
          tipo: tipoFilter === 'todos' ? 'producto' : tipoFilter,
        }),
      });
      await applyResult(res, 'No se pudo importar el Sheet');
      setSheetsOpen(false);
    } catch {
      setMsg('No se pudo importar el Sheet');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CATALOGO_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-catalogo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setEditingId(null);
    setTipo(tipoFilter === 'todos' ? 'producto' : tipoFilter);
    setNombre('');
    setPrecio('');
    setDescripcion('');
    setCategoria(categoriaFilter !== 'todas' ? categoriaFilter : '');
    setStock('0');
    setImagenUrl(null);
    setArchivoUrl(null);
    setFormError(null);
  };

  const openEdit = (item?: CatalogoItem) => {
    if (item) {
      setEditingId(item.id);
      setTipo(item.tipo);
      setNombre(item.nombre);
      setPrecio(item.precio != null ? String(item.precio) : '');
      setDescripcion(item.descripcion || '');
      setCategoria(item.categoria || '');
      setStock(String(item.stock ?? 0));
      setImagenUrl(item.imagen_url);
      setArchivoUrl(item.archivo_url);
      setFormError(null);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const uploadOne = async (file: File, kind: 'imagen' | 'archivo') => {
    const result = await FileUploadService.uploadFile(file, 'catalogo');
    if (!result.success || !result.url) {
      setFormError(result.error || 'No se pudo subir el archivo');
      return;
    }
    if (kind === 'imagen') setImagenUrl(result.url);
    else setArchivoUrl(result.url);
  };

  const saveItem = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editingId ? `/api/chat/catalogo/${editingId}` : '/api/chat/catalogo', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          nombre,
          precio,
          descripcion,
          categoria,
          stock,
          imagen_url: imagenUrl,
          archivo_url: archivoUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'No se pudo guardar');
        return;
      }
      setDialogOpen(false);
      resetForm();
      await cargar();
    } catch {
      setFormError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/chat/catalogo/${id}`, { method: 'DELETE' });
    if (res.ok) await cargar();
  };

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2, position: 'relative' }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = Array.from(e.dataTransfer.files);
        const sheets = dropped.filter((file) => /\.(csv|xlsx|xls)$/i.test(file.name));
        const media = dropped.filter((file) => !/\.(csv|xlsx|xls)$/i.test(file.name));
        if (sheets[0]) void importSheet(sheets[0]);
        if (media.length) void importFiles(media);
      }}
    >
      {dragging ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            border: '2px dashed',
            borderColor: 'primary.main',
            bgcolor: 'rgba(25,118,210,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography fontWeight={600}>Soltá la planilla o varios archivos</Typography>
        </Box>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          label="Buscar"
          placeholder="Nombre o qué incluye"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          fullWidth
        />
        <Button variant="contained" onClick={() => openEdit()} sx={{ flexShrink: 0 }}>
          Nuevo
        </Button>
        <Button variant="outlined" onClick={(e) => setImportAnchor(e.currentTarget)} disabled={busy} sx={{ flexShrink: 0 }}>
          {busy ? 'Cargando…' : 'Importar'}
        </Button>
        <Button variant="outlined" onClick={() => filesInputRef.current?.click()} disabled={busy} sx={{ flexShrink: 0 }}>
          Subir archivos
        </Button>
        <Button variant="text" onClick={downloadTemplate} sx={{ flexShrink: 0 }}>
          Plantilla CSV
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        {(['todos', ...CATALOGO_TIPOS] as FilterTipo[]).map((key) => (
          <Chip
            key={key}
            label={key === 'todos' ? 'Todos' : CATALOGO_TIPO_LABEL[key]}
            color={tipoFilter === key ? 'primary' : 'default'}
            variant={tipoFilter === key ? 'filled' : 'outlined'}
            onClick={() => setTipoFilter(key)}
          />
        ))}
      </Stack>

      {categorias.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="Todas las categorías"
            color={categoriaFilter === 'todas' ? 'primary' : 'default'}
            variant={categoriaFilter === 'todas' ? 'filled' : 'outlined'}
            onClick={() => setCategoriaFilter('todas')}
          />
          {categorias.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              color={categoriaFilter === cat ? 'primary' : 'default'}
              variant={categoriaFilter === cat ? 'filled' : 'outlined'}
              onClick={() => setCategoriaFilter(cat)}
            />
          ))}
        </Stack>
      ) : null}

      <input
        ref={sheetInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importSheet(file);
        }}
      />
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept={CATALOGO_FILE_ACCEPT}
        hidden
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = '';
          if (files?.length) void importFiles(files);
        }}
      />
      <Menu anchorEl={importAnchor} open={Boolean(importAnchor)} onClose={() => setImportAnchor(null)}>
        <MenuItem
          onClick={() => {
            setImportAnchor(null);
            sheetInputRef.current?.click();
          }}
        >
          CSV o Excel
        </MenuItem>
        <MenuItem
          onClick={() => {
            setImportAnchor(null);
            void openSheetsPicker();
          }}
        >
          Google Sheet
        </MenuItem>
      </Menu>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {msg ? <Alert severity="info" onClose={() => setMsg(null)}>{msg}</Alert> : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : visibles.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          No hay ítems. Importá una planilla o soltá varios PDF, fotos, Word, Excel o PowerPoint.
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Incluye</TableCell>
                <TableCell>Archivos</TableCell>
                <TableCell width={56} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.map((item) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(item)}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {item.imagen_url ? (
                        <Box
                          component="img"
                          src={item.imagen_url}
                          alt=""
                          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }}
                        />
                      ) : null}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{item.nombre}</Typography>
                        {(item.stock ?? 0) === 0 ? (
                          <Chip label="sin stock" size="small" variant="outlined" color="warning" />
                        ) : null}
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>{CATALOGO_TIPO_LABEL[item.tipo]}</TableCell>
                  <TableCell>{item.categoria || '—'}</TableCell>
                  <TableCell>{item.stock ?? 0}</TableCell>
                  <TableCell>{item.precio != null ? formatCatalogPrecio(item.precio) : '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{item.descripcion || '—'}</TableCell>
                  <TableCell>
                    {[fileKindLabel(item.imagen_url), fileKindLabel(item.archivo_url)].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label={`Borrar ${item.nombre}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(item.id);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField select label="Tipo" size="small" value={tipo} onChange={(e) => setTipo(e.target.value as CatalogoTipo)}>
              {CATALOGO_TIPOS.map((key) => (
                <MenuItem key={key} value={key}>{CATALOGO_TIPO_LABEL[key]}</MenuItem>
              ))}
            </TextField>
            <TextField label="Nombre" size="small" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Precio" size="small" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="26000" fullWidth />
              <TextField label="Stock" size="small" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" fullWidth />
            </Stack>
            <TextField
              label="Categoría"
              size="small"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="vapers"
              helperText="Se guarda en minúsculas. Misma categoría = misma lista en el chat."
            />
            <TextField
              label="Qué incluye / detalle"
              size="small"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button component="label" size="small" variant="outlined">
                {imagenUrl ? 'Cambiar foto' : 'Foto'}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadOne(file, 'imagen');
                    e.target.value = '';
                  }}
                />
              </Button>
              <Button component="label" size="small" variant="outlined">
                {archivoUrl ? 'Cambiar archivo' : 'PDF / Word / Excel / PPT'}
                <input
                  hidden
                  type="file"
                  accept={CATALOGO_FILE_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadOne(file, 'archivo');
                    e.target.value = '';
                  }}
                />
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveItem()} disabled={saving}>
            {editingId ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sheetsOpen} onClose={() => !busy && setSheetsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar desde Google Sheet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Primera fila: tipo, nombre, precio, descripcion, categoria, stock. Opcional: imagen_url, archivo_url.
          </Typography>
          {sheetsError ? <Alert severity="error">{sheetsError}</Alert> : null}
          {!sheetsError && sheets.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {sheets.map((sheet) => (
                <ListItemButton key={sheet.id} disabled={busy} onClick={() => void importFromSheet(sheet.id)}>
                  <ListItemText primary={sheet.name} />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSheetsOpen(false)} disabled={busy}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
