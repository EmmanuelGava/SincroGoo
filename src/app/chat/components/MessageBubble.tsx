import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Avatar,
  Chip
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import PersonIcon from '@mui/icons-material/Person';
import MessageStatus from './MessageStatus';
import FileAttachment from './FileAttachment';

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  remitente: string;
  fecha_mensaje: string;
  canal: string;
  usuario_id?: string;
  metadata?: any;
}

interface MessageBubbleProps {
  mensaje: Mensaje;
  isOwn: boolean;
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

export default function MessageBubble({ mensaje, isOwn }: MessageBubbleProps) {
  const IconComponent = servicioIcons[mensaje.canal] || SmsIcon;
  const servicioColor = servicioColors[mensaje.canal] || '#90caf9';

  const formatTime = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      mb: 1,
      alignItems: 'flex-end',
      gap: 1
    }}>
      {/* Avatar para mensajes entrantes */}
      {!isOwn && (
        <Avatar sx={{ 
          bgcolor: servicioColor,
          width: 32,
          height: 32,
          fontSize: '0.875rem'
        }}>
          {mensaje.remitente.charAt(0).toUpperCase()}
        </Avatar>
      )}

      {/* Burbuja del mensaje */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: '70%',
          bgcolor: isOwn ? 'primary.main' : 'background.paper',
          color: isOwn ? 'white' : 'text.primary',
          borderRadius: 2,
          borderTopLeftRadius: !isOwn ? 0.5 : 2,
          borderTopRightRadius: isOwn ? 0.5 : 2,
          position: 'relative'
        }}
      >
        {/* Header del mensaje para mensajes entrantes */}
        {!isOwn && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 0.5 
          }}>
            <IconComponent sx={{ 
              color: servicioColor, 
              fontSize: 14 
            }} />
            <Typography variant="caption" sx={{ 
              color: 'text.secondary',
              fontWeight: 500
            }}>
              {mensaje.remitente}
            </Typography>
          </Box>
        )}

        {/* Archivo adjunto si existe */}
        {mensaje.metadata?.file_url && (
          <Box sx={{ mb: mensaje.contenido ? 1 : 0 }}>
            <FileAttachment
              url={mensaje.metadata.file_url}
              fileName={mensaje.metadata.file_name || 'Archivo'}
              fileType={mensaje.metadata.file_type || 'unknown'}
              fileSize={mensaje.metadata.file_size}
              isOwn={isOwn}
            />
          </Box>
        )}

        {/* Contenido del mensaje */}
        {mensaje.contenido && (
          <Typography variant="body2" sx={{ 
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {mensaje.contenido}
          </Typography>
        )}

        {/* Timestamp y Estado */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          mt: 0.5,
          gap: 0.5
        }}>
          <Typography variant="caption" sx={{ 
            color: isOwn ? 'rgba(255,255,255,0.7)' : 'text.secondary',
            fontSize: '0.7rem'
          }}>
            {formatTime(mensaje.fecha_mensaje)}
          </Typography>
          <MessageStatus 
            estado={mensaje.metadata?.estado_envio}
            error={mensaje.metadata?.error_envio}
            isOwn={isOwn}
          />
        </Box>

        {/* Indicador de mensaje propio */}
        {isOwn && (
          <Box sx={{
            position: 'absolute',
            top: 8,
            left: 8
          }}>
            <Chip
              icon={<PersonIcon />}
              label="Tú"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.6rem',
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Avatar para mensajes propios */}
      {isOwn && (
        <Avatar sx={{ 
          bgcolor: 'primary.dark',
          width: 32,
          height: 32,
          fontSize: '0.875rem'
        }}>
          <PersonIcon sx={{ fontSize: 18 }} />
        </Avatar>
      )}
    </Box>
  );
}