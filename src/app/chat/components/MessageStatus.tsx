'use client';

import React from 'react';
import { Box, Tooltip, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { resolveDisplayEstado } from '@/lib/chat/messageDeliveryStatus';

import { useWaTheme } from '@/app/chat/chatTheme';

interface MessageStatusProps {
  estado?: string;
  error?: string;
  isOwn: boolean;
  messageId?: string;
}

const tickSx = (color: string) => ({ fontSize: 16, color });

export default function MessageStatus({ estado, error, isOwn, messageId }: MessageStatusProps) {
  const WA = useWaTheme();
  if (!isOwn) return null;

  const visible = resolveDisplayEstado(estado, messageId);

  const getStatusIcon = () => {
    switch (visible) {
      case 'enviando':
      case 'pendiente':
        return (
          <Tooltip title="Enviando...">
            <CircularProgress size={12} sx={{ color: WA.tick }} />
          </Tooltip>
        );

      case 'enviado':
        return (
          <Tooltip title="Enviado">
            <CheckIcon sx={tickSx(WA.tick)} />
          </Tooltip>
        );

      case 'entregado':
        return (
          <Tooltip title="Entregado">
            <DoneAllIcon sx={tickSx(WA.tick)} />
          </Tooltip>
        );

      case 'leido':
        return (
          <Tooltip title="Leído">
            <DoneAllIcon sx={{ fontSize: 16, color: WA.tickRead }} />
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
            <CheckIcon sx={tickSx(WA.tick)} />
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
