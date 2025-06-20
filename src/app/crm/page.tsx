'use client';

import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import dynamic from 'next/dynamic';
// Importación dinámica para evitar problemas SSR con react-beautiful-dnd
const KanbanLeads = dynamic(() => import('./componentes/KanbanLeads'), { ssr: false });
// Aquí luego se importarán los componentes de Kanban y lógica de leads
import { LeadsKanbanProvider } from './contexts/LeadsKanbanContext';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import SidebarMensajesEntrantes from './componentes/SidebarMensajesEntrantes';

export default function CrmPage() {
  return (
    <>
      <EncabezadoSistema />
      <LeadsKanbanProvider>
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'row', bgcolor: '#181818' }}>
          <SidebarMensajesEntrantes />
          <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'auto' }}>
            <Container maxWidth="xl" sx={{ mt: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                CRM Visual – Kanban de Leads
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Gestiona tus oportunidades y leads de manera visual. Arrastra y suelta para mover entre etapas.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <KanbanLeads />
              </Box>
            </Container>
          </Box>
        </Box>
      </LeadsKanbanProvider>
    </>
  );
} 