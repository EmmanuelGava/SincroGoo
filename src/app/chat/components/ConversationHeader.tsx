'use client';

import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import AlarmIcon from '@mui/icons-material/Alarm';
import RecordatorioLeadModal from '@/app/crm/componentes/RecordatorioLeadModal';
import { useRouter } from 'next/navigation';
import LeadProfileModal from './LeadProfileModal';
import { conversationDisplayName, conversationRealPhone } from '@/lib/chat/conversationIdentity';
import { useWaTheme } from '@/app/chat/chatTheme';

interface Conversacion {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  contacto_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
  archived_at?: string | null;
}

interface ConversationHeaderProps {
  conversacion: Conversacion;
  onDelete?: (conversacionId: string) => Promise<boolean> | boolean;
  onArchive?: (conversacionId: string, archived: boolean) => Promise<boolean> | boolean;
  archivedView?: boolean;
  onManageReplies?: () => void;
  drawerOpen?: boolean;
  onToggleDrawer?: () => void;
  onLeadCreated?: (leadId: string) => void;
}

const servicioIcons: Record<string, React.ElementType> = {
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
  sms: SmsIcon,
};

const servicioColors: Record<string, string> = {
  telegram: '#229ED9',
  whatsapp: '#25D366',
  email: '#D44638',
  sms: '#FF9800',
};

const servicioNames: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
};

