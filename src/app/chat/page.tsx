'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ContactDealDrawer from './components/ContactDealDrawer';
import { useChat } from './hooks/useChat';
import { inboxFiltroUsesArchivedApi, parseInboxFiltroFromUrl } from '@/lib/chat/inboxFilters';

import { useWaTheme } from './chatTheme';

function ChatPageInner() {
  const WA = useWaTheme();
  const searchParams = useSearchParams();
  const conversacionParam = searchParams.get('conversacion');
  const archivedView = inboxFiltroUsesArchivedApi(parseInboxFiltroFromUrl(searchParams.get('filtro')));
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    archivarConversacion,
  } = useChat({ archivedView });

  useEffect(() => {
    if (!conversacionParam || conversaciones.length === 0) return;
    const match = conversaciones.find((conv) => conv.id === conversacionParam);
    if (match && conversacionActiva?.id !== match.id) {
      seleccionarConversacion(match);
    }
  }, [conversacionParam, conversaciones, conversacionActiva?.id, seleccionarConversacion]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [conversacionActiva?.id]);

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

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ChatWindow
              conversacion={conversacionActiva}
              mensajes={mensajes}
              onRefreshConversaciones={fetchConversaciones}
              onRefreshMensajes={() => {
                if (conversacionActiva) fetchMensajes(conversacionActiva.id, { silent: true });
              }}
              onDeleteConversacion={eliminarConversacion}
              onArchiveConversacion={archivarConversacion}
              archivedView={archivedView}
              drawerOpen={drawerOpen}
              onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
            />
          </Box>
          {drawerOpen && conversacionActiva ? (
            <ContactDealDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              contactoId={conversacionActiva.contacto_id}
              activeLeadId={conversacionActiva.lead_id}
              conversationId={conversacionActiva.id}
              fallbackNombre={conversacionActiva.display_name}
              fallbackTelefono={conversacionActiva.display_phone}
              onRefresh={fetchConversaciones}
            />
          ) : null}
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
