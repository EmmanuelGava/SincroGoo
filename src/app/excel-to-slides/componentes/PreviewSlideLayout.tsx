'use client';

import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { MapeoColumna } from '../modelos/diapositiva';

interface PreviewSlideLayoutProps {
  mapeoColumnas?: MapeoColumna[];
  datosEjemplo?: { [key: string]: string };
}

const PreviewSlideLayout: React.FC<PreviewSlideLayoutProps> = ({ 
  mapeoColumnas = [],
  datosEjemplo = {}
}) => {
  const theme = useTheme();

  // Encontrar el valor para cada tipo de elemento
  const encontrarValor = (tipo: string) => {
    return datosEjemplo[tipo] || '';
  };

  return (
    <Paper 
      sx={{ 
        p: 0,
        width: '600px',
        height: '338px',
        position: 'relative',
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        overflow: 'hidden',
        boxShadow: theme.shadows[3]
      }}
    >
      {/* Área del Título */}
      <Box
        sx={{
          position: 'absolute',
          top: '20px',
          left: '50px',
          right: '50px',
          minHeight: '44px',
          borderBottom: `1px solid ${theme.palette.primary.main}`,
          color: theme.palette.primary.main,
          fontSize: '28px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {encontrarValor('titulo_principal')}
      </Box>

      {/* Área del Subtítulo */}
      <Box
        sx={{
          position: 'absolute',
          top: '80px',
          left: '50px',
          right: '50px',
          minHeight: '32px',
          color: theme.palette.text.secondary,
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {encontrarValor('subtitulo_principal')}
      </Box>

      {/* Área del Contenido Principal */}
      <Box
        sx={{
          position: 'absolute',
          top: '130px',
          left: '50px',
          right: '50px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '20px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {encontrarValor('contenido_principal')}
      </Box>

      {/* Área de Contenido Secundario */}
      <Box
        sx={{
          position: 'absolute',
          top: '220px',
          left: '50px',
          right: '50px',
          minHeight: '32px',
          color: theme.palette.text.secondary,
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {encontrarValor('contenido_secundario')}
      </Box>

      {/* Área de Notas */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '40px',
          left: '50px',
          right: '50px',
          minHeight: '24px',
          color: theme.palette.text.secondary,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {encontrarValor('notas')}
      </Box>

      {/* Área del Pie de Página */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '10px',
          left: '50px',
          right: '50px',
          minHeight: '24px',
          color: theme.palette.text.secondary,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {encontrarValor('pie_pagina')}
      </Box>

      {/* Guías de alineación */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50px',
          width: '1px',
          height: '100%',
          backgroundColor: theme.palette.divider,
          opacity: 0.2,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: '50px',
          width: '1px',
          height: '100%',
          backgroundColor: theme.palette.divider,
          opacity: 0.2,
        }}
      />
    </Paper>
  );
};

export default PreviewSlideLayout; 