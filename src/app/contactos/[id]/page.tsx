'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { formatEtapaHistorialLine } from '@/lib/crm/leadEtapaHistorial';

type Contacto = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  empresa: string | null;
  notas: string | null;
  etiquetas?: string[] | null;
};

type Conversacion = {
  id: string;
  remitente: string | null;
  servicio_origen: string | null;
  fecha_mensaje: string | null;
};

type EstadoLeadRel = { nombre?: string | null; color?: string | null };

type Lead = {
  id: string;
  nombre: string | null;
  estado_id: string | null;
  estados_lead?: EstadoLeadRel | EstadoLeadRel[] | null;
};

type HistorialItem = {
  id: string;
  lead_id: string;
  fecha: string;
  estado_anterior_nombre: string | null;
  estado_nuevo_nombre: string;
  lead_nombre?: string | null;
  motivo?: string | null;
};

function etapaLead(lead: Lead): { nombre: string; color?: string } {
  const rel = Array.isArray(lead.estados_lead) ? lead.estados_lead[0] : lead.estados_lead;
  return {
    nombre: rel?.nombre?.trim() || 'Sin estado',
    color: rel?.color || undefined,
  };
}

function formatFecha(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-AR');
}

export default function ContactoFichaPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [notas, setNotas] = useState('');
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [creatingPedido, setCreatingPedido] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const applyContacto = (data: Contacto) => {
    setContacto(data);
    setNombre(data.nombre ?? '');
    setTelefono(data.telefono ?? '');
    setEmail(data.email ?? '');
    setEmpresa(data.empresa ?? '');
    setNotas(data.notas ?? '');
    setEtiquetas(Array.isArray(data.etiquetas) ? data.etiquetas : []);
  };

  const cargar = useCallback(async (signal?: AbortSignal) => {
    if (!id) {
      setError('El id es requerido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(id)}`, {
        signal,
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContacto(null);
        setConversaciones([]);
        setLeads([]);
        setHistorial([]);
        setError(typeof data.error === 'string' ? data.error : 'No se pudo cargar el contacto');
        return;
      }
      applyContacto(data.contacto as Contacto);
      setConversaciones(Array.isArray(data.conversaciones) ? data.conversaciones : []);
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setHistorial(Array.isArray(data.historial) ? data.historial : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setContacto(null);
      setError('No se pudo cargar el contacto');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const handleSave = async () => {
    if (!id || !nombre.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          telefono,
          email,
          empresa,
          notas,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'No se pudo guardar el contacto');
        return;
      }
      if (data.contacto) applyContacto(data.contacto as Contacto);
    } catch {
      setFormError('No se pudo guardar el contacto');
    } finally {
      setSaving(false);
    }
  };

  const persistEtiquetas = async (nextTags: string[]) => {
    if (!id) return false;
    setSavingTags(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiquetas: nextTags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'No se pudieron guardar las etiquetas');
        return false;
      }
      if (data.contacto) applyContacto(data.contacto as Contacto);
      return true;
    } catch {
      setFormError('No se pudieron guardar las etiquetas');
      return false;
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddEtiqueta = async () => {
    const tag = nuevaEtiqueta.trim().toLowerCase();
    if (!tag || etiquetas.includes(tag)) {
      setNuevaEtiqueta('');
      return;
    }
    const next = [...etiquetas, tag];
    setEtiquetas(next);
    setNuevaEtiqueta('');
    await persistEtiquetas(next);
  };

  const handleRemoveEtiqueta = async (tag: string) => {
    const next = etiquetas.filter((item) => item !== tag);
    setEtiquetas(next);
    await persistEtiquetas(next);
  };

  const handleNuevoPedido = async () => {
    if (!id || creatingPedido) return;
    setCreatingPedido(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(id)}/nuevo-pedido`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'No se pudo crear el pedido');
        return;
      }
      if (data.lead?.id) {
        router.push(`/crm?lead=${encodeURIComponent(data.lead.id)}`);
        return;
      }
      await cargar();
    } catch {
      setFormError('No se pudo crear el pedido');
    } finally {
      setCreatingPedido(false);
    }
  };

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
    setDeleting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/contactos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'No se pudo eliminar el contacto');
        return;
      }
      router.push('/contactos');
    } catch {
      setFormError('No se pudo eliminar el contacto');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <EncabezadoSistema />
      <Box
        sx={{
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          pt: '70px',
        }}
      >
        <Box sx={{ px: 3, pt: 2, pb: 4, maxWidth: 960, width: '100%', mx: 'auto' }}>
          <Button component={Link} href="/contactos" sx={{ mb: 1 }}>
            Volver a contactos
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            {contacto?.nombre || 'Contacto'}
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : contacto ? (
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Datos
                </Typography>
                {formError ? <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert> : null}
                <Stack spacing={2}>
                  <TextField
                    label="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    fullWidth
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
                  <TextField
                    label="Empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Notas"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Button
                      variant="contained"
                      onClick={() => void handleSave()}
                      disabled={saving || deleting || !nombre.trim()}
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      onClick={() => void handleDelete()}
                      disabled={saving || deleting}
                    >
                      {deleting ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                  <Typography variant="h6">Etiquetas</Typography>
                  <Button
                    variant="outlined"
                    onClick={() => void handleNuevoPedido()}
                    disabled={creatingPedido || saving || deleting}
                  >
                    {creatingPedido ? 'Creando…' : 'Nuevo pedido'}
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {etiquetas.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={savingTags ? undefined : () => void handleRemoveEtiqueta(tag)}
                      onClick={() => router.push(`/contactos?etiqueta=${encodeURIComponent(tag)}`)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {etiquetas.length === 0 ? (
                    <Typography color="text.secondary">Sin etiquetas.</Typography>
                  ) : null}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Agregar etiqueta"
                    value={nuevaEtiqueta}
                    onChange={(e) => setNuevaEtiqueta(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddEtiqueta();
                      }
                    }}
                    size="small"
                    fullWidth
                    disabled={savingTags}
                  />
                  <IconButton
                    color="primary"
                    onClick={() => void handleAddEtiqueta()}
                    disabled={savingTags || !nuevaEtiqueta.trim()}
                    aria-label="Agregar etiqueta"
                  >
                    <AddIcon />
                  </IconButton>
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Chats
                </Typography>
                {conversaciones.length === 0 ? (
                  <Typography color="text.secondary">No hay chats vinculados.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {conversaciones.map((conv) => (
                      <Stack
                        key={conv.id}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography>{conv.remitente || 'Chat'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {conv.servicio_origen || 'sin canal'} · {formatFecha(conv.fecha_mensaje)}
                          </Typography>
                        </Box>
                        <Button
                          component={Link}
                          href={`/chat?conversacion=${encodeURIComponent(conv.id)}`}
                          size="small"
                        >
                          Abrir chat
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Leads
                </Typography>
                {leads.length === 0 ? (
                  <Typography color="text.secondary">No hay leads.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {leads.map((lead) => {
                      const etapa = etapaLead(lead);
                      return (
                        <Stack
                          key={lead.id}
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography>{lead.nombre || 'Lead'}</Typography>
                            <Chip
                              size="small"
                              label={etapa.nombre}
                              sx={etapa.color ? { bgcolor: etapa.color, color: '#fff' } : undefined}
                            />
                          </Stack>
                          <Button
                            component={Link}
                            href={`/crm?lead=${encodeURIComponent(lead.id)}`}
                            size="small"
                          >
                            Ver en CRM
                          </Button>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Historial de etapas
                </Typography>
                {historial.length === 0 ? (
                  <Typography color="text.secondary">Todavía no hay cambios de etapa.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {historial.map((item) => (
                      <Box key={item.id}>
                        <Typography>{formatEtapaHistorialLine(item)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatFecha(item.fecha)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Stack>
          ) : null}
        </Box>
      </Box>
    </>
  );
}
