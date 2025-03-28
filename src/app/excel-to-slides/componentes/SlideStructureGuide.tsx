'use client';

import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';

const SlideStructureGuide: React.FC = () => {
  const theme = useTheme();

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
      {/* Título Principal */}
      <Box
        sx={{
          position: 'absolute',
          top: '20px',
          left: '50px',
          right: '50px',
          minHeight: '44px',
          border: `2px dashed ${theme.palette.primary.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.primary.main,
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        <Typography variant="body2">Título Principal</Typography>
      </Box>

      {/* Subtítulo */}
      <Box
        sx={{
          position: 'absolute',
          top: '80px',
          left: '50px',
          right: '50px',
          minHeight: '32px',
          border: `2px dashed ${theme.palette.secondary.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.secondary.main,
          fontSize: '14px'
        }}
      >
        <Typography variant="body2">Subtítulo</Typography>
      </Box>

      {/* Contenido Principal */}
      <Box
        sx={{
          position: 'absolute',
          top: '130px',
          left: '50px',
          right: '50px',
          height: '80px',
          border: `2px dashed ${theme.palette.success.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.success.main,
          fontSize: '14px'
        }}
      >
        <Typography variant="body2">Contenido Principal</Typography>
      </Box>

      {/* Contenido Secundario */}
      <Box
        sx={{
          position: 'absolute',
          top: '220px',
          left: '50px',
          right: '50px',
          minHeight: '32px',
          border: `2px dashed ${theme.palette.info.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.info.main,
          fontSize: '14px'
        }}
      >
        <Typography variant="body2">Contenido Secundario</Typography>
      </Box>

      {/* Notas */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '40px',
          left: '50px',
          right: '50px',
          minHeight: '24px',
          border: `2px dashed ${theme.palette.warning.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.warning.main,
          fontSize: '12px'
        }}
      >
        <Typography variant="body2">Notas</Typography>
      </Box>

      {/* Pie de Página */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '10px',
          left: '50px',
          right: '50px',
          minHeight: '24px',
          border: `2px dashed ${theme.palette.error.main}`,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.error.main,
          fontSize: '12px'
        }}
      >
        <Typography variant="body2">Pie de Página</Typography>
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

export default SlideStructureGuide; 