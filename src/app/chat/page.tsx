'use client';

import React from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import { useChat } from './hooks/useChat';

export default function ChatPage() {
  const {
    conversaciones,
    conversacionActiva,
    loading,
    error,
    seleccionarConversacion,
    fetchConversaciones
  } = useChat();

  return (
    <>
      <EncabezadoSistema />
      <Box sx={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        bgcolor: '#181818',
        pt: '64px' // Espacio para el header
      }}>
        {/* Sidebar de conversaciones */}
        <ChatSidebar
          conversaciones={conversaciones}
          conversacionActiva={conversacionActiva}
          onSelectConversacion={seleccionarConversacion}
          loading={loading}
        />
        
        {/* Ventana de chat principal */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <ChatWindow
            conversacion={conversacionActiva}
            onRefreshConversaciones={fetchConversaciones}
          />
        </Box>
      </Box>

      {/* Notificación de errores */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}