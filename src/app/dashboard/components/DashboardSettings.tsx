// Dashboard Settings - Componente de configuración y personalización del dashboard
// Fecha: 2025-01-17

'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  Divider,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  List,
  ListItem
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  RestoreFromTrash as ResetIcon,
  DragIndicator as DragIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';
import { useFocusMode } from '../../../hooks/useFocusMode';
import { LayoutType, DashboardSection } from '../../../types/dashboard';

// =====================================================
// Interfaces
// =====================================================

interface DashboardSettingsProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (preferences: any) => void;
}

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  visible: boolean;
  order: number;
}

interface DraggableSectionProps {
  section: SectionConfig;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onToggleVisibility: (id: string) => void;
}

// =====================================================
// Componente principal
// =====================================================

export function DashboardSettings({ open, onClose }: DashboardSettingsProps) {
  const { preferences, loading, error, updatePreferences, savePreferences, resetPreferences } = useDashboardPreferences();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // =====================================================
  // Configuración de secciones disponibles
  // =====================================================

  const availableSections: SectionConfig[] = [
    {
      id: 'metrics',
      title: 'Métricas Generales',
      description: 'Resumen de conversaciones activas, tiempo de respuesta y métricas clave',
      icon: <SettingsIcon />,
      visible: preferences?.visible_sections.includes('metrics') || false,
      order: 1
    },
    {
      id: 'conversations',
      title: 'Conversaciones Prioritarias',
      description: 'Lista de conversaciones que requieren atención inmediata',
      icon: <SettingsIcon />,
      visible: preferences?.visible_sections.includes('conversations') || false,
      order: 2
    },
    {
      id: 'tasks',
      title: 'Tareas Pendientes',
      description: 'Gestión de tareas y seguimientos programados',
      icon: <SettingsIcon />,
      visible: preferences?.visible_sections.includes('tasks') || false,
      order: 3
    },
    {
      id: 'notifications',
      title: 'Centro de Notificaciones',
      description: 'Alertas y notificaciones en tiempo real',
      icon: <SettingsIcon />,
      visible: preferences?.visible_sections.includes('notifications') || false,
      order: 4
    },
    {
      id: 'analytics',
      title: 'Analytics Avanzados',
      description: 'Gráficos y análisis detallados de rendimiento',
      icon: <SettingsIcon />,
      visible: preferences?.visible_sections.includes('analytics') || false,
      order: 5
    }
  ];

  // =====================================================
  // Handlers
  // =====================================================

  const handleLayoutChange = (layout: LayoutType) => {
    updatePreferences({ layout_type: layout });
  };

  const handleSectionToggle = (sectionId: string) => {
    if (!preferences) return;

    const currentSections = preferences.visible_sections;
    const newSections = currentSections.includes(sectionId)
      ? currentSections.filter(id => id !== sectionId)
      : [...currentSections, sectionId];

    updatePreferences({ visible_sections: newSections });
  };

  const handleRefreshIntervalChange = (interval: number) => {
    updatePreferences({ refresh_interval: interval });
  };

  const handleNotificationSettingChange = (setting: string, value: boolean) => {
    if (!preferences) return;

    updatePreferences({
      notification_settings: {
        ...preferences.notification_settings,
        [setting]: value
      }
    });
  };

  const handleQuietHoursChange = (field: string, value: string | boolean) => {
    if (!preferences) return;

    updatePreferences({
      notification_settings: {
        ...preferences.notification_settings,
        quiet_hours: {
          ...preferences.notification_settings.quiet_hours,
          [field]: value
        }
      }
    });
  };

  const handleThemeChange = (setting: string, value: any) => {
    if (!preferences) return;

    updatePreferences({
      theme_preferences: {
        ...preferences.theme_preferences,
        [setting]: value
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await savePreferences();
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetPreferences();
      setShowResetDialog(false);
    } catch (err) {
      console.error('Error resetting preferences:', err);
    } finally {
      setResetting(false);
    }
  };

  // =====================================================
  // Estados de carga
  // =====================================================

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!preferences) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Error al cargar las preferencias del dashboard
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  // =====================================================
  // Render principal
  // =====================================================

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <SettingsIcon />
              <Typography variant="h6">Configuración del Dashboard</Typography>
            </Stack>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={4} sx={{ mt: 2 }}>
            {/* Error display */}
            {error && (
              <Alert severity="error">
                {error.message}
              </Alert>
            )}

            {/* Layout Configuration */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Diseño del Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configura cómo se muestran las secciones en tu dashboard
                </Typography>

                <Stack spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Layout</InputLabel>
                    <Select
                      value={preferences.layout_type}
                      onChange={(e) => handleLayoutChange(e.target.value as LayoutType)}
                      label="Tipo de Layout"
                    >
                      <MenuItem value="compact">Compacto</MenuItem>
                      <MenuItem value="expanded">Expandido</MenuItem>
                      <MenuItem value="custom">Personalizado</MenuItem>
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Intervalo de Actualización: {preferences.refresh_interval}s
                    </Typography>
                    <Slider
                      value={preferences.refresh_interval}
                      onChange={(_, value) => handleRefreshIntervalChange(value as number)}
                      min={10}
                      max={300}
                      step={10}
                      marks={[
                        { value: 10, label: '10s' },
                        { value: 30, label: '30s' },
                        { value: 60, label: '1m' },
                        { value: 300, label: '5m' }
                      ]}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Sections Configuration */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Secciones Visibles
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Selecciona y reorganiza las secciones de tu dashboard
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Secciones Activas
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default' }}>
                    <List sx={{ p: 0 }}>
                      {availableSections
                        .filter(section => section.visible)
                        .sort((a, b) => a.order - b.order)
                        .map((section, index) => (
                          <ListItem 
                            key={section.id}
                            sx={{ 
                              p: 1, 
                              mb: 1, 
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'primary.main',
                              borderRadius: 1,
                              '&:last-child': { mb: 0 }
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <DragIcon color="action" sx={{ cursor: 'grab' }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight="medium">
                                  {section.title}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <IconButton 
                                  size="small" 
                                  disabled={index === 0}
                                  onClick={() => {
                                    if (index > 0) {
                                      const newSections = [...availableSections];
                                      const currentOrder = newSections[index].order;
                                      const prevOrder = newSections[index - 1].order;
                                      newSections[index].order = prevOrder;
                                      newSections[index - 1].order = currentOrder;
                                      // Actualizar preferencias
                                      const orderedSections = newSections
                                        .filter(s => s.visible)
                                        .sort((a, b) => a.order - b.order)
                                        .map(s => s.id);
                                      updatePreferences({ visible_sections: orderedSections });
                                    }
                                  }}
                                >
                                  <ArrowUpIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  disabled={index === availableSections.filter(s => s.visible).length - 1}
                                  onClick={() => {
                                    if (index < availableSections.filter(s => s.visible).length - 1) {
                                      const newSections = [...availableSections];
                                      const currentOrder = newSections[index].order;
                                      const nextOrder = newSections[index + 1].order;
                                      newSections[index].order = nextOrder;
                                      newSections[index + 1].order = currentOrder;
                                      // Actualizar preferencias
                                      const orderedSections = newSections
                                        .filter(s => s.visible)
                                        .sort((a, b) => a.order - b.order)
                                        .map(s => s.id);
                                      updatePreferences({ visible_sections: orderedSections });
                                    }
                                  }}
                                >
                                  <ArrowDownIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleSectionToggle(section.id)}
                                >
                                  <VisibilityOffIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </ListItem>
                        ))}
                    </List>
                  </Paper>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Secciones Disponibles
                </Typography>
                <Grid container spacing={2}>
                  {availableSections
                    .filter(section => !section.visible)
                    .map((section) => (
                      <Grid item xs={12} sm={6} key={section.id}>
                        <Paper
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main'
                            }
                          }}
                          onClick={() => handleSectionToggle(section.id)}
                        >
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{ color: 'text.secondary' }}>
                              <VisibilityIcon />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight="medium">
                                {section.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {section.description}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Notificaciones
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Personaliza cómo y cuándo recibir notificaciones
                </Typography>

                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_settings.browser_notifications}
                        onChange={(e) => handleNotificationSettingChange('browser_notifications', e.target.checked)}
                      />
                    }
                    label="Notificaciones del navegador"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_settings.sound_alerts}
                        onChange={(e) => handleNotificationSettingChange('sound_alerts', e.target.checked)}
                      />
                    }
                    label="Alertas sonoras"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_settings.priority_only}
                        onChange={(e) => handleNotificationSettingChange('priority_only', e.target.checked)}
                      />
                    }
                    label="Solo notificaciones prioritarias"
                  />

                  <Divider />

                  <Typography variant="subtitle2">Horario Silencioso</Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notification_settings.quiet_hours.enabled}
                        onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                      />
                    }
                    label="Activar horario silencioso"
                  />

                  {preferences.notification_settings.quiet_hours.enabled && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Inicio"
                        type="time"
                        value={preferences.notification_settings.quiet_hours.start}
                        onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                        size="small"
                      />
                      <TextField
                        label="Fin"
                        type="time"
                        value={preferences.notification_settings.quiet_hours.end}
                        onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                        size="small"
                      />
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preferencias de Tema
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Personaliza la apariencia visual del dashboard
                </Typography>

                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Esquema de Color</InputLabel>
                    <Select
                      value={preferences.theme_preferences.color_scheme}
                      onChange={(e) => handleThemeChange('color_scheme', e.target.value)}
                      label="Esquema de Color"
                    >
                      <MenuItem value="light">Claro</MenuItem>
                      <MenuItem value="dark">Oscuro</MenuItem>
                      <MenuItem value="auto">Automático</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.theme_preferences.compact_view}
                        onChange={(e) => handleThemeChange('compact_view', e.target.checked)}
                      />
                    }
                    label="Vista compacta"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.theme_preferences.show_animations}
                        onChange={(e) => handleThemeChange('show_animations', e.target.checked)}
                      />
                    }
                    label="Mostrar animaciones"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              onClick={() => setShowResetDialog(true)}
              startIcon={<ResetIcon />}
              color="error"
              variant="outlined"
            >
              Resetear
            </Button>

            <Stack direction="row" spacing={2}>
              <Button onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                startIcon={<SaveIcon />}
                variant="contained"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Stack>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>Confirmar Reset</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres resetear todas las configuraciones a sus valores por defecto?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            disabled={resetting}
          >
            {resetting ? 'Reseteando...' : 'Resetear'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}