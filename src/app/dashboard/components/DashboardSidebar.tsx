// Dashboard Sidebar - Sidebar de navegación del dashboard
// Fecha: 2025-01-16

'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  Paper,
  Badge
} from './mui-components';

// Iconos personalizados usando SVG
const DashboardIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4M16 5v4" />
  </Box>
);

const ChatIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </Box>
);

const TasksIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </Box>
);

const AnalyticsIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </Box>
);

const SettingsIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </Box>
);

// =====================================================
// Interfaces
// =====================================================

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: any;
  isMobile: boolean;
}

// =====================================================
// Componente del Sidebar del Dashboard
// =====================================================

export function DashboardSidebar({ isOpen, onClose, preferences, isMobile }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('overview');

  const sidebarItems = [
    { 
      id: 'overview', 
      label: 'Resumen', 
      icon: <DashboardIcon />, 
      href: '/dashboard',
      badge: 0
    },
    { 
      id: 'conversations', 
      label: 'Conversaciones', 
      icon: <ChatIcon />, 
      href: '/chat',
      badge: 5 
    },
    { 
      id: 'tasks', 
      label: 'Tareas', 
      icon: <TasksIcon />, 
      href: '/dashboard?section=tasks',
      badge: 3 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: <AnalyticsIcon />,
      href: '/dashboard?section=analytics',
      badge: 0
    },
    { 
      id: 'settings', 
      label: 'Configuración', 
      icon: <SettingsIcon />,
      href: '/configuracion',
      badge: 0
    },
  ];

  const handleItemClick = (item: typeof sidebarItems[0]) => {
    setActiveSection(item.id);
    
    // Navegación real
    if (item.href.startsWith('/dashboard?section=')) {
      // Para secciones del dashboard, usar scroll o mostrar/ocultar secciones
      const section = item.href.split('section=')[1];
      const element = document.getElementById(`section-${section}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Para otras páginas, navegar normalmente
      router.push(item.href);
    }
    
    if (isMobile) {
      onClose();
    }
  };

  // Determinar sección activa basada en la URL
  React.useEffect(() => {
    if (pathname === '/dashboard') {
      setActiveSection('overview');
    } else if (pathname === '/chat') {
      setActiveSection('conversations');
    } else if (pathname === '/configuracion') {
      setActiveSection('settings');
    }
  }, [pathname]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Navegación principal */}
      <Box sx={{ p: 2 }}>
        <List>
          {sidebarItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleItemClick(item)}
                selected={activeSection === item.id}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: activeSection === item.id ? 'primary.main' : 'text.secondary',
                    minWidth: 40
                  }}
                >
                  {item.badge && item.badge > 0 ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: activeSection === item.id ? 'medium' : 'regular',
                    fontSize: '0.875rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* Secciones visibles */}
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="overline" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 'medium',
            letterSpacing: 1,
            mb: 1,
            display: 'block'
          }}
        >
          Secciones Activas
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {(preferences?.visible_sections || []).map((section: string) => (
            <Box 
              key={section} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}
            >
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%',
                  bgcolor: 'success.main' 
                }} 
              />
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ textTransform: 'capitalize' }}
              >
                {section}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider />

      {/* Configuración rápida */}
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'grey.50',
            border: 1,
            borderColor: 'grey.200'
          }}
        >
          <Typography 
            variant="subtitle2" 
            color="text.primary" 
            sx={{ mb: 1.5, fontWeight: 'medium' }}
          >
            Configuración Rápida
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Actualización
              </Typography>
              <Chip 
                label={`${preferences?.refresh_interval || 30}s`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Layout
              </Typography>
              <Chip 
                label={preferences?.layout_type || 'expanded'}
                size="small"
                variant="outlined"
                sx={{ 
                  height: 20, 
                  fontSize: '0.75rem',
                  textTransform: 'capitalize'
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}