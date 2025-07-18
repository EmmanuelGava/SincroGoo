// Dashboard Page - Página principal del dashboard de mensajería unificada
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Alert,
  CircularProgress,
  Button,
  Stack,
  Divider
} from './components/mui-components';
import { DashboardLayout } from './components/DashboardLayout';
import { MetricsOverview } from './components/MetricsOverview';
import { PlatformBreakdown } from './components/PlatformBreakdown';
import { PriorityConversations } from './components/PriorityConversations';
import { TasksPanel } from './components/TasksPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { DashboardSettings } from './components/DashboardSettings';
import { FocusMode, FocusModeToggle } from './components/FocusMode';
import { CustomObjectives } from './components/CustomObjectives';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useDashboardPreferences } from '../../hooks/useDashboardPreferences';
import { TimeRange, Platform, DashboardPreferences } from '../../types/dashboard';

// =====================================================
// Página principal del dashboard
// =====================================================

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Hook de preferencias del dashboard
  const {
    preferences,
    loading: preferencesLoading,
    updatePreferences,
    savePreferences,
    resetPreferences
  } = useDashboardPreferences();

  // Hook principal del dashboard
  const {
    data: dashboardData,
    loading,
    error,
    refetch
  } = useDashboardMetrics({
    timeRange,
    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
    refreshInterval: preferences?.refresh_interval ? preferences.refresh_interval * 1000 : 30000,
    enabled: !!session?.user?.id
  });

  // =====================================================
  // Handlers para personalización
  // =====================================================

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleSavePreferences = async () => {
    try {
      await savePreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleResetPreferences = async () => {
    try {
      await resetPreferences();
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  };

  // =====================================================
  // Handlers para interacciones
  // =====================================================

  const handleConversationClick = async (conversationId: string) => {
    console.log('Opening conversation:', conversationId);
    // La navegación se maneja en el componente PriorityConversations
  };

  const handleMarkImportant = async (conversationId: string, important: boolean) => {
    try {
      const response = await fetch('/api/dashboard/priority-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_important',
          conversationId,
          important
        }),
      });

      if (response.ok) {
        // Refrescar datos
        refetch();
      } else {
        console.error('Error marking conversation as important');
      }
    } catch (error) {
      console.error('Error marking conversation as important:', error);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const response = await fetch('/api/dashboard/tasks/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          taskId
        }),
      });

      if (response.ok) {
        // Refrescar datos
        refetch();
      } else {
        console.error('Error completing task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskSnooze = async (taskId: string, snoozeMinutes: number) => {
    try {
      const response = await fetch('/api/dashboard/tasks/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'snooze',
          taskId,
          snoozeMinutes
        }),
      });

      if (response.ok) {
        // Refrescar datos
        refetch();
      } else {
        console.error('Error snoozing task');
      }
    } catch (error) {
      console.error('Error snoozing task:', error);
    }
  };

  const handleTaskCreate = async (taskData: any) => {
    try {
      const response = await fetch('/api/dashboard/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        // Refrescar datos
        refetch();
      } else {
        console.error('Error creating task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (status === 'loading' || !preferences) {
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
          <CircularProgress size={48} sx={{ mb: 2 }} />
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
        </Box>
      </Box>
    );
  }

  // =====================================================
  // Render principal
  // =====================================================

  return (
    <DashboardLayout
      user={session?.user}
      preferences={preferences}
    >
      <Stack spacing={3}>
        {/* Sección de métricas generales */}
        {preferences.visible_sections.includes('metrics') && (
          <Box id="section-overview">
            <Paper sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <MetricsOverview
                  timeRange={timeRange}
                  realTimeData={{
                    activeConversations: dashboardData?.overview?.activeConversations || 0,
                    pendingResponses: dashboardData?.overview?.pendingResponses || 0,
                    averageResponseTime: dashboardData?.overview?.averageResponseTime || 0,
                    conversionRate: dashboardData?.overview?.conversionRate || 0,
                    platformBreakdown: dashboardData?.platformBreakdown || [],
                    trends: dashboardData?.trends || [],
                    lastUpdated: dashboardData?.lastUpdated || new Date().toISOString()
                  }}
                  comparisonEnabled={true}
                  onTimeRangeChange={setTimeRange}
                />
              </Box>
            </Paper>
          </Box>
        )}

        {/* Grid de secciones principales */}
        <Grid container spacing={0} sx={{ alignItems: 'stretch' }}>
          {/* Breakdown por plataforma */}
          {preferences.visible_sections.includes('metrics') && (
            <Grid item xs={12} lg={6} sx={{ display: 'flex', pr: { xs: 0, lg: 1.5 } }}>
              <Paper sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3 }}>
                  <PlatformBreakdown
                    timeRange={timeRange}
                    selectedPlatforms={selectedPlatforms}
                    onPlatformFilter={setSelectedPlatforms}
                    showConnectionStatus={true}
                    compactView={preferences.layout_type === 'compact'}
                  />
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Conversaciones prioritarias */}
          {preferences.visible_sections.includes('conversations') && (
            <Grid item xs={12} lg={6} sx={{ display: 'flex', pl: { xs: 0, lg: 1.5 } }} id="section-conversations">
              <Paper sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3 }}>
                  <PriorityConversations
                    conversations={[]}
                    loading={loading}
                    onConversationClick={handleConversationClick}
                    onMarkImportant={handleMarkImportant}
                    onRefresh={refetch}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Grid de secciones secundarias */}
        <Grid container spacing={0} sx={{ alignItems: 'stretch' }}>
          {/* Panel de tareas */}
          {preferences.visible_sections.includes('tasks') && (
            <Grid item xs={12} lg={8} sx={{ display: 'flex', pr: { xs: 0, lg: 1.5 } }} id="section-tasks">
              <Paper sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3 }}>
                  <TasksPanel
                    tasks={[]}
                    loading={loading}
                    onTaskComplete={handleTaskComplete}
                    onTaskSnooze={handleTaskSnooze}
                    onTaskCreate={handleTaskCreate}
                    onRefresh={refetch}
                  />
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Centro de notificaciones */}
          {preferences.visible_sections.includes('notifications') && (
            <Grid item xs={12} lg={4} sx={{ display: 'flex', pl: { xs: 0, lg: 1.5 } }}>
              <Paper sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3 }}>
                  <NotificationCenter
                    notifications={[]}
                    alerts={dashboardData?.alerts || []}
                    onNotificationRead={(id) => console.log('Mark notification as read:', id)}
                    onAlertDismiss={(id) => console.log('Dismiss alert:', id)}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Sección de Modo Concentración */}
        {preferences.focus_mode && (
          <Box id="section-focus-mode">
            <Paper sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <FocusMode />
              </Box>
            </Paper>
          </Box>
        )}

        {/* Sección de Objetivos Personalizados */}
        {preferences.visible_sections.includes('analytics') && (
          <Box id="section-objectives">
            <Paper sx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <CustomObjectives
                  currentMetrics={{
                    averageResponseTime: dashboardData?.overview?.averageResponseTime || 0,
                    dailyConversations: dashboardData?.overview?.activeConversations || 0,
                    conversionRate: dashboardData?.overview?.conversionRate || 0,
                    activeConversations: dashboardData?.overview?.activeConversations || 0
                  }}
                />
              </Box>
            </Paper>
          </Box>
        )}

        {/* Información de estado */}
        <Paper sx={{ p: 0, bgcolor: 'grey.50' }}>
          <Box sx={{ p: 3 }}>
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
            >
              <Stack direction="row" spacing={3} alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main'
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Conectado
                  </Typography>
                </Stack>
                {dashboardData?.lastUpdated && (
                  <Typography variant="body2" color="text.secondary">
                    Última actualización: {new Date(dashboardData.lastUpdated).toLocaleTimeString('es-ES')}
                  </Typography>
                )}
              </Stack>
              
              <Stack direction="row" spacing={1}>
                <Button
                  onClick={refetch}
                  disabled={loading}
                  size="small"
                  variant="text"
                >
                  Actualizar
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  size="small"
                  variant="text"
                  color="inherit"
                >
                  Limpiar Cache
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Stack>
    </DashboardLayout>
  );
}