'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import ReplyIcon from '@mui/icons-material/Reply';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MessageStatus from './MessageStatus';
import FileAttachment from './FileAttachment';
import LinkPreview from './LinkPreview';
import { messageBubbleView } from '@/lib/chat/messageBubbleView';
import { splitTextWithLinks } from '@/lib/chat/extractFirstUrl';
import { type QuotedMessageMeta } from '@/lib/chat/quotedMessage';
import { useWaTheme } from '@/app/chat/chatTheme';

interface Mensaje {
  id: string;
  contenido: string;
  tipo: string;
  remitente: string;
  fecha_mensaje: string;
  canal: string;
  usuario_id?: string;
  wa_message_id?: string | null;
  metadata?: any;
  estado_envio?: string | null;
}

interface MessageBubbleProps {
  mensaje: Mensaje;
  isOwn: boolean;
  onReply?: () => void;
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

function QuotedBlock({ quoted, isOwn }: { quoted: QuotedMessageMeta; isOwn: boolean }) {
  const WA = useWaTheme();
  return (
    <Box
      sx={{
        mb: 0.75,
        px: 1,
        py: 0.5,
        borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : WA.accent}`,
        bgcolor: isOwn ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)',
        borderRadius: 0.5,
      }}
    >
      <Typography variant="caption" sx={{ color: isOwn ? WA.muted : WA.accent, fontWeight: 600, display: 'block' }}>
        Citado
      </Typography>
      <Typography variant="body2" sx={{ color: WA.muted, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {quoted.text}
      </Typography>
    </Box>
  );
}

export default function MessageBubble({ mensaje, isOwn, onReply }: MessageBubbleProps) {
  const WA = useWaTheme();
  const [hover, setHover] = useState(false);
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
  const fileName = String(
    mensaje.metadata?.file_name
    || view.unavailableLabel
    || ''
  );
  const duration = Number(mensaje.metadata?.duration || 0);
  const caption = String(mensaje.contenido || '').trim();
  const quotedMessage = mensaje.metadata?.quoted_message as QuotedMessageMeta | undefined;
  const showFile = !view.isInternalNote && (view.showImage || view.showAudio || view.showVideo || Boolean(view.filePresentation));
  const attachmentType = view.filePresentation === 'unavailable' && !view.showImage && !view.showAudio && !view.showVideo
    ? 'file'
    : (fileType || 'unknown');

  if (view.isInternalNote) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75, px: 1 }}>
        <Paper
          elevation={0}
          sx={{
            px: 1.25,
            py: 0.75,
            maxWidth: '80%',
            bgcolor: 'rgba(120, 120, 120, 0.22)',
            color: WA.muted,
            borderRadius: '7.5px',
            border: `1px dashed ${WA.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
            <LockOutlinedIcon sx={{ fontSize: 16, mt: 0.15, color: WA.muted }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: WA.muted, fontWeight: 600, display: 'block', mb: 0.25 }}>
                Nota interna
              </Typography>
              {view.showRawText ? (
                <LinkedCaption text={caption} isOwn={false} />
              ) : caption ? (
                <Typography variant="body2" sx={{ color: WA.text, whiteSpace: 'pre-wrap' }}>
                  {caption}
                </Typography>
              ) : null}
              <Typography variant="caption" sx={{ color: WA.muted, fontSize: '0.68rem', display: 'block', mt: 0.4, textAlign: 'right' }}>
                {formatTime(mensaje.fecha_mensaje)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{ 
        display: 'flex', 
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 0.35,
        px: 1,
        position: 'relative',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isOwn && onReply && hover ? (
        <Tooltip title="Responder">
          <IconButton
            size="small"
            onClick={onReply}
            sx={{
              alignSelf: 'center',
              mr: 0.5,
              color: WA.icon,
              bgcolor: WA.inputField,
            }}
            aria-label="Responder"
          >
            <ReplyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
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
          boxShadow: !isOwn ? WA.incomingShadow : 'none',
          overflow: 'hidden',
        }}
      >
        {quotedMessage?.text ? (
          <QuotedBlock quoted={quotedMessage} isOwn={isOwn} />
        ) : null}

        {showFile && (
          <Box sx={{ mb: view.showRawText ? 1 : 0 }}>
            <FileAttachment
              url={fileUrl || ''}
              fileName={fileName || (view.filePresentation === 'unavailable' ? (view.unavailableLabel || 'Archivo') : 'Archivo')}
              fileType={attachmentType}
              fileSize={mensaje.metadata?.file_size}
              mimeType={mensaje.metadata?.mime_type}
              duration={duration}
              isOwn={isOwn}
              uploading={mensaje.metadata?.estado_envio === 'enviando' && fileType === 'video'}
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
            color: WA.muted,
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
