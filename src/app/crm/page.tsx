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
