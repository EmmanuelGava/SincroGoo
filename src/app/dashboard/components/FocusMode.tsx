// Focus Mode - Componente para modo concentración del dashboard
// Fecha: 2025-01-17

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Fade,
  Collapse,
  Alert,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  DoNotDisturb as FocusIcon,
  NotificationsOff as NotificationsOffIcon,
  Timer as TimerIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  TrendingUp as ProductivityIcon
} from '@mui/icons-material';
import { useFocusMode } from '../../../hooks/useDashboardPreferences';

// =====================================================
// Interfaces
// =====================================================

interface FocusModeProps {
  onFocusModeChange?: (enabled: boolean) => void;
}

interface FocusSession {
  id: string;
  startTime: Date;
  duration: number; // en minutos
  isActive: boolean;
  pausedTime?: number;
  completedTasks: number;
  blockedNotifications: number;
}

// =====================================================
// Componente principal
// =====================================================

export function FocusMode({ onFocusModeChange }: FocusModeProps) {
  const { focusMode, toggleFocusMode } = useFocusMode();
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState(25); // Pomodoro por defecto
  const [showSettings, setShowSettings] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // =====================================================
  // Efectos para el timer
  // =====================================================

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentSession?.isActive) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);

        // Auto-completar sesión cuando se alcanza la duración
        if (elapsed >= sessionDuration * 60) {
          handleStopSession();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession, sessionDuration]);

  // =====================================================
  // Notificar cambios de modo concentración
  // =====================================================

  useEffect(() => {
    onFocusModeChange?.(focusMode);
  }, [focusMode, onFocusModeChange]);

  // =====================================================
  // Handlers
  // =====================================================

  const handleToggleFocusMode = () => {
    toggleFocusMode();
    
    if (!focusMode) {
      // Activar modo concentración
      startFocusSession();
    } else {
      // Desactivar modo concentración
      handleStopSession();
    }
  };

  const startFocusSession = () => {
    const newSession: FocusSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      duration: sessionDuration,
      isActive: true,
      completedTasks: 0,
      blockedNotifications: 0
    };

    setCurrentSession(newSession);
    setElapsedTime(0);

    // Solicitar permisos de notificación si no están concedidos
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePauseSession = () => {
    if (!currentSession) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      isActive: false,
      pausedTime: elapsedTime
    } : null);
  };

  const handleResumeSession = () => {
    if (!currentSession) return;

    setCurrentSession(prev => prev ? {
      ...prev,
      isActive: true,
      startTime: new Date(Date.now() - (prev.pausedTime || 0) * 1000)
    } : null);
  };

  const handleStopSession = () => {
    if (currentSession && elapsedTime >= sessionDuration * 60 * 0.8) {
      // Sesión completada exitosamente (al menos 80% del tiempo)
      showCompletionNotification();
    }

    setCurrentSession(null);
    setElapsedTime(0);
    
    if (focusMode) {
      toggleFocusMode();
    }
  };

  const showCompletionNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('¡Sesión de concentración completada!', {
        body: `Has completado ${sessionDuration} minutos de trabajo concentrado.`,
        icon: '/favicon.ico'
      });
    }
  };

  // =====================================================
  // Funciones auxiliares
  // =====================================================

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!currentSession) return 0;
    return Math.min((elapsedTime / (sessionDuration * 60)) * 100, 100);
  };

  const getRemainingTime = () => {
    const totalSeconds = sessionDuration * 60;
    const remaining = Math.max(totalSeconds - elapsedTime, 0);
    return remaining;
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <Box>
      {/* Toggle principal del modo concentración */}
      <Card
        sx={{
          border: 2,
          borderColor: focusMode ? 'secondary.main' : 'divider',
          bgcolor: focusMode ? 'secondary.50' : 'background.paper',
          transition: 'all 0.3s ease'
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: focusMode ? 'secondary.main' : 'grey.300',
                  color: 'white'
                }}
              >
                <FocusIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  Modo Concentración
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {focusMode 
                    ? 'Activo - Notificaciones pausadas' 
                    : 'Inactivo - Todas las notificaciones habilitadas'
                  }
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                onClick={() => setShowSettings(!showSettings)}
                size="small"
                color="inherit"
              >
                <SettingsIcon />
              </IconButton>
              <Switch
                checked={focusMode}
                onChange={handleToggleFocusMode}
                color="secondary"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Configuración del modo concentración */}
      <Collapse in={showSettings}>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Configuración de Sesión
            </Typography>
            
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Duración de la sesión: {sessionDuration} minutos
                </Typography>
                <Stack direction="row" spacing={1}>
                  {[15, 25, 45, 60].map((duration) => (
                    <Chip
                      key={duration}
                      label={`${duration}m`}
                      onClick={() => setSessionDuration(duration)}
                      color={sessionDuration === duration ? 'secondary' : 'default'}
                      variant={sessionDuration === duration ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
              </Box>

              <Stack spacing={1}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Bloquear notificaciones del navegador"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Pausar alertas sonoras"
                />
                <FormControlLabel
                  control={<Switch />}
                  label="Mostrar solo métricas esenciales"
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      {/* Sesión activa */}
      <Fade in={!!currentSession}>
        <Card sx={{ mt: 2, border: 2, borderColor: 'secondary.main' }}>
          <CardContent>
            <Stack spacing={3}>
              {/* Header de la sesión */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TimerIcon color="secondary" />
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      Sesión en Progreso
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentSession?.isActive ? 'Concentrándote...' : 'En pausa'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  {currentSession?.isActive ? (
                    <IconButton onClick={handlePauseSession} color="secondary">
                      <PauseIcon />
                    </IconButton>
                  ) : (
                    <IconButton onClick={handleResumeSession} color="secondary">
                      <PlayIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={handleStopSession} color="error">
                    <StopIcon />
                  </IconButton>
                </Stack>
              </Stack>

              {/* Timer y progreso */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h4" fontWeight="bold" color="secondary.main">
                    {formatTime(getRemainingTime())}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(getProgressPercentage())}% completado
                  </Typography>
                </Stack>
                
                <LinearProgress
                  variant="determinate"
                  value={getProgressPercentage()}
                  color="secondary"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Estadísticas de la sesión */}
              <Stack direction="row" spacing={3}>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    {currentSession?.completedTasks || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tareas completadas
                  </Typography>
                </Box>
                
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold" color="warning.main">
                    {currentSession?.blockedNotifications || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Notificaciones bloqueadas
                  </Typography>
                </Box>
                
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatTime(elapsedTime)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tiempo transcurrido
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Fade>

      {/* Indicador flotante cuando está activo */}
      {focusMode && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1300,
            bgcolor: 'secondary.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 3,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            animation: 'pulse 2s infinite'
          }}
        >
          <NotificationsOffIcon fontSize="small" />
          <Typography variant="caption" fontWeight="medium">
            Modo Concentración
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// =====================================================
// Componente compacto para el header
// =====================================================

export function FocusModeToggle() {
  const { focusMode, toggleFocusMode } = useFocusMode();

  return (
    <Button
      onClick={toggleFocusMode}
      variant={focusMode ? "contained" : "outlined"}
      color="secondary"
      size="small"
      startIcon={<FocusIcon />}
      sx={{
        minWidth: 'auto',
        ...(focusMode && {
          animation: 'pulse 2s infinite'
        })
      }}
    >
      {focusMode ? 'Concentración' : 'Concentrarse'}
    </Button>
  );
}