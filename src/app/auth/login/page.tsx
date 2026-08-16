'use client';

import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Paper, Button, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      console.log('✅ Usuario autenticado con datos completos, redirigiendo a onboarding');
      router.push('/onboarding');
    }
  }, [status, session, router]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Iniciando proceso de login...');

      const result = await signIn('google', {
        callbackUrl: '/onboarding',
        redirect: false
      });

      console.log('📝 Resultado del login:', result);

      if (result?.error) {
        console.error('❌ Error al iniciar sesión:', result.error);
        let mensajeError = 'Error al iniciar sesión con Google';
        
        // Personalizar mensajes de error
        if (result.error.includes('AccessDenied')) {
          mensajeError = 'No tienes permiso para acceder a esta aplicación. Por favor, contacta al administrador.';
          console.error('❌ Error de acceso denegado:', result);
        } else if (result.error.includes('Configuration')) {
          mensajeError = 'Error de configuración en la autenticación. Por favor, contacta al administrador.';
          console.error('❌ Error de configuración:', result);
        } else if (result.error.includes('OAuth')) {
          mensajeError = 'Error en la autenticación con Google. Por favor, intenta nuevamente.';
          console.error('❌ Error de OAuth:', result);
        } else if (result.error.includes('Callback')) {
          mensajeError = 'Error en el proceso de autenticación. Por favor, intenta nuevamente.';
          console.error('❌ Error en callback:', result);
        }
        
        toast.error(mensajeError);
      } else if (result?.ok) {
        console.log('✅ Login exitoso, redirigiendo al dashboard...');
        toast.success('Inicio de sesión exitoso');
      }
    } catch (error) {
      console.error('❌ Error inesperado al iniciar sesión:', error);
      toast.error('Error inesperado al iniciar sesión. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Klosync
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Bienvenido a Klosync
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Inicia sesión con tu cuenta de Google para continuar
          </Typography>
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={handleLogin}
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Iniciar sesión con Google'}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
} 