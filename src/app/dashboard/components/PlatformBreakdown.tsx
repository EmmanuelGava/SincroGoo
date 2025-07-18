// Platform Breakdown - Componente de breakdown por plataforma
// Fecha: 2025-01-16

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Skeleton,
  CircularProgress
} from './mui-components';
import {
  ExpandMore,
  ExpandLess,
  WhatsApp,
  Telegram,
  Email,
  CheckCircle,
  Error,
  Warning,
  Sort
} from '@mui/icons-material';
import { useDashboardMetrics } from '../../../hooks/useDashboardMetrics';
import { Platform, PlatformMetrics, TimeRange } from '../../../types/dashboard';

// =====================================================
// Interfaces
// =====================================================

interface PlatformBreakdownProps {
  timeRange: TimeRange;
  selectedPlatforms?: Platform[];
  onPlatformFilter?: (platforms: Platform[]) => void;
  showConnectionStatus?: boolean;
  compactView?: boolean;
}

// =====================================================
// Componente principal
// =====================================================

export function PlatformBreakdown({ 
  timeRange, 
  selectedPlatforms = [],
  onPlatformFilter,
  showConnectionStatus = true,
  compactView = false 
}: PlatformBreakdownProps) {
  const [activeFilters, setActiveFilters] = useState<Platform[]>(selectedPlatforms);
  const [sortBy, setSortBy] = useState<'messageCount' | 'responseRate' | 'averageResponseTime'>('messageCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: metricsData, loading, error } = useDashboardMetrics({
    timeRange,
    platforms: activeFilters.length > 0 ? activeFilters : undefined,
    refreshInterval: 30000
  });

  // =====================================================
  // Manejar filtros de plataforma
  // =====================================================

  const handlePlatformToggle = (platform: Platform) => {
    const newFilters = activeFilters.includes(platform)
      ? activeFilters.filter(p => p !== platform)
      : [...activeFilters, platform];
    
    setActiveFilters(newFilters);
    onPlatformFilter?.(newFilters);
  };

  // =====================================================
  // Ordenar plataformas
  // =====================================================

  const sortedPlatforms = React.useMemo(() => {
    if (!metricsData?.platformBreakdown) return [];
    
    return [...metricsData.platformBreakdown].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [metricsData?.platformBreakdown, sortBy, sortOrder]);

  // =====================================================
  // Estados de carga y error
  // =====================================================

  if (loading && !metricsData) {
    return <PlatformBreakdownSkeleton compactView={compactView} />;
  }

  if (error) {
    return <PlatformBreakdownError error={error} />;
  }

  if (!metricsData?.platformBreakdown || metricsData.platformBreakdown.length === 0) {
    return <PlatformBreakdownEmpty />;
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
            Breakdown por Plataforma
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Métricas detalladas por canal de comunicación
          </Typography>
        </Box>

        {!compactView && (
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Filtros de plataforma */}
            <PlatformFilters 
              availablePlatforms={metricsData.platformBreakdown.map(p => p.platform)}
              activeFilters={activeFilters}
              onToggle={handlePlatformToggle}
            />

            {/* Selector de ordenamiento */}
            <SortSelector 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={setSortBy}
              onOrderChange={setSortOrder}
            />
          </Stack>
        )}
      </Stack>

      {/* Vista compacta o expandida */}
      {compactView ? (
        <CompactPlatformView 
          platforms={sortedPlatforms}
          showConnectionStatus={showConnectionStatus}
        />
      ) : (
        <ExpandedPlatformView 
          platforms={sortedPlatforms}
          showConnectionStatus={showConnectionStatus}
          timeRange={timeRange}
        />
      )}

      {/* Resumen general */}
      {!compactView && (
        <PlatformSummary platforms={sortedPlatforms} />
      )}
    </Box>
  );
}

// =====================================================
// Vista compacta
// =====================================================

