import React from 'react';
import { Box, Tooltip, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { resolveDisplayEstado } from '@/lib/chat/messageDeliveryStatus';

interface MessageStatusProps {
  estado?: string;
  error?: string;
  isOwn: boolean;
  messageId?: string;
}

const tickSx = { fontSize: 16, color: 'rgba(233,237,239,0.7)' };

export default function MessageStatus({ estado, error, isOwn, messageId }: MessageStatusProps) {
  if (!isOwn) return null;

  const visible = resolveDisplayEstado(estado, messageId);

  const getStatusIcon = () => {
    switch (visible) {
      case 'enviando':
      case 'pendiente':
        return (
          <Tooltip title="Enviando...">
            <CircularProgress size={12} sx={{ color: 'rgba(233,237,239,0.5)' }} />
          </Tooltip>
        );

      case 'enviado':
        return (
          <Tooltip title="Enviado">
            <CheckIcon sx={tickSx} />
          </Tooltip>
        );

      case 'entregado':
        return (
          <Tooltip title="Entregado">
            <DoneAllIcon sx={tickSx} />
          </Tooltip>
        );

      case 'leido':
        return (
          <Tooltip title="Leído">
            <DoneAllIcon sx={{ fontSize: 16, color: '#53bdeb' }} />
          </Tooltip>
        );

      case 'error':
        return (
          <Tooltip title={`Error: ${error || 'Error desconocido'}`}>
            <ErrorOutlineIcon sx={{ fontSize: 16, color: '#f44336' }} />
          </Tooltip>
        );

      default:
        return (
          <Tooltip title="Enviado">
            <CheckIcon sx={tickSx} />
          </Tooltip>
        );
    }
  };

  return (
    <Box sx={{
      display: 'inline-flex',
      alignItems: 'center',
      ml: 0.25,
    }}>
      {getStatusIcon()}
    </Box>
  );
}
