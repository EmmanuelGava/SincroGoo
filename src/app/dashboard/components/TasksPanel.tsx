// Tasks Panel - Componente de gestión de tareas del dashboard
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Checkbox,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Menu,
  Grid,
  Skeleton,
  Tooltip,
  Switch,
  FormControlLabel
} from './mui-components';

// Iconos personalizados usando SVG
const RefreshIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </Box>
);

const AddIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </Box>
);

const CheckCircleIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Box>
);

const ScheduleIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Box>
);

const MoreVertIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </Box>
);

const TaskIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </Box>
);

const PersonIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </Box>
);

const AttachMoneyIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </Box>
);

const RepeatIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </Box>
);

const CloseIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 24, height: 24, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </Box>
);
import { Task, TaskStatus, TaskType, Priority, TasksPanelProps } from '../../../types/dashboard';
import { Add } from '@mui/icons-material';
import { Close } from '@radix-ui/react-toast';
import { AttachMoney } from '@mui/icons-material';

// =====================================================
// Componente principal
// =====================================================

export function TasksPanel({
  tasks,
  loading,
  onTaskComplete,
  onTaskSnooze,
  onTaskCreate,
  onRefresh
}: TasksPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // =====================================================
  // Filtrar tareas por tab y filtros
  // =====================================================

  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;

    // Filtrar por tab
    switch (selectedTab) {
      case 'pending':
        filtered = filtered.filter(task => ['pending', 'in_progress'].includes(task.status));
        break;
      case 'overdue':
        filtered = filtered.filter(task =>
          task.due_date &&
          new Date(task.due_date) < new Date() &&
          ['pending', 'in_progress'].includes(task.status)
        );
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === 'completed');
        break;
      // 'all' no necesita filtro
    }

    // Filtrar por prioridad
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(task => task.task_type === filterType);
    }

    // Ordenar por prioridad y fecha de vencimiento
    return filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Si tienen la misma prioridad, ordenar por fecha de vencimiento
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return 0;
    });
  }, [tasks, selectedTab, filterPriority, filterType]);

  // =====================================================
  // Contar tareas por categoría
  // =====================================================

  const taskCounts = React.useMemo(() => {
    const now = new Date();
    return {
      all: tasks.length,
      pending: tasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length,
      overdue: tasks.filter(t =>
        t.due_date &&
        new Date(t.due_date) < now &&
        ['pending', 'in_progress'].includes(t.status)
      ).length,
      completed: tasks.filter(t => t.status === 'completed').length
    };
  }, [tasks]);

  // =====================================================
  // Manejar selección múltiple
  // =====================================================

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(task => task.id));
    }
  };

  // =====================================================
  // Acciones en lote
  // =====================================================

  const handleBulkComplete = async () => {
    for (const taskId of selectedTasks) {
      await onTaskComplete(taskId);
    }
    setSelectedTasks([]);
  };

  const handleBulkSnooze = async (minutes: number) => {
    for (const taskId of selectedTasks) {
      await onTaskSnooze(taskId, minutes);
    }
    setSelectedTasks([]);
  };

  // =====================================================
  // Estados de carga y vacío
  // =====================================================

  if (loading && tasks.length === 0) {
    return <TasksPanelSkeleton />;
  }

  // =====================================================
  // Render principal
  // =====================================================

  return (
    <Box>
      {/* Header con controles */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Gestión de Tareas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredTasks.length} de {tasks.length} tareas
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          {/* Botón de actualizar */}
          <Tooltip title="Actualizar tareas">
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              size="small"
              color="inherit"
            >
              <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>

          {/* Botón de crear tarea */}
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            size="small"
          >
            Nueva Tarea
          </Button>
        </Stack>
      </Stack>

      {/* Tabs de navegación */}
      <TaskTabs
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        counts={taskCounts}
      />

      {/* Filtros */}
      <TaskFilters
        filterPriority={filterPriority}
        filterType={filterType}
        onPriorityChange={setFilterPriority}
        onTypeChange={setFilterType}
      />

      {/* Acciones en lote */}
      {selectedTasks.length > 0 && (
        <BulkActions
          selectedCount={selectedTasks.length}
          onComplete={handleBulkComplete}
          onSnooze={handleBulkSnooze}
          onClear={() => setSelectedTasks([])}
        />
      )}

      {/* Lista de tareas */}
      {filteredTasks.length > 0 ? (
        <Stack spacing={2}>
          {/* Header de selección */}
          <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Checkbox
                checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                onChange={handleSelectAll}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {selectedTasks.length > 0
                  ? `${selectedTasks.length} seleccionadas`
                  : 'Seleccionar todas'
                }
              </Typography>
            </Stack>
          </Card>

          {/* Lista de tareas */}
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTasks.includes(task.id)}
              onSelect={(selected) => handleTaskSelect(task.id, selected)}
              onComplete={() => onTaskComplete(task.id)}
              onSnooze={(minutes) => onTaskSnooze(task.id, minutes)}
            />
          ))}
        </Stack>
      ) : (
        <TasksEmptyState
          tab={selectedTab}
          hasFilters={filterPriority !== 'all' || filterType !== 'all'}
          onClearFilters={() => {
            setFilterPriority('all');
            setFilterType('all');
          }}
          onCreateTask={() => setShowCreateForm(true)}
        />
      )}

      {/* Formulario de crear tarea */}
      {showCreateForm && (
        <CreateTaskForm
          onSubmit={onTaskCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Estadísticas rápidas */}
      <TaskStats tasks={tasks} />
    </Box>
  );
}

