"use client"

import { useSearchParams } from 'next/navigation';
import { Box, AppBar, Toolbar, Typography, Container, Paper, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'Hay un problema con la configuración del servidor. Por favor, contacta al administrador.';
      case 'AccessDenied':
        return 'No tienes permiso para acceder a esta aplicación.';
      case 'Verification':
        return 'El enlace de verificación ha expirado o ya ha sido usado.';
      case 'TokensNotFound':
        return 'No se pudieron obtener los tokens necesarios para la autenticación.';
      case 'GoogleDataError':
        return 'No se pudieron obtener los datos de tu cuenta de Google.';
      case 'SupabaseError':
        return 'Hubo un problema al sincronizar tu cuenta con nuestro sistema.';
      case 'UnknownError':
        return 'Ha ocurrido un error inesperado durante la autenticación.';
      default:
        return 'Ha ocurrido un error durante la autenticación. Por favor, intenta de nuevo.';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SincroGoo
          </Typography>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2
          }}
        >
          <Typography component="h1" variant="h5" gutterBottom color="error" sx={{ mb: 2 }}>
            Error de Autenticación
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            {getErrorMessage()}
          </Typography>
          
          <Button
            variant="contained"
            onClick={() => router.push('/auth/login')}
            fullWidth
            sx={{ 
              mt: 2,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            Volver al inicio de sesión
          </Button>
        </Paper>
      </Container>
    </Box>
  );
} 