function CompactPlatformView({ 
  platforms, 
  showConnectionStatus 
}: { 
  platforms: PlatformMetrics[]; 
  showConnectionStatus: boolean; 
}) {
  return (
    <Stack spacing={2}>
      {platforms.map((platform) => (
        <Card key={platform.platform} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <PlatformIcon platform={platform.platform} size="sm" />
              <Box>
                <Typography variant="body1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                  {platform.platform}
                </Typography>
                {showConnectionStatus && (
                  <ConnectionStatus status={platform.connectionStatus} size="sm" />
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={3} alignItems="center">
              <Box textAlign="center">
                <Typography variant="body2" fontWeight="600">
                  {platform.messageCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mensajes
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" fontWeight="600">
                  {platform.responseRate}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Respuesta
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" fontWeight="600">
                  {formatTime(platform.averageResponseTime)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tiempo
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

// =====================================================
// Vista expandida
// =====================================================

function ExpandedPlatformView({ 
  platforms, 
  showConnectionStatus, 
  timeRange 
}: { 
  platforms: PlatformMetrics[]; 
  showConnectionStatus: boolean; 
  timeRange: TimeRange; 
}) {
  return (
    <Grid container spacing={3}>
      {platforms.map((platform) => (
        <Grid item xs={12} md={6} lg={4} key={platform.platform}>
          <PlatformCard 
            platform={platform}
            showConnectionStatus={showConnectionStatus}
            timeRange={timeRange}
          />
        </Grid>
      ))}
    </Grid>
  );
}

// =====================================================
// Card de plataforma individual
// =====================================================

function PlatformCard({ 
  platform, 
  showConnectionStatus, 
  timeRange 
}: { 
  platform: PlatformMetrics; 
  showConnectionStatus: boolean; 
  timeRange: TimeRange; 
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card sx={{ height: '100%' }}>
      {/* Header */}
      <CardContent sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <PlatformIcon platform={platform.platform} size="lg" />
            <Box>
              <Typography variant="h6" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                {platform.platform}
              </Typography>
              {showConnectionStatus && (
                <ConnectionStatus status={platform.connectionStatus} size="md" />
              )}
            </Box>
          </Stack>
          
          <IconButton
            onClick={() => setShowDetails(!showDetails)}
            size="small"
            color="inherit"
          >
            {showDetails ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Stack>

        {/* Métricas principales */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {platform.messageCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mensajes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {platform.activeConversations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Conversaciones
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>

      {/* Métricas secundarias */}
      <CardContent>
        <Stack spacing={3}>
          {/* Tasa de respuesta */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight="medium">
                Tasa de Respuesta
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {platform.responseRate}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={platform.responseRate}
              color={platform.responseRate >= 90 ? 'success' : platform.responseRate >= 70 ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Tiempo promedio de respuesta */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight="medium">
                Tiempo Promedio
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {formatTime(platform.averageResponseTime)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min((1800 - platform.averageResponseTime) / 1800 * 100, 100)}
              color={platform.averageResponseTime <= 300 ? 'success' : platform.averageResponseTime <= 900 ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Mensajes pendientes */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight="medium">
              Pendientes
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight="600"
              color={
                platform.pendingResponses > 5 ? 'error.main' : 
                platform.pendingResponses > 0 ? 'warning.main' : 'success.main'
              }
            >
              {platform.pendingResponses}
            </Typography>
          </Stack>

          {/* Tasa de conversión */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight="medium">
              Conversión
            </Typography>
            <Typography variant="body2" fontWeight="600">
              {platform.conversionRate}%
            </Typography>
          </Stack>
        </Stack>

        {/* Detalles expandidos */}
        <Collapse in={showDetails}>
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <PlatformDetails platform={platform} timeRange={timeRange} />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Detalles de plataforma
// =====================================================

function PlatformDetails({ platform, timeRange }: { platform: PlatformMetrics; timeRange: TimeRange }) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" fontWeight="medium">
        Detalles Adicionales
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Mejor hora:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              14:00 - 16:00
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Peor hora:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              22:00 - 08:00
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Día más activo:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              Martes
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Satisfacción:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              4.2/5.0
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          height: 128,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Gráfico de actividad por horas
        </Typography>
      </Box>
    </Stack>
  );
}

// =====================================================
// Filtros de plataforma
// =====================================================

function PlatformFilters({ 
  availablePlatforms, 
  activeFilters, 
  onToggle 
}: { 
  availablePlatforms: Platform[]; 
  activeFilters: Platform[]; 
  onToggle: (platform: Platform) => void; 
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" fontWeight="medium" color="text.secondary">
        Filtrar:
      </Typography>
      <Stack direction="row" spacing={0.5}>
        {availablePlatforms.map((platform) => (
          <Chip
            key={platform}
            label={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PlatformIcon platform={platform} size="xs" />
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {platform}
                </Typography>
              </Stack>
            }
            onClick={() => onToggle(platform)}
            variant={activeFilters.includes(platform) || activeFilters.length === 0 ? 'filled' : 'outlined'}
            color={activeFilters.includes(platform) || activeFilters.length === 0 ? 'primary' : 'default'}
            size="small"
            clickable
          />
        ))}
      </Stack>
    </Stack>
  );
}

// =====================================================
// Selector de ordenamiento
// =====================================================

function SortSelector({ 
  sortBy, 
  sortOrder, 
  onSortChange, 
  onOrderChange 
}: { 
  sortBy: string; 
  sortOrder: 'asc' | 'desc'; 
  onSortChange: (sort: any) => void; 
  onOrderChange: (order: 'asc' | 'desc') => void; 
}) {
  const sortOptions = [
    { value: 'messageCount', label: 'Mensajes' },
    { value: 'responseRate', label: 'Tasa de Respuesta' },
    { value: 'averageResponseTime', label: 'Tiempo de Respuesta' }
  ];

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          size="small"
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <IconButton
        onClick={() => onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        size="small"
        color="inherit"
        sx={{
          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}
      >
        <Sort />
      </IconButton>
    </Stack>
  );
}

// =====================================================
// Resumen de plataformas
// =====================================================

function PlatformSummary({ platforms }: { platforms: PlatformMetrics[] }) {
  const totalMessages = platforms.reduce((sum, p) => sum + p.messageCount, 0);
  const avgResponseRate = platforms.reduce((sum, p) => sum + p.responseRate, 0) / platforms.length;
  const avgResponseTime = platforms.reduce((sum, p) => sum + p.averageResponseTime, 0) / platforms.length;
  const totalPending = platforms.reduce((sum, p) => sum + p.pendingResponses, 0);

  return (
    <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
      <Typography variant="h6" fontWeight="600" mb={3}>
        Resumen General
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {totalMessages}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Mensajes
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {Math.round(avgResponseRate)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Respuesta Promedio
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              {formatTime(avgResponseTime)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tiempo Promedio
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Box textAlign="center">
            <Typography 
              variant="h4" 
              fontWeight="bold" 
              color={totalPending > 0 ? 'error.main' : 'success.main'}
            >
              {totalPending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Pendientes
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

function PlatformIcon({ platform, size }: { platform: Platform; size: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32
  };

  const iconProps = {
    sx: { 
      fontSize: sizeMap[size],
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

function ConnectionStatus({ status, size }: { status: string; size: 'sm' | 'md' }) {
  const statusConfig = {
    connected: { 
      color: 'success.main', 
      label: 'Conectado', 
      icon: <CheckCircle sx={{ fontSize: 8 }} />
    },
    disconnected: { 
      color: 'error.main', 
      label: 'Desconectado', 
      icon: <Error sx={{ fontSize: 8 }} />
    },
    error: { 
      color: 'warning.main', 
      label: 'Error', 
      icon: <Warning sx={{ fontSize: 8 }} />
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
  const textVariant = size === 'sm' ? 'caption' : 'body2';

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box 
        sx={{ 
          color: config.color,
          animation: status === 'connected' ? 'pulse 2s infinite' : 'none'
        }}
      >
        {config.icon}
      </Box>
      <Typography variant={textVariant} sx={{ color: config.color }}>
        {config.label}
      </Typography>
    </Stack>
  );
}

// =====================================================
// Estados de carga y error
// =====================================================

function PlatformBreakdownSkeleton({ compactView }: { compactView: boolean }) {
  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing={1}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Stack>
        <Skeleton variant="rectangular" width={300} height={32} />
      </Stack>
      
      {compactView ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={64} />
          ))}
        </Stack>
      ) : (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rectangular" height={256} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function PlatformBreakdownError({ error }: { error: Error }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'error.50',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2
        }}
      >
        <Error sx={{ fontSize: 32, color: 'error.main' }} />
      </Box>
      <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
        Error al cargar plataformas
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {error.message}
      </Typography>
      <Button 
        variant="contained"
        color="primary"
        onClick={() => window.location.reload()}
      >
        Reintentar
      </Button>
    </Box>
  );
}

function PlatformBreakdownEmpty() {
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
        No hay datos de plataformas
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Conecta tus plataformas de mensajería para ver las métricas aquí
      </Typography>
    </Box>
  );
}

// =====================================================
// Función auxiliar
// =====================================================

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    return `${Math.round(seconds / 3600)}h`;
  }
}