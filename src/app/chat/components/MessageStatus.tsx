import React from 'react';
import { Box, Tooltip, CircularProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface MessageStatusProps {
  estado?: string;
  error?: string;
  isOwn: boolean;
}

export default function MessageStatus({ estado, error, isOwn }: MessageStatusProps) {
  // Solo mostrar estado para mensajes propios
  if (!isOwn) return null;

  const getStatusIcon = () => {
    switch (estado) {
      case 'enviando':
        return (
          <Tooltip title="Enviando...">
            <CircularProgress size={12} sx={{ color: 'rgba(255,255,255,0.5)' }} />
          </Tooltip>
        );
      
      case 'enviado':
        return (
          <Tooltip title="Enviado">
            <CheckIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
          </Tooltip>
        );
      
      case 'entregado':
        return (
          <Tooltip title="Entregado">
            <DoneAllIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
          </Tooltip>
        );
      
      case 'error':
        return (
          <Tooltip title={`Error: ${error || 'Error desconocido'}`}>
            <ErrorOutlineIcon sx={{ fontSize: 14, color: '#f44336' }} />
          </Tooltip>
        );
      
      default:
        return (
          <Tooltip title="Pendiente">
            <ScheduleIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
          </Tooltip>
        );
    }
  };

  return (
    <Box sx={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      ml: 0.5 
    }}>
      {getStatusIcon()}
    </Box>
  );
}