import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import NewConversationModal from './NewConversationModal';
import MessagingStatusIndicator from './MessagingStatusIndicator';

interface Conversacion {
  id: string;
  remitente: string;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
}

interface ChatSidebarProps {
  conversaciones: Conversacion[];
  conversacionActiva: Conversacion | null;
  onSelectConversacion: (conversacion: Conversacion) => void;
  onRefreshConversaciones: () => void;
  loading: boolean;
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

export default function ChatSidebar({ 
  conversaciones, 
  conversacionActiva, 
  onSelectConversacion, 
  onRefreshConversaciones,
  loading 
}: ChatSidebarProps) {
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  
  const getServiceIcon = (servicio: string) => {
    const IconComponent = servicioIcons[servicio] || SmsIcon;
    return <IconComponent sx={{ color: servicioColors[servicio] || '#90caf9' }} />;
  };

  const formatTime = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        width: 350, 
        borderRight: '1px solid #232323', 
        bgcolor: 'background.paper',
        p: 2
      }}>
        <Typography sx={{ color: 'text.secondary' }}>
          Cargando conversaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: 350, 
      borderRight: '1px solid #232323', 
      bgcolor: 'background.paper',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #232323',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ 
            color: 'primary.main', 
            fontWeight: 700 
          }}>
            Chat Unificado
          </Typography>
          <Tooltip title="Nueva conversación">
            <IconButton
              size="small"
              onClick={() => setNewConversationOpen(true)}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ 
            color: 'text.secondary'
          }}>
            {conversaciones.length} conversaciones activas
          </Typography>
          <MessagingStatusIndicator />
        </Box>
      </Box>

      {/* Lista de conversaciones */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {conversaciones.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              No hay conversaciones activas
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Configura tus plataformas de mensajería para comenzar
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => window.open('/configuracion/mensajeria', '_blank')}
              sx={{ fontSize: '0.8rem' }}
            >
              Configurar Mensajería
            </Button>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {conversaciones.map((conversacion) => (
              <ListItem key={conversacion.id} disablePadding>
                <ListItemButton
                  selected={conversacionActiva?.id === conversacion.id}
                  onClick={() => onSelectConversacion(conversacion)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid #232323',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      }
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={getServiceIcon(conversacion.servicio_origen)}
                    >
                      <Avatar sx={{ 
                        bgcolor: servicioColors[conversacion.servicio_origen] || '#90caf9',
                        width: 40,
                        height: 40
                      }}>
                        {conversacion.remitente.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ 
                          color: conversacionActiva?.id === conversacion.id ? 'white' : 'text.primary',
                          fontWeight: 600,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {conversacion.remitente}
                        </Typography>
                        {conversacion.lead_id && (
                          <Chip 
                            label="Lead" 
                            size="small" 
                            color="success"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="body2" sx={{ 
                          color: conversacionActiva?.id === conversacion.id ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px'
                        }}>
                          {conversacion.ultimo_mensaje || 'Sin mensajes'}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: conversacionActiva?.id === conversacion.id ? 'rgba(255,255,255,0.5)' : 'text.secondary',
                          fontSize: '0.7rem'
                        }}>
                          {formatTime(conversacion.fecha_mensaje)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Modal para nueva conversación */}
      <NewConversationModal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        onConversationCreated={(conversacion) => {
          setNewConversationOpen(false);
          onRefreshConversaciones(); // Refrescar lista de conversaciones
          onSelectConversacion(conversacion); // Seleccionar la nueva conversación
        }}
      />
    </Box>
  );
}