// Dashboard Layout - Layout principal del dashboard con estructura responsive
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Drawer, 
  Toolbar, 
  Typography, 
  CircularProgress,
  Alert,
  Container,
  useTheme,
  useMediaQuery,
  IconButton,
  Button,
  Stack
} from './mui-components';
import { 
  Settings as SettingsIcon
} from '@mui/icons-material';
import { DashboardLayoutProps } from '../../../types/dashboard';
import { DashboardSidebar } from './DashboardSidebar';
import { EncabezadoSistema } from '../../componentes/EncabezadoSistema';
import { DashboardSettings } from './DashboardSettings';
import { FocusModeToggle } from './FocusMode';

// =====================================================
// Componente principal del layout del dashboard
// =====================================================

const drawerWidth = 280;

export function DashboardLayout({ user, preferences, children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // =====================================================
  // Efectos
  // =====================================================

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (status === 'loading') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Cargando dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <Box sx={{ textAlign: 'center', maxWidth: 400, p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Acceso no autorizado
            </Typography>
            <Typography variant="body2">
              Necesitas iniciar sesión para acceder al dashboard
            </Typography>
          </Alert>
          <IconButton
            onClick={() => window.location.href = '/auth/signin'}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              px: 3,
              py: 1,
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            <Typography variant="button">Iniciar Sesión</Typography>
          </IconButton>
        </Box>
      </Box>
    );
  }

  // =====================================================
  // Layout principal
  // =====================================================

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header unificado del sistema */}
      <EncabezadoSistema />

      {/* Contenido principal del dashboard */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sidebar del dashboard */}
        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            width: sidebarOpen ? drawerWidth : 0,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider',
              top: 70, // Ajustar para el header del sistema
              height: 'calc(100vh - 70px)',
              transition: theme.transitions.create('transform', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <DashboardSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            preferences={preferences}
            isMobile={isMobile}
          />
        </Drawer>

        {/* Contenido principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: 'background.default',
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            width: isMobile ? '100%' : `calc(100% - ${sidebarOpen ? drawerWidth : 0}px)`,
            minHeight: 'calc(100vh - 70px)',
            overflow: 'hidden'
          }}
        >
          {/* Header del dashboard con botón de collapse */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              p: 3,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Botón de collapse del sidebar */}
              <IconButton
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{ 
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' }
                }}
              >
                <Box 
                  component="svg" 
                  sx={{ 
                    width: 20, 
                    height: 20,
                    transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s'
                  }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </Box>
              </IconButton>

              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
              </Box>
            </Box>

            {/* Indicadores de estado y controles */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    bgcolor: 'success.main', 
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} 
                />
                <Typography variant="caption" color="text.secondary">
                  Tiempo real activo
                </Typography>
              </Box>
              
              <FocusModeToggle />
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => setSettingsOpen(true)}
              >
                Configuración
              </Button>
            </Stack>
          </Box>

          {/* Contenido scrolleable */}
          <Box sx={{ 
            height: 'calc(100vh - 70px - 80px)', // Altura total menos header del sistema y header del dashboard
            overflow: 'auto',
            p: 3
          }}>
            {children}
          </Box>
        </Box>
      </Box>

      {/* Indicador de modo concentración */}
      {preferences?.focus_mode && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.fab,
            bgcolor: 'secondary.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 3,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box 
            sx={{ 
              width: 8, 
              height: 8, 
              bgcolor: 'white', 
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} 
          />
          <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
            Modo Concentración
          </Typography>
        </Box>
      )}

      {/* Modal de configuración del dashboard */}
      <DashboardSettings 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </Box>
  );
}