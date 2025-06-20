import { useEffect, useState } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { useNotificacion } from '@/app/editor-proyectos/contexts/NotificacionContext';
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { supabase } from '@/lib/supabase/browserClient';

interface MensajeEntrante {
  id: string;
  remitente: string;
  contenido: string;
  fecha_mensaje: string;
  metadata?: any;
  servicio_origen?: string;
}

interface EstadoLead {
  id: string;
  nombre: string;
  orden: number;
}

const servicioColor: Record<string, string> = {
  telegram: '#229ED9', // Azul Telegram
  whatsapp: '#25D366',
  email: '#D44638',
  default: '#90caf9',
};

export default function SidebarMensajesEntrantes() {
  const [mensajes, setMensajes] = useState<MensajeEntrante[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(true);
  const [dialogoEliminar, setDialogoEliminar] = useState<string | null>(null);
  const [dialogoLead, setDialogoLead] = useState<{ id: string; nombre: string; telefono: string; email: string; } | null>(null);
  const { mostrarNotificacion } = useNotificacion();
  const { refrescarLeads } = useLeadsKanbanContext();
  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [estadoPorDefecto, setEstadoPorDefecto] = useState<string | null>(null);

  const fetchMensajes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/conversaciones/entrantes');
      const data = await res.json();
      setMensajes(data.mensajes || []);
    } catch (e) {
      setMensajes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMensajes();
    // Obtener estados de lead y seleccionar el de orden 1
    async function fetchEstados() {
      try {
        const res = await fetch('/api/supabase/estados_lead');
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setEstados(data);
          const estadoInicial = data.find((e: EstadoLead) => e.orden === 0);
          setEstadoPorDefecto(estadoInicial?.id || null);
        } else {
          setEstados([]);
          setEstadoPorDefecto(null);
        }
      } catch (e) {
        setEstados([]);
        setEstadoPorDefecto(null);
      }
    }
    fetchEstados();

    // Suscripción a Supabase Realtime para refrescar mensajes automáticamente
    console.log('Intentando suscribirse a realtime...');
    const channel = supabase
      .channel('mensajes_conversacion')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_conversacion' },
        (payload) => {
          console.log('Evento realtime recibido', payload);
          fetchMensajes();
        }
      )
      .subscribe((status) => {
        console.log('Estado de la suscripción realtime:', status);
      });

    return () => {
      console.log('Eliminando canal realtime...');
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEliminar = async (id: string) => {
    try {
      const res = await fetch('/api/crm/conversaciones/entrantes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        mostrarNotificacion({ tipo: 'success', mensaje: 'Mensaje eliminado correctamente.' });
        setDialogoEliminar(null);
        fetchMensajes();
      } else {
        mostrarNotificacion({ tipo: 'error', mensaje: data.error || 'Error al eliminar el mensaje.' });
      }
    } catch (e) {
      mostrarNotificacion({ tipo: 'error', mensaje: 'Error al eliminar el mensaje.' });
    }
  };

  const handleConvertirLead = async () => {
    if (!dialogoLead || !estadoPorDefecto) {
      mostrarNotificacion({ tipo: 'error', mensaje: 'Faltan datos o estado por defecto.' });
      return;
    }

    if (!dialogoLead.nombre || !dialogoLead.email) {
      mostrarNotificacion({ tipo: 'error', mensaje: 'El nombre y el email son obligatorios.' });
      return;
    }

    try {
      // Paso 1: Crear el lead
      const leadResponse = await fetch('/api/supabase/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: dialogoLead.nombre,
          telefono: dialogoLead.telefono,
          email: dialogoLead.email,
          estado_id: estadoPorDefecto,
        }),
      });

      const nuevoLead = await leadResponse.json();
      if (!leadResponse.ok) {
        throw new Error(nuevoLead.error || 'Error al crear el lead.');
      }
      
      mostrarNotificacion({ tipo: 'info', mensaje: 'Lead creado, asociando conversación...' });

      // Paso 2: Asociar la conversación
      const assocResponse = await fetch('/api/crm/conversaciones/entrantes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: dialogoLead.id,
          leadId: nuevoLead.id,
        }),
      });

      const assocData = await assocResponse.json();
      if (!assocResponse.ok) {
        throw new Error(assocData.error || 'Error al asociar la conversación.');
      }

      mostrarNotificacion({ tipo: 'success', mensaje: 'Lead creado y asociado correctamente.' });
      setDialogoLead(null);
      fetchMensajes();
      refrescarLeads();

    } catch (e: any) {
      mostrarNotificacion({ tipo: 'error', mensaje: e.message || 'Ocurrió un error inesperado.' });
    }
  };

  if (!abierto) {
    return (
      <Box sx={{ width: 48, height: '100vh', bgcolor: 'background.paper', borderRight: '1px solid #232323', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Tooltip title="Abrir mensajes entrantes">
          <IconButton onClick={() => setAbierto(true)} size="large" color="primary">
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ width: 320, borderRight: '1px solid #232323', bgcolor: 'background.paper', height: '100vh', overflowY: 'auto', p: 0, boxShadow: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1, bgcolor: 'background.default' }}>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 0.5 }}>
          Mensajes entrantes
        </Typography>
        <Tooltip title="Cerrar sidebar">
          <IconButton onClick={() => setAbierto(false)} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {loading ? (
        <Typography sx={{ p: 2, color: 'text.secondary' }}>Cargando...</Typography>
      ) : mensajes.length === 0 ? (
        <Typography sx={{ p: 2, color: 'text.secondary' }}>No hay mensajes entrantes.</Typography>
      ) : (
        <Box sx={{ p: 2, pt: 0 }}>
          {mensajes.map(msg => {
            const color = servicioColor[msg.servicio_origen || 'telegram'] || servicioColor.default;
            return (
              <Paper
                key={msg.id}
                elevation={2}
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderLeft: `6px solid ${color}`,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px #0002',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 4px 16px #0003' },
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ color, fontWeight: 700, mb: 0.5 }}>
                    {msg.remitente}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5, wordBreak: 'break-word' }}>
                    {msg.contenido}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Date(msg.fecha_mensaje).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1, alignItems: 'flex-end' }}>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="default" onClick={() => setDialogoEliminar(msg.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Archivar">
                    <span>
                      <IconButton size="small" color="default" disabled>
                        <ArchiveOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Pasar a lead">
                    <IconButton size="small" color="primary" onClick={() => setDialogoLead({ id: msg.id, nombre: msg.remitente, telefono: '', email: '' })}>
                      <PersonAddAltOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Responder">
                    <span>
                      <IconButton size="small" color="default" disabled>
                        <ReplyOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
      {/* Dialogo eliminar */}
      <Dialog open={!!dialogoEliminar} onClose={() => setDialogoEliminar(null)}>
        <DialogTitle>Eliminar mensaje</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que quieres eliminar este mensaje?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => handleEliminar(dialogoEliminar!)}>Eliminar</Button>
        </DialogActions>
      </Dialog>
      {/* Dialogo convertir en lead */}
      <Dialog open={!!dialogoLead} onClose={() => setDialogoLead(null)}>
        <DialogTitle>Convertir en Lead</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Introduce los datos del lead:</Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nombre"
            value={dialogoLead?.nombre || ''}
            onChange={e => setDialogoLead(dl => dl ? { ...dl, nombre: e.target.value } : null)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={dialogoLead?.email || ''}
            onChange={e => setDialogoLead(dl => dl ? { ...dl, email: e.target.value } : null)}
            type="email"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Teléfono (Opcional)"
            value={dialogoLead?.telefono || ''}
            onChange={e => setDialogoLead(dl => dl ? { ...dl, telefono: e.target.value } : null)}
            type="tel"
            error={!!dialogoLead?.telefono && !/^\+?[0-9\s-]{6,}$/.test(dialogoLead.telefono)}
            helperText={!!dialogoLead?.telefono && !/^\+?[0-9\s-]{6,}$/.test(dialogoLead.telefono) ? 'Debe tener al menos 6 dígitos y solo números, espacios, guiones o empezar con +' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoLead(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConvertirLead}>Crear y Asociar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 