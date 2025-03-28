'use client';

import { useState } from 'react';
import { authService } from '@/servicios/supabase/globales/auth-service';
import { Box, AppBar, Toolbar, Typography, Container, Paper, Button, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirigir si ya está autenticado
  if (status === 'authenticated') {
    router.push('/dashboard');
    return null;
  }

  const handleLogin = async (provider: string) => {
    try {
      setIsLoading(true);
      await authService.signIn(provider);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Encabezado del Sistema */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SincroGoo
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Contenido Principal */}
      <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2
          }}
        >
          <Typography component="h1" variant="h5" gutterBottom>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Accede a tu cuenta para continuar
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={() => handleLogin('google')}
            disabled={isLoading}
            fullWidth
            sx={{ 
              mt: 2,
              mb: 2,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Continuar con Google'
            )}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
} 