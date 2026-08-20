'use client';

import React, { Suspense } from 'react';
import { Box, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
const KanbanLeads = dynamic(() => import('./componentes/KanbanLeads'), { ssr: false });
import { LeadsKanbanProvider } from './contexts/LeadsKanbanContext';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

export default function CrmPage() {
  return (
    <>
      <EncabezadoSistema />
      <LeadsKanbanProvider>
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', pt: '70px' }}>
          <Box sx={{ px: 3, pt: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              CRM Visual – Kanban de Leads
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Los chats nuevos aparecen a la izquierda. Arrastralos a una columna para pasarlos al Kanban.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <Suspense fallback={<Typography sx={{ p: 3 }}>Cargando tablero...</Typography>}>
              <KanbanLeads />
            </Suspense>
          </Box>
        </Box>
      </LeadsKanbanProvider>
    </>
  );
}
