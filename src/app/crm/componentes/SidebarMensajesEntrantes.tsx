import { useCallback, useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MenuIcon from '@mui/icons-material/Menu';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { useNotificacion } from '@/app/editor-proyectos/contexts/NotificacionContext';
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';

interface MensajeEntrante {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  contenido: string;
  ultimo_mensaje?: string;
  fecha_mensaje: string;
  metadata?: Record<string, unknown>;
  servicio_origen?: string;
}

const servicioColor: Record<string, string> = {
  telegram: '#229ED9',
  whatsapp: '#25D366',
  email: '#D44638',
  default: '#90caf9',
};

const servicioIcons: Record<string, ElementType> = {
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
};

export default function SidebarMensajesEntrantes() {
  const [mensajes, setMensajes] = useState<MensajeEntrante[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(true);
  const [dialogoEliminar, setDialogoEliminar] = useState<string | null>(null);
  const { mostrarNotificacion } = useNotificacion();
  const { incomingTick, incomingHiddenIds, registerIncomingPreviews } = useLeadsKanbanContext();
  const fetchMensajesRef = useRef<() => Promise<void>>(async () => {});

  const fetchMensajes = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/conversaciones/entrantes', { cache: 'no-store' });
      const data = await res.json();
      const list = data.mensajes || [];
      setMensajes(list);
      registerIncomingPreviews(list);
    } catch {
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  }, [registerIncomingPreviews]);

  useEffect(() => {
    fetchMensajesRef.current = fetchMensajes;
  }, [fetchMensajes]);

  useEffect(() => {
    void fetchMensajes();
  }, [incomingTick, fetchMensajes]);

  // Respaldo por si el broadcast se pierde (igual que /chat).
  useEffect(() => {
    const id = setInterval(() => {
      void fetchMensajesRef.current();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const handleEliminar = async (id: string) => {
    try {
      const res = await fetch('/api/crm/conversaciones/entrantes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        mostrarNotificacion({ tipo: 'success', mensaje: 'Chat quitado de la lista.' });
        setDialogoEliminar(null);
        void fetchMensajes();
      } else {
        mostrarNotificacion({ tipo: 'error', mensaje: data.error || 'Error al eliminar.' });
      }
    } catch {
      mostrarNotificacion({ tipo: 'error', mensaje: 'Error al eliminar el chat.' });
    }
  };

  if (!abierto) {
    return (
      <Box sx={{ width: 48, height: '100%', bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Tooltip title="Abrir chats entrantes">
          <IconButton onClick={() => setAbierto(true)} size="large" color="primary">
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', height: '100%', overflowY: 'auto', p: 0, boxShadow: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1, bgcolor: 'background.default' }}>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 0.5 }}>
          Chats entrantes
        </Typography>
        <Tooltip title="Cerrar sidebar">
          <IconButton onClick={() => setAbierto(false)} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', px: 2, pb: 1, color: 'text.secondary' }}>
        Arrastrá un chat a una columna del Kanban para convertirlo en lead.
      </Typography>
      {loading ? (
        <Typography sx={{ p: 2, color: 'text.secondary' }}>Cargando...</Typography>
      ) : (
        <Droppable droppableId="incoming-chats" type="LEAD" isDropDisabled>
          {(provided) => {
            const visibles = mensajes.filter((msg) => !incomingHiddenIds.includes(msg.id));
            return (
            <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ p: 2, pt: 0, minHeight: 80 }}>
              {visibles.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  No hay chats sin lead. Los mensajes de WhatsApp aparecen acá hasta que los pases al tablero.
                </Typography>
              ) : visibles.map((msg, index) => {
                const color = servicioColor[msg.servicio_origen || 'whatsapp'] || servicioColor.default;
                const Icon = servicioIcons[msg.servicio_origen || ''] || WhatsAppIcon;
                const title = msg.display_name || msg.remitente;
                return (
                  <Draggable key={msg.id} draggableId={`incoming:${msg.id}`} index={index}>
                    {(dragProvided, snapshot) => (
                      <Paper
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        elevation={snapshot.isDragging ? 8 : 2}
                        sx={{
                          mb: 2,
                          p: 1.5,
                          borderLeft: `6px solid ${color}`,
                          bgcolor: snapshot.isDragging ? 'action.hover' : 'background.default',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'flex-start',
                          ...dragProvided.draggableProps.style,
                        }}
                      >
                        <Box {...dragProvided.dragHandleProps} sx={{ mr: 0.5, mt: 0.5, cursor: 'grab', color: 'text.secondary' }}>
                          <DragIndicatorIcon fontSize="small" />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Icon sx={{ color, fontSize: 16 }} />
                            <Typography variant="subtitle2" sx={{ color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {title}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5, wordBreak: 'break-word' }}>
                            {msg.ultimo_mensaje || msg.contenido}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {new Date(msg.fecha_mensaje).toLocaleString()}
                          </Typography>
                        </Box>
                        <Tooltip title="Quitar de la lista">
                          <IconButton size="small" color="default" onClick={() => setDialogoEliminar(msg.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Box>
            );
          }}
        </Droppable>
      )}
      <Dialog open={!!dialogoEliminar} onClose={() => setDialogoEliminar(null)}>
        <DialogTitle>Quitar chat</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que quieres eliminar este chat de la lista?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => handleEliminar(dialogoEliminar!)}>Quitar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