// =====================================================
// Tabs de navegación
// =====================================================

interface TaskTabsProps {
  selectedTab: 'all' | 'pending' | 'overdue' | 'completed';
  onTabChange: (tab: 'all' | 'pending' | 'overdue' | 'completed') => void;
  counts: Record<string, number>;
}

function TaskTabs({ selectedTab, onTabChange, counts }: TaskTabsProps) {
  const tabs = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'overdue', label: 'Vencidas', count: counts.overdue, urgent: counts.overdue > 0 },
    { id: 'completed', label: 'Completadas', count: counts.completed }
  ] as const;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => onTabChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">{tab.label}</Typography>
                <Badge
                  badgeContent={tab.count}
                  color={'urgent' in tab && tab.urgent ? 'error' : selectedTab === tab.id ? 'primary' : 'default'}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.75rem',
                      fontWeight: 'medium'
                    }
                  }}
                />
              </Stack>
            }
            sx={{
              textTransform: 'none',
              minWidth: 'auto',
              px: 2
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}

// =====================================================
// Filtros de tareas
// =====================================================

interface TaskFiltersProps {
  filterPriority: Priority | 'all';
  filterType: TaskType | 'all';
  onPriorityChange: (priority: Priority | 'all') => void;
  onTypeChange: (type: TaskType | 'all') => void;
}

function TaskFilters({ filterPriority, filterType, onPriorityChange, onTypeChange }: TaskFiltersProps) {
  return (
    <Stack direction="row" spacing={3} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Prioridad</InputLabel>
        <Select
          value={filterPriority}
          onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
          label="Prioridad"
          size="small"
        >
          <MenuItem value="all">Todas</MenuItem>
          <MenuItem value="urgent">Urgente</MenuItem>
          <MenuItem value="high">Alta</MenuItem>
          <MenuItem value="medium">Media</MenuItem>
          <MenuItem value="low">Baja</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Tipo</InputLabel>
        <Select
          value={filterType}
          onChange={(e) => onTypeChange(e.target.value as TaskType | 'all')}
          label="Tipo"
          size="small"
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="follow_up">Seguimiento</MenuItem>
          <MenuItem value="first_response">Primera Respuesta</MenuItem>
          <MenuItem value="scheduled_contact">Contacto Programado</MenuItem>
          <MenuItem value="lead_qualification">Calificación</MenuItem>
          <MenuItem value="proposal_followup">Seguimiento Propuesta</MenuItem>
          <MenuItem value="meeting_reminder">Recordatorio Reunión</MenuItem>
          <MenuItem value="custom">Personalizada</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}

// =====================================================
// Acciones en lote
// =====================================================

interface BulkActionsProps {
  selectedCount: number;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
  onClear: () => void;
}

function BulkActions({ selectedCount, onComplete, onSnooze, onClear }: BulkActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const snoozeOptions = [
    { label: '30 minutos', minutes: 30 },
    { label: '1 hora', minutes: 60 },
    { label: '2 horas', minutes: 120 },
    { label: '4 horas', minutes: 240 },
    { label: '1 día', minutes: 1440 }
  ];

  const handleSnoozeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSnoozeClose = () => {
    setAnchorEl(null);
  };

  const handleSnoozeOption = (minutes: number) => {
    onSnooze(minutes);
    handleSnoozeClose();
  };

  return (
    <Card sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" fontWeight="medium" color="primary.800">
            {selectedCount} tareas seleccionadas
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              onClick={onComplete}
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
            >
              Completar
            </Button>

            <Button
              onClick={handleSnoozeClick}
              variant="contained"
              color="warning"
              size="small"
              startIcon={<ScheduleIcon />}
            >
              Posponer
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleSnoozeClose}
            >
              {snoozeOptions.map((option) => (
                <MenuItem
                  key={option.minutes}
                  onClick={() => handleSnoozeOption(option.minutes)}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </Stack>

        <Button
          onClick={onClear}
          variant="text"
          color="primary"
          size="small"
        >
          Limpiar selección
        </Button>
      </Stack>
    </Card>
  );
}

// =====================================================
// Card de tarea individual
// =====================================================

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
}

function TaskCard({ task, isSelected, onSelect, onComplete, onSnooze }: TaskCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const isDueSoon = task.due_date && new Date(task.due_date) < new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

  const getBorderColor = () => {
    if (isSelected) return 'primary.main';
    if (isOverdue) return 'error.main';
    if (isDueSoon) return 'warning.main';
    return 'grey.300';
  };

  const getBgColor = () => {
    if (isSelected) return 'primary.50';
    if (isOverdue) return 'error.50';
    if (isDueSoon) return 'warning.50';
    return 'background.paper';
  };

  return (
    <Card
      sx={{
        border: 2,
        borderColor: getBorderColor(),
        bgcolor: getBgColor(),
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: isSelected ? 'primary.main' : 'grey.400'
        }
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            size="small"
            sx={{ mt: -0.5 }}
          />

          {/* Contenido principal */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="medium" color="text.primary" mb={0.5}>
                  {task.title}
                </Typography>
                
                {task.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mb={1}
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {task.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={1}>
                  <PriorityBadge priority={task.priority} />
                  <TaskTypeBadge type={task.task_type} />

                  {task.due_date && (
                    <Typography
                      variant="body2"
                      fontWeight={isOverdue || isDueSoon ? 'medium' : 'normal'}
                      sx={{
                        color: isOverdue ? 'error.main' : isDueSoon ? 'warning.main' : 'text.secondary'
                      }}
                    >
                      {formatDueDate(task.due_date)}
                    </Typography>
                  )}

                  {task.is_recurring && (
                    <Chip
                      label="Recurrente"
                      size="small"
                      color="primary"
                      variant="outlined"
                      icon={<RepeatIcon />}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>

                {/* Información del lead */}
                {task.metadata.lead_name && (
                  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                    <PersonIcon sx={{ fontSize: 20, color: 'action.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Lead: <Typography component="span" fontWeight="medium">{task.metadata.lead_name}</Typography>
                      {task.metadata.lead_value && (
                        <Typography component="span" sx={{ ml: 1 }}>
                          <AttachMoney fontSize="small" sx={{ verticalAlign: 'middle' }} />
                          {task.metadata.lead_value.toLocaleString()}
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Acciones */}
              <Stack direction="row" spacing={1} alignItems="center">
                {task.status === 'pending' && (
                  <Button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckCircleIcon />}
                  >
                    {isCompleting ? 'Completando...' : 'Completar'}
                  </Button>
                )}

                <IconButton
                  onClick={handleMenuClick}
                  size="small"
                  color="inherit"
                >
                  <MoreVertIcon />
                </IconButton>

                <TaskActionMenu
                  task={task}
                  anchorEl={anchorEl}
                  onClose={handleMenuClose}
                  onSnooze={onSnooze}
                />
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Menú de acciones de tarea
// =====================================================

function TaskActionMenu({ task, anchorEl, onClose, onSnooze }: {
  task: Task;
  anchorEl: null | HTMLElement;
  onClose: () => void;
  onSnooze: (minutes: number) => void;
}) {
  const snoozeOptions = [
    { label: '30 minutos', minutes: 30 },
    { label: '1 hora', minutes: 60 },
    { label: '2 horas', minutes: 120 },
    { label: '4 horas', minutes: 240 },
    { label: '1 día', minutes: 1440 }
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      <MenuItem disabled>
        <Typography variant="body2" fontWeight="medium">
          Posponer por:
        </Typography>
      </MenuItem>
      {snoozeOptions.map((option) => (
        <MenuItem
          key={option.minutes}
          onClick={() => {
            onSnooze(option.minutes);
            onClose();
          }}
        >
          <Typography variant="body2">
            {option.label}
          </Typography>
        </MenuItem>
      ))}
    </Menu>
  );
}

// =====================================================
// Formulario de crear tarea
// =====================================================

function CreateTaskForm({ onSubmit, onCancel }: {
  onSubmit: (task: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom' as TaskType,
    priority: 'medium' as Priority,
    due_date: '',
    is_recurring: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      due_date: formData.due_date || undefined
    });
    onCancel();
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Nueva Tarea</Typography>
          <IconButton onClick={onCancel} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Título"
              required
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Describe la tarea..."
            />

            <TextField
              label="Descripción"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalles adicionales..."
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={formData.task_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value as TaskType }))}
                    label="Tipo"
                  >
                    <MenuItem value="custom">Personalizada</MenuItem>
                    <MenuItem value="follow_up">Seguimiento</MenuItem>
                    <MenuItem value="first_response">Primera Respuesta</MenuItem>
                    <MenuItem value="scheduled_contact">Contacto Programado</MenuItem>
                    <MenuItem value="lead_qualification">Calificación</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    label="Prioridad"
                  >
                    <MenuItem value="low">Baja</MenuItem>
                    <MenuItem value="medium">Media</MenuItem>
                    <MenuItem value="high">Alta</MenuItem>
                    <MenuItem value="urgent">Urgente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Fecha de vencimiento"
              type="datetime-local"
              fullWidth
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                />
              }
              label="Tarea recurrente"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onCancel} variant="outlined">
            Cancelar
          </Button>
          <Button type="submit" variant="contained">
            Crear Tarea
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// =====================================================
// Componentes auxiliares
// =====================================================

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = {
    urgent: { color: 'error', label: 'Urgente' },
    high: { color: 'warning', label: 'Alta' },
    medium: { color: 'info', label: 'Media' },
    low: { color: 'default', label: 'Baja' }
  };

  const { color, label } = config[priority];

  return (
    <Chip
      label={label}
      size="small"
      color={color as any}
      variant="filled"
      sx={{ fontSize: '0.75rem', fontWeight: 'medium' }}
    />
  );
}

function TaskTypeBadge({ type }: { type: TaskType }) {
  const labels = {
    follow_up: 'Seguimiento',
    first_response: 'Primera Respuesta',
    scheduled_contact: 'Contacto Programado',
    lead_qualification: 'Calificación',
    proposal_followup: 'Seguimiento Propuesta',
    meeting_reminder: 'Recordatorio',
    custom: 'Personalizada'
  };

  return (
    <Chip
      label={labels[type]}
      size="small"
      color="primary"
      variant="outlined"
      sx={{ fontSize: '0.75rem', fontWeight: 'medium' }}
    />
  );
}

// =====================================================
// Estados vacíos y de carga
// =====================================================

function TasksEmptyState({
  tab,
  hasFilters,
  onClearFilters,
  onCreateTask
}: {
  tab: string;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateTask: () => void;
}) {
  const messages = {
    all: 'No tienes tareas creadas',
    pending: 'No hay tareas pendientes',
    overdue: 'No hay tareas vencidas',
    completed: 'No hay tareas completadas'
  };

  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'grey.100',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2
        }}
      >
        <TaskIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
      </Box>
      <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
        {messages[tab as keyof typeof messages] || 'No hay tareas'}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {hasFilters
          ? 'Prueba ajustando los filtros para ver más tareas'
          : 'Crea tu primera tarea para empezar a organizar tu trabajo'
        }
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        {hasFilters && (
          <Button
            onClick={onClearFilters}
            variant="text"
            color="primary"
          >
            Limpiar filtros
          </Button>
        )}
        <Button
          onClick={onCreateTask}
          variant="contained"
          color="primary"
          startIcon={<Add />}
        >
          Crear Tarea
        </Button>
      </Stack>
    </Box>
  );
}

function TasksPanelSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing={1}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Stack>
        <Skeleton variant="rectangular" width={120} height={40} />
      </Stack>

      <Skeleton variant="rectangular" height={48} />
      <Skeleton variant="rectangular" height={32} />

      <Stack spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height={96} />
        ))}
      </Stack>
    </Stack>
  );
}

function TaskStats({ tasks }: { tasks: Task[] }) {
  const stats = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      completedToday: tasks.filter(t =>
        t.status === 'completed' &&
        t.completed_at &&
        new Date(t.completed_at) >= today
      ).length,
      avgCompletionTime: '2.5h', // Placeholder
      productivityScore: 85 // Placeholder
    };
  }, [tasks]);

  return (
    <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
      <Typography variant="h6" fontWeight="medium" mb={2}>
        Estadísticas del Día
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {stats.completedToday}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completadas Hoy
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {stats.avgCompletionTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tiempo Promedio
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {stats.productivityScore}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Productividad
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}

// =====================================================
// Función auxiliar
// =====================================================

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    const overdueHours = Math.abs(diffHours);
    if (overdueDays > 0) {
      return `Vencida hace ${overdueDays}d`;
    } else {
      return `Vencida hace ${overdueHours}h`;
    }
  } else if (diffDays === 0) {
    if (diffHours === 0) {
      return 'Vence ahora';
    } else {
      return `Vence en ${diffHours}h`;
    }
  } else if (diffDays === 1) {
    return 'Vence mañana';
  } else {
    return `Vence en ${diffDays}d`;
  }
}