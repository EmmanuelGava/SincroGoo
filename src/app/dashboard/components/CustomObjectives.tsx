// Custom Objectives - Componente para objetivos personalizados y progreso
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
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Grid,
  Divider,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as ObjectiveIcon,
  Edit as EditIcon,
  Add as AddIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
  Schedule as TimeIcon,
  Speed as PerformanceIcon,
  People as ConversationsIcon,
  AttachMoney as ConversionIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useDashboardPreferences } from '../../../hooks/useDashboardPreferences';

// =====================================================
// Interfaces
// =====================================================

interface CustomObjectivesProps {
  currentMetrics?: {
    averageResponseTime: number;
    dailyConversations: number;
    conversionRate: number;
    activeConversations: number;
  };
}

interface Objective {
  id: string;
  title: string;
  description: string;
  type: 'response_time' | 'conversations' | 'conversion_rate' | 'custom';
  target: number;
  current: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  isActive: boolean;
}

// =====================================================
// Componente principal
// =====================================================

export function CustomObjectives({ currentMetrics }: CustomObjectivesProps) {
  const { preferences, updatePreferences } = useDashboardPreferences();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  // =====================================================
  // Inicializar objetivos desde preferencias
  // =====================================================

  useEffect(() => {
    if (preferences?.custom_objectives) {
      const defaultObjectives: Objective[] = [
        {
          id: 'response_time',
          title: 'Tiempo de Respuesta',
          description: 'Mantener tiempo promedio de respuesta bajo',
          type: 'response_time',
          target: preferences.custom_objectives.response_time_target,
          current: currentMetrics?.averageResponseTime || 0,
          unit: 'segundos',
          period: 'daily',
          priority: 'high',
          isActive: true
        },
        {
          id: 'daily_conversations',
          title: 'Conversaciones Diarias',
          description: 'Objetivo de conversaciones atendidas por día',
          type: 'conversations',
          target: preferences.custom_objectives.daily_conversations_target,
          current: currentMetrics?.dailyConversations || 0,
          unit: 'conversaciones',
          period: 'daily',
          priority: 'medium',
          isActive: true
        },
        {
          id: 'conversion_rate',
          title: 'Tasa de Conversión',
          description: 'Porcentaje de leads convertidos',
          type: 'conversion_rate',
          target: preferences.custom_objectives.conversion_rate_target,
          current: currentMetrics?.conversionRate || 0,
          unit: '%',
          period: 'monthly',
          priority: 'high',
          isActive: true
        }
      ];

      setObjectives(defaultObjectives);
    }
  }, [preferences, currentMetrics]);

  // =====================================================
  // Handlers
  // =====================================================

  const handleEditObjective = (objective: Objective) => {
    setEditingObjective(objective);
    setEditDialogOpen(true);
  };

  const handleSaveObjective = async (updatedObjective: Objective) => {
    // Actualizar objetivos localmente
    setObjectives(prev => 
      prev.map(obj => obj.id === updatedObjective.id ? updatedObjective : obj)
    );

    // Actualizar preferencias si es un objetivo predefinido
    if (updatedObjective.type !== 'custom' && preferences) {
      const newCustomObjectives = {
        ...preferences.custom_objectives,
        [`${updatedObjective.type}_target`]: updatedObjective.target
      };

      await updatePreferences({
        custom_objectives: newCustomObjectives
      });
    }

    setEditDialogOpen(false);
    setEditingObjective(null);
  };

  const handleAddCustomObjective = () => {
    const newObjective: Objective = {
      id: `custom_${Date.now()}`,
      title: 'Nuevo Objetivo',
      description: 'Descripción del objetivo',
      type: 'custom',
      target: 100,
      current: 0,
      unit: 'unidades',
      period: 'daily',
      priority: 'medium',
      isActive: true
    };

    setEditingObjective(newObjective);
    setEditDialogOpen(true);
  };

  // =====================================================
  // Funciones auxiliares
  // =====================================================

  const getProgressPercentage = (objective: Objective) => {
    if (objective.target === 0) return 0;
    return Math.min((objective.current / objective.target) * 100, 100);
  };

  const getObjectiveStatus = (objective: Objective) => {
    const progress = getProgressPercentage(objective);
    
    if (progress >= 100) return 'completed';
    if (progress >= 80) return 'on_track';
    if (progress >= 50) return 'behind';
    return 'critical';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'on_track': return 'info';
      case 'behind': return 'warning';
      case 'critical': return 'error';
      default: return 'grey';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CompletedIcon />;
      case 'on_track': return <ObjectiveIcon />;
      case 'behind': return <WarningIcon />;
      case 'critical': return <WarningIcon />;
      default: return <ObjectiveIcon />;
    }
  };

  const getObjectiveIcon = (type: string) => {
    switch (type) {
      case 'response_time': return <TimeIcon />;
      case 'conversations': return <ConversationsIcon />;
      case 'conversion_rate': return <ConversionIcon />;
      default: return <PerformanceIcon />;
    }
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight="600">
            Objetivos Personalizados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rastrea tu progreso hacia metas específicas
          </Typography>
        </Box>
        
        <Button
          onClick={handleAddCustomObjective}
          variant="outlined"
          startIcon={<AddIcon />}
          size="small"
        >
          Nuevo Objetivo
        </Button>
      </Stack>

      {/* Lista de objetivos */}
      <Grid container spacing={2}>
        {objectives.filter(obj => obj.isActive).map((objective) => {
          const status = getObjectiveStatus(objective);
          const progress = getProgressPercentage(objective);
          
          return (
            <Grid item xs={12} md={6} key={objective.id}>
              <Card
                sx={{
                  border: 1,
                  borderColor: `${getStatusColor(status)}.main`,
                  bgcolor: `${getStatusColor(status)}.50`,
                  transition: 'all 0.2s'
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header del objetivo */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            bgcolor: `${getStatusColor(status)}.main`,
                            color: 'white',
                            width: 40,
                            height: 40
                          }}
                        >
                          {getObjectiveIcon(objective.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="600">
                            {objective.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {objective.description}
                          </Typography>
                        </Box>
                      </Stack>
                      
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          icon={getStatusIcon(status)}
                          label={status.replace('_', ' ')}
                          color={getStatusColor(status) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                        <IconButton
                          onClick={() => handleEditObjective(objective)}
                          size="small"
                          color="inherit"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {/* Progreso */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Progreso
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {objective.current} / {objective.target} {objective.unit}
                        </Typography>
                      </Stack>
                      
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={getStatusColor(status) as any}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(progress)}% completado
                        </Typography>
                        <Chip
                          label={objective.period}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Stack>
                    </Box>

                    {/* Información adicional */}
                    <Stack direction="row" spacing={2}>
                      <Chip
                        label={`Prioridad: ${objective.priority}`}
                        size="small"
                        color={objective.priority === 'high' ? 'error' : objective.priority === 'medium' ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      
                      {objective.deadline && (
                        <Chip
                          label={`Vence: ${new Date(objective.deadline).toLocaleDateString()}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Resumen de objetivos */}
      {objectives.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Resumen de Objetivos
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {objectives.filter(obj => getObjectiveStatus(obj) === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completados
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {objectives.filter(obj => getObjectiveStatus(obj) === 'on_track').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En Progreso
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {objectives.filter(obj => getObjectiveStatus(obj) === 'behind').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Retrasados
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {objectives.filter(obj => getObjectiveStatus(obj) === 'critical').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Críticos
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Dialog de edición */}
      <ObjectiveEditDialog
        open={editDialogOpen}
        objective={editingObjective}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingObjective(null);
        }}
        onSave={handleSaveObjective}
      />
    </Box>
  );
}

// =====================================================
// Dialog de edición de objetivos
// =====================================================

interface ObjectiveEditDialogProps {
  open: boolean;
  objective: Objective | null;
  onClose: () => void;
  onSave: (objective: Objective) => void;
}

function ObjectiveEditDialog({ open, objective, onClose, onSave }: ObjectiveEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Objective>>({});

  useEffect(() => {
    if (objective) {
      setFormData(objective);
    }
  }, [objective]);

  const handleSave = () => {
    if (formData.title && formData.target) {
      onSave(formData as Objective);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {objective?.id.startsWith('custom_') ? 'Nuevo Objetivo' : 'Editar Objetivo'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Título"
            value={formData.title || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            fullWidth
          />
          
          <TextField
            label="Descripción"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Objetivo"
                type="number"
                value={formData.target || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Unidad"
                value={formData.unit || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                fullWidth
              />
            </Grid>
          </Grid>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={formData.period || 'daily'}
                  onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as any }))}
                  label="Período"
                >
                  <MenuItem value="daily">Diario</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={formData.priority || 'medium'}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  label="Prioridad"
                >
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="medium">Media</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <TextField
            label="Fecha límite (opcional)"
            type="date"
            value={formData.deadline?.split('T')[0] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}