import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LeadProfileModal from './LeadProfileModal';

interface Conversacion {
  id: string;
  remitente: string;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string;
  ultimo_mensaje?: string;
  metadata?: any;
}

interface ConversationHeaderProps {
  conversacion: Conversacion;
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

export default function ConversationHeader({ conversacion }: ConversationHeaderProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  
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
      p: 2, 
      bgcolor: 'background.paper',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderBottom: '1px solid #232323'
    }}>
      {/* Avatar con indicador de servicio */}
      <Box sx={{ position: 'relative' }}>
        <Avatar sx={{ 
          bgcolor: servicioColor,
          width: 48,
          height: 48
        }}>
          {conversacion.remitente.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          bgcolor: 'background.paper',
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
          <Typography variant="h6" sx={{ 
            color: 'text.primary',
            fontWeight: 600
          }}>
            {conversacion.remitente}
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
          color: 'text.secondary'
        }}>
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
            >
              <BusinessIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Más opciones">
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Box>

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