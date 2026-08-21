'use client';

import { Box, Typography } from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { ContactosList } from './ContactosList';

export default function ContactosPage() {
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
            Contactos
          </Typography>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <ContactosList />
          </Box>
        </Box>
      </Box>
    </>
  );
}
