'use client';

import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import dynamic from 'next/dynamic';
// Importación dinámica para evitar problemas SSR con react-beautiful-dnd
const KanbanLeads = dynamic(() => import('./componentes/KanbanLeads'), { ssr: false });
// Aquí luego se importarán los componentes de Kanban y lógica de leads
import { LeadsKanbanProvider } from './contexts/LeadsKanbanContext';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

export default function CrmPage() {
  return (
    <>
      <EncabezadoSistema />
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          CRM Visual – Kanban de Leads
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Gestiona tus oportunidades y leads de manera visual. Arrastra y suelta para mover entre etapas.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <LeadsKanbanProvider>
            <KanbanLeads />
          </LeadsKanbanProvider>
        </Box>
      </Container>
    </>
  );
} 