// Dashboard Grid Component - Componente de cuadrícula para el dashboard
// Fecha: 2025-01-16

'use client';

import React from 'react';
import { Grid, Box } from '@mui/material';

interface DashboardGridProps {
  children: React.ReactNode;
  spacing?: number;
}

export function DashboardGrid({ children, spacing = 3 }: DashboardGridProps) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={spacing}>
        {children}
      </Grid>
    </Box>
  );
}

export default DashboardGrid;