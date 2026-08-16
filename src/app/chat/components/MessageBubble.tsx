import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Avatar,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import MessageStatus from './MessageStatus';
import FileAttachment from './FileAttachment';
import { conversationDisplayName } from '@/lib/chat/conversationIdentity';

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
  const contactName = conversationDisplayName({
    remitente: mensaje.remitente,
    metadata: mensaje.metadata,
  });

  const formatTime = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const fileUrl = mensaje.metadata?.file_url as string | undefined;
  const fileType = String(mensaje.metadata?.file_type || mensaje.tipo || '');
  const fileName = String(mensaje.metadata?.file_name || '');
  const duration = Number(mensaje.metadata?.duration || 0);
  const caption = String(mensaje.contenido || '').trim();
  const redundantCaption =
    !!fileUrl && (
      caption === fileName
      || /^Audio\s*\(/i.test(caption)
      || caption.startsWith('📎 ')
      || caption.startsWith('🎤 ')
    );

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      mb: 0.5,
      alignItems: 'flex-end',
      gap: 1
    }}>
      {!isOwn && (
        <Avatar sx={{ 
          bgcolor: servicioColor,
          width: 28,
          height: 28,
          fontSize: '0.75rem'
        }}>
          {contactName.charAt(0).toUpperCase()}
        </Avatar>
      )}

      <Paper
        elevation={0}
        sx={{
          px: fileUrl && fileType === 'image' ? 0.5 : 1.5,
          py: fileUrl && fileType === 'image' ? 0.5 : 1,
          maxWidth: '75%',
          bgcolor: isOwn ? 'primary.main' : 'background.paper',
          color: isOwn ? 'white' : 'text.primary',
          borderRadius: 2,
          borderTopLeftRadius: !isOwn ? 0.5 : 2,
          borderTopRightRadius: isOwn ? 0.5 : 2,
          border: isOwn ? 'none' : '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {fileUrl && (
          <Box sx={{ mb: !redundantCaption && caption ? 1 : 0 }}>
            <FileAttachment
              url={fileUrl}
              fileName={fileName || 'Archivo'}
              fileType={fileType || 'unknown'}
              fileSize={mensaje.metadata?.file_size}
              duration={duration}
              isOwn={isOwn}
            />
          </Box>
        )}

        {caption && !redundantCaption && (
          <Typography variant="body2" sx={{ 
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            {caption}
          </Typography>
        )}

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          mt: 0.4,
          gap: 0.5
        }}>
          {!isOwn && (
            <IconComponent sx={{ color: servicioColor, fontSize: 12 }} />
          )}
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
      </Paper>
    </Box>
  );
}
