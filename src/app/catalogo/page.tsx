'use client';

import { Box, Typography } from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { CatalogoList } from './CatalogoList';

export default function CatalogoPage() {
  return (
    <>
      <EncabezadoSistema />
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          pt: '70px',
        }}
      >
        <Box sx={{ px: 3, pt: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Catálogo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cargá productos, presupuestos y propuestas acá. En el chat solo los elegís para armar la respuesta.
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <CatalogoList />
          </Box>
        </Box>
      </Box>
    </>
  );
}
