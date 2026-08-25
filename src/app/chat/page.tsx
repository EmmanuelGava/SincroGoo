'use client';

import React, { useEffect, Suspense } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import { useChat } from './hooks/useChat';

import { useWaTheme } from './chatTheme';

function ChatPageInner() {
  const WA = useWaTheme();
  const searchParams = useSearchParams();
  const conversacionParam = searchParams.get('conversacion');
  const {
    conversaciones,
    conversacionActiva,
    loading,
    error,
    seleccionarConversacion,
    fetchConversaciones,
    fetchMensajes,
    mensajes,
    eliminarConversacion,
  } = useChat();

  useEffect(() => {
    if (!conversacionParam || conversaciones.length === 0) return;
    const match = conversaciones.find((conv) => conv.id === conversacionParam);
    if (match && conversacionActiva?.id !== match.id) {
      seleccionarConversacion(match);
    }
  }, [conversacionParam, conversaciones, conversacionActiva?.id, seleccionarConversacion]);

  return (
    <>
      <EncabezadoSistema />
      <Box sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        bgcolor: WA.chatBg,
        pt: '70px',
      }}>
        <ChatSidebar
          conversaciones={conversaciones}
          conversacionActiva={conversacionActiva}
          onSelectConversacion={seleccionarConversacion}
          onRefreshConversaciones={fetchConversaciones}
          loading={loading}
        />

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <ChatWindow
            conversacion={conversacionActiva}
            mensajes={mensajes}
            onRefreshConversaciones={fetchConversaciones}
            onRefreshMensajes={() => {
              if (conversacionActiva) fetchMensajes(conversacionActiva.id, { silent: true });
            }}
            onDeleteConversacion={eliminarConversacion}
          />
        </Box>
      </Box>

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

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
