import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import MessageStatus from './MessageStatus';
import FileAttachment from './FileAttachment';
import LinkPreview from './LinkPreview';
import { messageBubbleView } from '@/lib/chat/messageBubbleView';
import { splitTextWithLinks } from '@/lib/chat/extractFirstUrl';
import { WA } from '@/app/chat/chatTheme';

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  remitente: string;
  fecha_mensaje: string;
  canal: string;
  usuario_id?: string;
  metadata?: any;
  estado_envio?: string | null;
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

function LinkedCaption({ text, isOwn }: { text: string; isOwn: boolean }) {
  const parts = splitTextWithLinks(text);
  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
      {parts.map((part, index) => (
        part.type === 'link' ? (
          <Box
            key={`${part.value}-${index}`}
            component="a"
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: isOwn ? '#53bdeb' : '#53bdeb',
              textDecoration: 'underline',
              wordBreak: 'break-all',
            }}
          >
            {part.value}
          </Box>
        ) : (
          <React.Fragment key={index}>{part.value}</React.Fragment>
        )
      ))}
    </Typography>
  );
}

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

  const view = messageBubbleView(mensaje);
  const fileUrl = mensaje.metadata?.file_url as string | undefined;
  const fileType = String(mensaje.metadata?.file_type || mensaje.tipo || '');
  const fileName = String(mensaje.metadata?.file_name || '');
  const duration = Number(mensaje.metadata?.duration || 0);
  const caption = String(mensaje.contenido || '').trim();
  const showFile = view.showImage || view.showAudio || view.filePresentation;

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
      mb: 0.35,
      px: 1,
    }}>
      <Paper
        elevation={0}
        sx={{
          px: fileUrl && fileType === 'image' ? 0.5 : 1.25,
          py: fileUrl && fileType === 'image' ? 0.5 : 0.7,
          maxWidth: '65%',
          bgcolor: isOwn ? WA.outgoing : WA.incoming,
          color: WA.text,
          borderRadius: '7.5px',
          borderTopLeftRadius: !isOwn ? '0px' : '7.5px',
          borderTopRightRadius: isOwn ? '0px' : '7.5px',
          overflow: 'hidden',
        }}
      >
        {showFile && (
          <Box sx={{ mb: view.showRawText ? 1 : 0 }}>
            <FileAttachment
              url={fileUrl || ''}
              fileName={fileName || (view.filePresentation === 'unavailable' ? 'Documento' : 'Archivo')}
              fileType={fileType || 'unknown'}
              fileSize={mensaje.metadata?.file_size}
              mimeType={mensaje.metadata?.mime_type}
              duration={duration}
              isOwn={isOwn}
            />
          </Box>
        )}

        {view.showRawText && (
          <LinkedCaption text={caption} isOwn={isOwn} />
        )}

        {view.previewUrl && (
          <LinkPreview url={view.previewUrl} fallbackLink={view.urlOnly} />
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
            color: 'rgba(233,237,239,0.6)',
            fontSize: '0.68rem',
            ml: 0.5,
          }}>
            {formatTime(mensaje.fecha_mensaje)}
          </Typography>
          <MessageStatus
            estado={mensaje.estado_envio || mensaje.metadata?.estado_envio}
            error={mensaje.metadata?.error_envio}
            isOwn={isOwn}
            messageId={mensaje.id}
          />
        </Box>
      </Paper>
    </Box>
  );
}
