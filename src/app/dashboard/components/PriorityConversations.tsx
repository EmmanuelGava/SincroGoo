// Priority Conversations - Componente de conversaciones prioritarias
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Badge,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Skeleton,
  Grid,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Star,
  StarBorder,
  Refresh,
  WhatsApp,
  Telegram,
  Email,
  FilterList,
  Schedule,
  Person,
  Message
} from '@mui/icons-material';
import { PriorityConversation, Priority, Platform, PriorityConversationsProps } from '../../../types/dashboard';

// =====================================================
// Componente principal
// =====================================================

export function PriorityConversations({
  conversations,
  loading,
  onConversationClick,
  onMarkImportant,
  onRefresh
}: PriorityConversationsProps) {
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'time' | 'value'>('priority');

  // =====================================================
  // Filtrar y ordenar conversaciones
  // =====================================================

  const filteredAndSortedConversations = React.useMemo(() => {
    let filtered = conversations;

    // Filtrar por prioridad
    if (filterPriority !== 'all') {
      filtered = filtered.filter(conv => conv.priority === filterPriority);
    }

    // Filtrar por plataforma
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(conv => conv.platform === filterPlatform);
    }

    // Ordenar
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'time':
          return b.timeSinceLastResponse - a.timeSinceLastResponse;
        case 'value':
          return b.leadValue - a.leadValue;
        default:
          return 0;
      }
    });
  }, [conversations, filterPriority, filterPlatform, sortBy]);

  // =====================================================
  // Manejar navegación al chat
  // =====================================================

  const handleConversationClick = (conversation: PriorityConversation) => {
    setSelectedConversation(conversation.id);
    onConversationClick(conversation.id);

    // Navegar al chat específico
    router.push(`/chat?conversation=${conversation.id}&lead=${conversation.leadId}`);
  };

  // =====================================================
  // Estados de carga y vacío
  // =====================================================

  if (loading && conversations.length === 0) {
    return <PriorityConversationsSkeleton />;
  }

  if (!loading && conversations.length === 0) {
    return <PriorityConversationsEmpty onRefresh={onRefresh} />;
  }

  // =====================================================
  // Render principal
  // =====================================================

  return (
    <Stack spacing={3}>
      {/* Header con controles */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Conversaciones Prioritarias
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredAndSortedConversations.length} de {conversations.length} conversaciones
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          {/* Botón de actualizar */}
          <Tooltip title="Actualizar conversaciones">
            <IconButton
              onClick={onRefresh}
              disabled={loading}
              size="small"
              color="inherit"
            >
              <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>

          {/* Filtros */}
          <ConversationFilters
            filterPriority={filterPriority}
            filterPlatform={filterPlatform}
            sortBy={sortBy}
            onPriorityChange={setFilterPriority}
            onPlatformChange={setFilterPlatform}
            onSortChange={setSortBy}
            availablePlatforms={[...new Set(conversations.map(c => c.platform))]}
          />
        </Stack>
      </Stack>

      {/* Lista de conversaciones */}
      <Stack spacing={2}>
        {filteredAndSortedConversations.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedConversation === conversation.id}
            onClick={() => handleConversationClick(conversation)}
            onMarkImportant={(important) => onMarkImportant(conversation.id, important)}
          />
        ))}
      </Stack>

      {/* Mensaje cuando no hay resultados filtrados */}
      {filteredAndSortedConversations.length === 0 && conversations.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'grey.100',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}
          >
            <FilterList sx={{ color: 'text.disabled' }} />
          </Box>
          <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
            No hay conversaciones con estos filtros
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Prueba ajustando los filtros para ver más conversaciones
          </Typography>
          <Button
            onClick={() => {
              setFilterPriority('all');
              setFilterPlatform('all');
            }}
            variant="text"
            color="primary"
          >
            Limpiar filtros
          </Button>
        </Box>
      )}

      {/* Estadísticas rápidas */}
      <ConversationStats conversations={conversations} />
    </Stack>
  );
}

