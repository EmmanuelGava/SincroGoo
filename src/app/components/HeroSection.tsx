'use client';
import { Box, Button, useTheme } from '@mui/material';
import GoogleSyncAnimation from '@/app/componentes/GoogleSyncAnimation';

export default function HeroSection() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'visible',
        backgroundColor: 'transparent',
        minHeight: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 96px)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '140%',
          height: '140%',
          transform: 'translate(-50%, -50%)',
          background: theme => `
            radial-gradient(circle at 30% 20%, ${theme.palette.mode === 'dark' ? 'rgba(66, 133, 244, 0.08)' : 'rgba(66, 133, 244, 0.15)'} 0%, transparent 40%),
            radial-gradient(circle at 70% 65%, ${theme.palette.mode === 'dark' ? 'rgba(15, 157, 88, 0.06)' : 'rgba(15, 157, 88, 0.12)'} 0%, transparent 35%),
            radial-gradient(circle at 85% 25%, ${theme.palette.mode === 'dark' ? 'rgba(219, 68, 55, 0.05)' : 'rgba(219, 68, 55, 0.1)'} 0%, transparent 45%),
            radial-gradient(circle at 15% 75%, ${theme.palette.mode === 'dark' ? 'rgba(251, 188, 5, 0.04)' : 'rgba(251, 188, 5, 0.08)'} 0%, transparent 40%),
            linear-gradient(135deg, ${theme.palette.mode === 'dark' ? 'rgba(66, 133, 244, 0.08)' : 'rgba(66, 133, 244, 0.15)'} 0%, 
                          ${theme.palette.mode === 'dark' ? 'rgba(15, 157, 88, 0.06)' : 'rgba(15, 157, 88, 0.12)'} 50%, 
                          ${theme.palette.mode === 'dark' ? 'rgba(219, 68, 55, 0.05)' : 'rgba(219, 68, 55, 0.1)'} 100%)
          `,
          borderRadius: '70% 30% 50% 50% / 30% 50% 70% 40%',
          animation: 'morphBackground 15s ease-in-out infinite alternate',
          filter: 'blur(24px)',
          zIndex: 0,
          opacity: theme.palette.mode === 'dark' ? 0.5 : 0.9
        },
        '@keyframes morphBackground': {
          '0%': { borderRadius: '70% 30% 50% 50% / 30% 50% 70% 40%' },
          '25%': { borderRadius: '50% 50% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '75%': { borderRadius: '60% 40% 30% 70% / 40% 40% 60% 50%' },
          '100%': { borderRadius: '40% 60% 60% 40% / 70% 30% 50% 50%' }
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -20,
          left: 0,
          right: 0,
          height: '80px',
          background: theme => `linear-gradient(to bottom, transparent, ${theme.palette.background.default})`,
          pointerEvents: 'none',
          zIndex: 1
        }
      }}
    >
      {/* Blobs animados */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 1
        }}
      >
        {/* Blob 1 */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '35%',
            height: '35%',
            background: theme => `radial-gradient(circle at center, ${theme.palette.mode === 'dark' ? 'rgba(66, 133, 244, 0.08)' : 'rgba(66, 133, 244, 0.15)'}, transparent 70%)`,
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            animation: 'floatBlob1 20s ease-in-out infinite',
            '@keyframes floatBlob1': {
              '0%, 100%': {
                transform: 'translate(0, 0) rotate(0deg)',
              },
              '50%': {
                transform: 'translate(5%, 10%) rotate(180deg)',
              }
            }
          }}
        />

        {/* Blob 2 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: '40%',
            height: '40%',
            background: theme => `radial-gradient(circle at center, ${theme.palette.mode === 'dark' ? 'rgba(15, 157, 88, 0.06)' : 'rgba(15, 157, 88, 0.12)'}, transparent 70%)`,
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            animation: 'floatBlob2 25s ease-in-out infinite',
            '@keyframes floatBlob2': {
              '0%, 100%': {
                transform: 'translate(0, 0) rotate(0deg)',
              },
              '50%': {
                transform: 'translate(-5%, -10%) rotate(-180deg)',
              }
            }
          }}
        />

        {/* Blob 3 */}
        <Box
          sx={{
            position: 'absolute',
            top: '30%',
            right: '25%',
            width: '30%',
            height: '30%',
            background: theme => `radial-gradient(circle at center, ${theme.palette.mode === 'dark' ? 'rgba(219, 68, 55, 0.05)' : 'rgba(219, 68, 55, 0.1)'}, transparent 70%)`,
            borderRadius: '50% 50% 30% 70% / 60% 30% 70% 40%',
            animation: 'floatBlob3 22s ease-in-out infinite',
            '@keyframes floatBlob3': {
              '0%, 100%': {
                transform: 'translate(0, 0) rotate(0deg)',
              },
              '50%': {
                transform: 'translate(8%, -5%) rotate(120deg)',
              }
            }
          }}
        />
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: { xs: '20px', sm: '40px' },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: '40px', md: '0' }
        }}
      >
        {/* Contenido izquierdo */}
        <Box
          sx={{
            flex: '1',
            maxWidth: { xs: '100%', md: '50%' },
            textAlign: { xs: 'center', md: 'left' },
            px: { xs: 2, sm: 4, md: 6 },
            order: { xs: 0, md: 0 }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              alignItems: { xs: 'center', md: 'flex-start' }
            }}
          >
            <Box
              component="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 600,
                lineHeight: 1.2,
                color: theme => theme.palette.mode === 'dark' ? '#E2E8F0' : '#2D3748',
                margin: 0
              }}
            >
              Sincronización
              <Box
                component="span"
                sx={{
                  display: 'block',
                  background: theme => theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, #60A5FA, #34D399)'
                    : 'linear-gradient(135deg, #4285F4, #0F9D58)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                inteligente y automática
              </Box>
            </Box>
            
            <Box
              sx={{
                fontSize: '1.25rem',
                color: theme => theme.palette.mode === 'dark' ? '#CBD5E0' : '#4A5568',
                lineHeight: 1.6,
                maxWidth: '540px'
              }}
            >
              Realiza la gestión de tus documentos de forma automática. Sincroniza y organiza archivos desde múltiples fuentes en un solo lugar.
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: '16px',
                marginTop: '32px'
              }}
            >
              <Button
                variant="contained"
                href="/src/proyectos"
                sx={{
                  padding: '12px 24px',
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#60A5FA' : '#4285F4',
                  '&:hover': {
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#3B82F6' : '#3367D6',
                    transform: 'translateY(-2px)',
                    boxShadow: theme => theme.palette.mode === 'dark' 
                      ? '0 4px 12px rgba(96, 165, 250, 0.4)'
                      : '0 4px 12px rgba(66, 133, 244, 0.3)'
                  }
                }}
              >
                Comenzar ahora
              </Button>
              <Button
                variant="outlined"
                href="/demo"
                sx={{
                  padding: '12px 24px',
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  borderColor: theme => theme.palette.mode === 'dark' ? '#60A5FA' : '#4285F4',
                  color: theme => theme.palette.mode === 'dark' ? '#60A5FA' : '#4285F4',
                  '&:hover': {
                    borderColor: theme => theme.palette.mode === 'dark' ? '#3B82F6' : '#3367D6',
                    backgroundColor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(96, 165, 250, 0.1)'
                      : 'rgba(66, 133, 244, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: theme => theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(96, 165, 250, 0.2)'
                      : '0 4px 12px rgba(66, 133, 244, 0.15)'
                  }
                }}
              >
                Ver demo
              </Button>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                marginTop: '32px',
                color: theme => theme.palette.mode === 'dark' ? '#A0AEC0' : '#718096',
                fontSize: '0.875rem'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box 
                  component="span" 
                  sx={{ 
                    color: theme => theme.palette.mode === 'dark' ? '#4FD1C5' : '#48BB78'
                  }}
                >
                  ✓
                </Box>
                No requiere tarjeta
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box 
                  component="span" 
                  sx={{ 
                    color: theme => theme.palette.mode === 'dark' ? '#4FD1C5' : '#48BB78'
                  }}
                >
                  ✓
                </Box>
                Prueba gratuita ilimitada
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Componente de animación (lado derecho) */}
        <Box
          sx={{
            flex: '1',
            width: '100%',
            maxWidth: { xs: '100%', md: '600px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pr: { xs: 0, lg: '40px' },
            transform: { 
              xs: 'none',
              md: 'translateX(-55%)'
            },
            order: { xs: 1, md: 0 }
          }}
        >
          <GoogleSyncAnimation />
        </Box>
      </Box>
    </Box>
  );
} 