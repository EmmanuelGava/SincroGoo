import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Chip,
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
import BusinessIcon from '@mui/icons-material/Business';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useRouter } from 'next/navigation';
import LeadProfileModal from './LeadProfileModal';
import { conversationDisplayName, conversationRealPhone } from '@/lib/chat/conversationIdentity';
import { WA } from '@/app/chat/chatTheme';

interface Conversacion {
  id: string;
  remitente: string;
  display_name?: string;
  display_phone?: string | null;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
}

interface ConversationHeaderProps {
  conversacion: Conversacion;
  onDelete?: (conversacionId: string) => Promise<boolean> | boolean;
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

export default function ConversationHeader({ conversacion, onDelete }: ConversationHeaderProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  
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
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ 
            color: WA.text,
            fontWeight: 500,
            fontSize: '1rem',
            lineHeight: 1.3,
          }}>
            {displayName}
          </Typography>
          
          <Chip 
            label={servicioName}
            size="small"
            sx={{ 
              bgcolor: servicioColor + '20',
              color: servicioColor,
              fontWeight: 500,
              height: 24
            }}
          />
          
          {conversacion.lead_id && (
            <Chip 
              icon={<PersonIcon />}
              label="Lead"
              size="small"
              color="success"
              sx={{ height: 24 }}
            />
          )}
        </Box>
        
        <Typography variant="body2" sx={{ 
          color: WA.muted,
          fontSize: '0.8rem',
        }}>
          {displayPhone && displayPhone !== displayName ? `${displayPhone} · ` : ''}
          {getLastSeenText()}
        </Typography>
      </Box>

      {/* Acciones */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {conversacion.lead_id && (
          <Tooltip title="Ver perfil del lead">
            <IconButton 
              size="small"
              onClick={() => setLeadModalOpen(true)}
              sx={{ color: WA.icon }}
            >
              <BusinessIcon />
            </IconButton>
          </Tooltip>
        )}
        {conversacion.lead_id && (
          <Tooltip title="Ver en el Kanban">
            <IconButton
              size="small"
              onClick={() => router.push(`/crm?lead=${conversacion.lead_id}`)}
              sx={{ color: WA.icon }}
            >
              <ViewKanbanIcon />
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
      >
        {conversacion.lead_id && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              router.push(`/crm?lead=${conversacion.lead_id}`);
            }}
          >
            <ListItemIcon><ViewKanbanIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Ver en el Kanban</ListItemText>
          </MenuItem>
        )}
        {conversacion.lead_id && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setLeadModalOpen(true);
            }}
          >
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Ver perfil del lead</ListItemText>
          </MenuItem>
        )}
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
      {conversacion.lead_id && (
        <LeadProfileModal
          open={leadModalOpen}
          onClose={() => setLeadModalOpen(false)}
          leadId={conversacion.lead_id}
        />
      )}
    </Box>
  );
}