// =====================================================
// Card de conversación individual
// =====================================================

interface ConversationCardProps {
  conversation: PriorityConversation;
  isSelected: boolean;
  onClick: () => void;
  onMarkImportant: (important: boolean) => void;
}

function ConversationCard({ conversation, isSelected, onClick, onMarkImportant }: ConversationCardProps) {
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkImportant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarking(true);

    try {
      await onMarkImportant(!conversation.isMarkedImportant);
    } finally {
      setIsMarking(false);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return { border: 'error.main', bg: 'error.50' };
      case 'high': return { border: 'warning.main', bg: 'warning.50' };
      case 'medium': return { border: 'info.main', bg: 'info.50' };
      case 'low': return { border: 'grey.400', bg: 'grey.50' };
      default: return { border: 'grey.400', bg: 'grey.50' };
    }
  };

  const getTimeColor = (minutes: number) => {
    if (minutes > 480) return 'error.main'; // 8+ horas
    if (minutes > 240) return 'warning.main'; // 4+ horas
    if (minutes > 120) return 'info.main'; // 2+ horas
    return 'text.secondary';
  };

  const priorityColors = getPriorityColor(conversation.priority);

  return (
    <Card
      sx={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: 2,
        borderColor: isSelected ? 'primary.main' : priorityColors.border,
        bgcolor: isSelected ? 'primary.50' : priorityColors.bg,
        '&:hover': {
          boxShadow: 2
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ position: 'relative', pr: 8 }}>
        {/* Indicadores de estado */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8
          }}
        >
          {/* Mensajes no leídos */}
          {conversation.unreadCount > 0 && (
            <Badge
              badgeContent={conversation.unreadCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  fontWeight: 'medium'
                }
              }}
            >
              <Message fontSize="small" />
            </Badge>
          )}

          {/* Botón de marcar como importante */}
          <Tooltip title={conversation.isMarkedImportant ? 'Quitar de importantes' : 'Marcar como importante'}>
            <IconButton
              onClick={handleMarkImportant}
              disabled={isMarking}
              size="small"
              sx={{
                color: conversation.isMarkedImportant ? 'warning.main' : 'text.disabled',
                '&:hover': {
                  color: 'warning.main'
                },
                opacity: isMarking ? 0.5 : 1
              }}
            >
              {conversation.isMarkedImportant ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <PlatformIcon platform={conversation.platform} />
          <Box>
            <Typography variant="h6" fontWeight="600" color="text.primary">
              {conversation.leadName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <PriorityBadge priority={conversation.priority} />
              <Typography variant="body2" color="text.secondary">•</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {conversation.status}
              </Typography>
              {conversation.leadValue > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">•</Typography>
                  <Typography variant="body2" fontWeight="medium" color="text.primary">
                    ${conversation.leadValue.toLocaleString()}
                  </Typography>
                </>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Último mensaje */}
        <Box mb={2}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {conversation.lastMessage}
          </Typography>
        </Box>

        {/* Footer */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography
              variant="body2"
              fontWeight="medium"
              sx={{ color: getTimeColor(conversation.timeSinceLastResponse) }}
            >
              {formatTimeSince(conversation.timeSinceLastResponse)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(conversation.lastMessageAt).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Stack>

          {/* Tags */}
          {conversation.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              {conversation.tags.slice(0, 2).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
              {conversation.tags.length > 2 && (
                <Typography variant="caption" color="text.secondary">
                  +{conversation.tags.length - 2}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Filtros de conversaciones
// =====================================================

interface ConversationFiltersProps {
  filterPriority: Priority | 'all';
  filterPlatform: Platform | 'all';
  sortBy: 'priority' | 'time' | 'value';
  onPriorityChange: (priority: Priority | 'all') => void;
  onPlatformChange: (platform: Platform | 'all') => void;
  onSortChange: (sort: 'priority' | 'time' | 'value') => void;
  availablePlatforms: Platform[];
}

function ConversationFilters({
  filterPriority,
  filterPlatform,
  sortBy,
  onPriorityChange,
  onPlatformChange,
  onSortChange,
  availablePlatforms
}: ConversationFiltersProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {/* Filtro de prioridad */}
      <FormControl size="small" sx={{ minWidth: 140 }}>
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

      {/* Filtro de plataforma */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Plataforma</InputLabel>
        <Select
          value={filterPlatform}
          onChange={(e) => onPlatformChange(e.target.value as Platform | 'all')}
          label="Plataforma"
          size="small"
        >
          <MenuItem value="all">Todas</MenuItem>
          {availablePlatforms.map((platform) => (
            <MenuItem key={platform} value={platform} sx={{ textTransform: 'capitalize' }}>
              {platform}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Ordenamiento */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Ordenar</InputLabel>
        <Select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'priority' | 'time' | 'value')}
          label="Ordenar"
          size="small"
        >
          <MenuItem value="priority">Prioridad</MenuItem>
          <MenuItem value="time">Tiempo</MenuItem>
          <MenuItem value="value">Valor</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}

// =====================================================
// Estadísticas de conversaciones
// =====================================================

function ConversationStats({ conversations }: { conversations: PriorityConversation[] }) {
  const stats = React.useMemo(() => {
    const urgent = conversations.filter(c => c.priority === 'urgent').length;
    const high = conversations.filter(c => c.priority === 'high').length;
    const important = conversations.filter(c => c.isMarkedImportant).length;
    const overdue = conversations.filter(c => c.timeSinceLastResponse > 480).length; // 8+ horas

    return { urgent, high, important, overdue };
  }, [conversations]);

  return (
    <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
      <Typography variant="h6" fontWeight="medium" mb={2}>
        Resumen
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {stats.urgent}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Urgentes
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="warning.main">
              {stats.high}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Alta Prioridad
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="info.main">
              {stats.important}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Importantes
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="text.secondary">
              {stats.overdue}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vencidas
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}

// =====================================================
// Componentes auxiliares
// =====================================================

function PlatformIcon({ platform }: { platform: Platform }) {
  const iconProps = {
    sx: {
      fontSize: 32,
      flexShrink: 0
    }
  };

  const icons = {
    whatsapp: <WhatsApp {...iconProps} sx={{ ...iconProps.sx, color: 'success.main' }} />,
    telegram: <Telegram {...iconProps} sx={{ ...iconProps.sx, color: 'primary.main' }} />,
    email: <Email {...iconProps} sx={{ ...iconProps.sx, color: 'text.secondary' }} />
  };

  return icons[platform] || icons.email;
}

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

// =====================================================
// Estados de carga y vacío
// =====================================================

function PriorityConversationsSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing={1}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Stack>
        <Skeleton variant="rectangular" width={300} height={32} />
      </Stack>

      <Stack spacing={2}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={32} height={32} />
                  <Stack spacing={1}>
                    <Skeleton variant="text" width={150} height={20} />
                    <Skeleton variant="text" width={100} height={16} />
                  </Stack>
                </Stack>
                <Skeleton variant="circular" width={24} height={24} />
              </Stack>
              <Stack spacing={1}>
                <Skeleton variant="text" width="100%" height={16} />
                <Skeleton variant="text" width="75%" height={16} />
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

function PriorityConversationsEmpty({ onRefresh }: { onRefresh: () => void }) {
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
        <Box sx={{ color: 'text.disabled', fontSize: 32 }}>💬</Box>
      </Box>
      <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
        No hay conversaciones prioritarias
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Las conversaciones aparecerán aquí cuando tengas mensajes pendientes o leads importantes
      </Typography>
      <Button
        onClick={onRefresh}
        variant="contained"
        color="primary"
      >
        Actualizar
      </Button>
    </Box>
  );
}

// =====================================================
// Función auxiliar
// =====================================================

function formatTimeSince(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) { // 24 horas
    return `${Math.floor(minutes / 60)}h`;
  } else {
    return `${Math.floor(minutes / 1440)}d`;
  }
}