export default function ConversationHeader({
  conversacion,
  onDelete,
  onArchive,
  archivedView = false,
  onManageReplies,
  drawerOpen,
  onToggleDrawer,
  onLeadCreated,
}: ConversationHeaderProps) {
  const WA = useWaTheme();
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [creatingPedido, setCreatingPedido] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [resolvedLeadId, setResolvedLeadId] = useState<string | null>(conversacion.lead_id || null);
  const [recordatorioOpen, setRecordatorioOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (conversacion.lead_id) {
      setResolvedLeadId(conversacion.lead_id);
      return;
    }
    let cancelled = false;
    void fetch(`/api/chat/conversaciones/${encodeURIComponent(conversacion.id)}/lead`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.leadId === 'string') {
          setResolvedLeadId(data.leadId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversacion.id, conversacion.lead_id]);
  
  const displayName = conversationDisplayName(conversacion);
  const displayPhone = conversacion.display_phone || conversationRealPhone(conversacion);
  const IconComponent = servicioIcons[conversacion.servicio_origen] || SmsIcon;
  const servicioColor = servicioColors[conversacion.servicio_origen] || '#90caf9';
  const servicioName = servicioNames[conversacion.servicio_origen] || conversacion.servicio_origen;

  const getLastSeenText = () => {
    const date = new Date(conversacion.fecha_mensaje);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'Activo ahora';
    } else if (diffInMinutes < 60) {
      return `Activo hace ${Math.floor(diffInMinutes)} min`;
    } else if (diffInMinutes < 1440) {
      return `Activo hace ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      return `Último mensaje: ${date.toLocaleDateString('es-ES')}`;
    }
  };

  return (
    <Box sx={{ 
      p: 1.25, 
      px: 2,
      bgcolor: WA.header,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}>
      {/* Avatar con indicador de servicio */}
      <Box sx={{ position: 'relative' }}>
        <Avatar sx={{ 
          bgcolor: servicioColor,
          width: 40,
          height: 40,
          fontSize: '1rem',
        }}>
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          bgcolor: WA.header,
          borderRadius: '50%',
          p: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <IconComponent sx={{ 
            color: servicioColor, 
            fontSize: 16 
          }} />
        </Box>
      </Box>

      {/* Información del contacto */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ 
          color: WA.text,
          fontWeight: 500,
          fontSize: '1rem',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {displayName}
        </Typography>
        <Typography variant="body2" sx={{ 
          color: WA.muted,
          fontSize: '0.8rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {[
            servicioName,
            displayPhone && displayPhone !== displayName ? displayPhone : null,
            getLastSeenText(),
          ].filter(Boolean).join(' · ')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {onToggleDrawer ? (
          <Tooltip title={drawerOpen ? 'Ocultar panel contacto' : 'Panel contacto/deals'}>
            <IconButton
              size="small"
              onClick={onToggleDrawer}
              aria-label="Panel contacto"
              sx={{ color: drawerOpen ? WA.accent : WA.icon }}
            >
              <ViewSidebarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        {resolvedLeadId ? (
          <Tooltip title="Recordarme">
            <IconButton
              size="small"
              onClick={() => setRecordatorioOpen(true)}
              aria-label="Recordarme"
              sx={{ color: WA.icon }}
            >
              <AlarmIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        {resolvedLeadId ? (
          <Tooltip title="Ver en el Kanban">
            <IconButton
              size="small"
              onClick={() => router.push(`/crm?lead=${resolvedLeadId}`)}
              aria-label="Ver en el Kanban"
              sx={{ color: WA.icon }}
            >
              <ViewKanbanIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Pasar al Kanban">
            <IconButton
              size="small"
              disabled={creatingLead}
              onClick={async () => {
                setCreatingLead(true);
                try {
                  const res = await fetch(`/api/chat/conversaciones/${encodeURIComponent(conversacion.id)}/crear-lead`, {
                    method: 'POST',
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.lead?.id) {
                    setResolvedLeadId(data.lead.id);
                    onLeadCreated?.(data.lead.id);
                    router.push(`/crm?lead=${encodeURIComponent(data.lead.id)}`);
                  }
                } finally {
                  setCreatingLead(false);
                }
              }}
              aria-label="Pasar al Kanban"
              sx={{ color: WA.icon }}
            >
              <PostAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Más opciones">
          <IconButton
            size="small"
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            aria-label="Más opciones"
            sx={{ color: WA.icon }}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{
          sx: { bgcolor: WA.menu, color: WA.text, borderRadius: 2, minWidth: 220 },
        }}
      >
        {resolvedLeadId && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              router.push(`/crm?lead=${resolvedLeadId}`);
            }}
          >
            <ListItemIcon sx={{ color: WA.icon }}><ViewKanbanIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Ver en el Kanban</ListItemText>
          </MenuItem>
        )}
        {!resolvedLeadId ? (
          <MenuItem
            disabled={creatingLead}
            onClick={async () => {
              setMenuAnchor(null);
              setCreatingLead(true);
              try {
                const res = await fetch(`/api/chat/conversaciones/${encodeURIComponent(conversacion.id)}/crear-lead`, {
                  method: 'POST',
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.lead?.id) {
                  setResolvedLeadId(data.lead.id);
                  onLeadCreated?.(data.lead.id);
                  router.push(`/crm?lead=${encodeURIComponent(data.lead.id)}`);
                }
              } finally {
                setCreatingLead(false);
              }
            }}
          >
            <ListItemIcon sx={{ color: WA.icon }}><PostAddIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{creatingLead ? 'Creando lead…' : 'Pasar al Kanban'}</ListItemText>
          </MenuItem>
        ) : null}
        {resolvedLeadId && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setLeadModalOpen(true);
            }}
          >
            <ListItemIcon sx={{ color: WA.icon }}><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Ver perfil del lead</ListItemText>
          </MenuItem>
        )}
        {conversacion.contacto_id ? (
          <MenuItem
            disabled={creatingPedido}
            onClick={async () => {
              setMenuAnchor(null);
              if (!conversacion.contacto_id) return;
              setCreatingPedido(true);
              try {
                const res = await fetch(`/api/contactos/${encodeURIComponent(conversacion.contacto_id)}/nuevo-pedido`, {
                  method: 'POST',
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.lead?.id) {
                  router.push(`/crm?lead=${encodeURIComponent(data.lead.id)}`);
                }
              } finally {
                setCreatingPedido(false);
              }
            }}
          >
            <ListItemIcon sx={{ color: WA.icon }}><ShoppingBagOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{creatingPedido ? 'Creando pedido…' : 'Nuevo pedido'}</ListItemText>
          </MenuItem>
        ) : null}
        {onManageReplies ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onManageReplies();
            }}
          >
            <ListItemIcon sx={{ color: WA.icon }}><BoltIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Respuestas rápidas</ListItemText>
          </MenuItem>
        ) : null}
        {onArchive ? (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              if (archivedView) {
                void (async () => {
                  setArchiving(true);
                  const ok = await onArchive(conversacion.id, false);
                  setArchiving(false);
                  if (ok) setConfirmArchive(false);
                })();
              } else {
                setConfirmArchive(true);
              }
            }}
            disabled={archiving}
          >
            <ListItemIcon sx={{ color: WA.icon }}>
              {archivedView ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{archivedView ? 'Desarchivar chat' : 'Archivar chat'}</ListItemText>
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setConfirmDelete(true);
          }}
        >
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Eliminar chat</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={confirmArchive} onClose={() => !archiving && setConfirmArchive(false)}>
        <DialogTitle>Archivar chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            El chat desaparece del inbox principal pero conservás el historial y el lead en el Kanban. Podés recuperarlo desde Archivados.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchive(false)} disabled={archiving}>Cancelar</Button>
          <Button
            disabled={archiving}
            onClick={async () => {
              if (!onArchive) return;
              setArchiving(true);
              const ok = await onArchive(conversacion.id, true);
              setArchiving(false);
              if (ok) setConfirmArchive(false);
            }}
          >
            {archiving ? 'Archivando…' : 'Archivar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)}>
        <DialogTitle>Eliminar chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se borra esta conversación y sus mensajes de KloSync. El lead, si existe, se mantiene. WhatsApp no se desvincula.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
          <Button
            color="error"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              const ok = onDelete ? await onDelete(conversacion.id) : false;
              setDeleting(false);
              if (ok) setConfirmDelete(false);
            }}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal del perfil del lead */}
      {resolvedLeadId && (
        <LeadProfileModal
          open={leadModalOpen}
          onClose={() => setLeadModalOpen(false)}
          leadId={resolvedLeadId}
        />
      )}
      {resolvedLeadId ? (
        <RecordatorioLeadModal
          open={recordatorioOpen}
          onClose={() => setRecordatorioOpen(false)}
          leadId={resolvedLeadId}
          leadNombre={displayName}
          conversationId={conversacion.id}
        />
      ) : null}
    </Box>
  );
}