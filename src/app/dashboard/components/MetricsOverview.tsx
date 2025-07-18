// Metrics Overview - Componente de métricas generales del dashboard
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
  ButtonGroup,
  Chip,
  LinearProgress,
  Stack,
  IconButton,
  Alert,
  Skeleton,
  CircularProgress
} from './mui-components';

// Iconos personalizados usando SVG
const TrendingUpIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </Box>
);

const TrendingDownIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </Box>
);

const TrendingFlatIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </Box>
);

const ChatIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </Box>
);

const ScheduleIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Box>
);

const TimerIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </Box>
);

const CloseIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </Box>
);

const RefreshIcon = ({ sx, ...props }: any) => (
  <Box component="svg" sx={{ width: 20, height: 20, ...sx }} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </Box>
);
import { useDashboardMetrics } from '../../../hooks/useDashboardMetrics';
import { TimeRange, MetricsOverviewProps, MetricTrend } from '../../../types/dashboard';

// =====================================================
// Componente principal de métricas
// =====================================================

export function MetricsOverview({
  timeRange,
  realTimeData,
  comparisonEnabled,
  onTimeRangeChange
}: MetricsOverviewProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const { data: metricsData, loading, error } = useDashboardMetrics({
    timeRange,
    refreshInterval: 30000,
    enabled: true
  });

  // Usar datos en tiempo real si están disponibles, sino usar datos del hook
  const currentData = realTimeData || metricsData;

  if (loading && !currentData) {
    return <MetricsLoadingSkeleton />;
  }

  if (error) {
    return <MetricsErrorState error={error} />;
  }

  if (!currentData) {
    return <MetricsEmptyState />;
  }

  return (
    <Box>
      {/* Header con selector de tiempo */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Métricas Generales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Última actualización: {new Date(currentData.lastUpdated).toLocaleTimeString('es-ES')}
          </Typography>
        </Box>

        <TimeRangeSelector
          currentRange={timeRange}
          onRangeChange={onTimeRangeChange}
        />
      </Stack>

      {/* Cards de métricas principales */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Conversaciones Activas"
            value={currentData.activeConversations}
            trend={getTrendForMetric(currentData.trends, 'activeConversations')}
            icon="chat"
            color="primary"
            onClick={() => setSelectedMetric('conversations')}
            isSelected={selectedMetric === 'conversations'}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Mensajes Pendientes"
            value={currentData.pendingResponses}
            trend={getTrendForMetric(currentData.trends, 'pendingResponses')}
            icon="clock"
            color="warning"
            onClick={() => setSelectedMetric('pending')}
            isSelected={selectedMetric === 'pending'}
            urgent={currentData.pendingResponses > 10}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Tiempo Promedio"
            value={formatTime(currentData.averageResponseTime)}
            trend={getTrendForMetric(currentData.trends, 'averageResponseTime')}
            icon="timer"
            color="success"
            onClick={() => setSelectedMetric('response-time')}
            isSelected={selectedMetric === 'response-time'}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Tasa de Conversión"
            value={`${currentData.conversionRate}%`}
            trend={getTrendForMetric(currentData.trends, 'conversionRate')}
            icon="trending-up"
            color="secondary"
            onClick={() => setSelectedMetric('conversion')}
            isSelected={selectedMetric === 'conversion'}
          />
        </Grid>
      </Grid>

      {/* Gráfico de tendencias */}
      {comparisonEnabled && currentData.trends.length > 0 && (
        <TrendsChart
          trends={currentData.trends}
          timeRange={timeRange}
          selectedMetric={selectedMetric}
        />
      )}

      {/* Alertas activas - Comentado temporalmente ya que LiveMetrics no tiene alerts */}
      {/* {currentData.alerts && currentData.alerts.length > 0 && (
        <AlertsSection alerts={currentData.alerts} />
      )} */}

      {/* Métricas detalladas */}
      {selectedMetric && (
        <Box sx={{ mt: 2 }}>
          <DetailedMetrics
            metric={selectedMetric}
            data={currentData}
            onClose={() => setSelectedMetric(null)}
          />
        </Box>
      )}
    </Box>
  );
}

// =====================================================
// Componente de card de métrica individual
// =====================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: MetricTrend;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  onClick?: () => void;
  isSelected?: boolean;
  urgent?: boolean;
  target?: number;
  achievement?: number;
}

function MetricCard({
  title,
  value,
  trend,
  icon,
  color,
  onClick,
  isSelected,
  urgent,
  target,
  achievement
}: MetricCardProps) {
  return (
    <Card
      sx={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: 2,
        borderColor: isSelected ? `${color}.main` : 'grey.300',
        bgcolor: isSelected ? `${color}.50` : 'background.paper',
        '&:hover': {
          borderColor: isSelected ? `${color}.main` : 'grey.400',
          boxShadow: 2
        },
        ...(urgent && {
          boxShadow: `0 0 0 2px ${urgent ? 'error.main' : 'transparent'}`,
          animation: urgent ? 'pulse 2s infinite' : 'none'
        })
      }}
      onClick={onClick}
    >
      {/* Indicador de urgencia */}
      {urgent && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            bgcolor: 'error.main',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }}
        />
      )}

      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: isSelected ? 'background.paper' : 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MetricIcon icon={icon} color={color} />
          </Box>

          {trend && (
            <TrendIndicator trend={trend} />
          )}
        </Stack>

        {/* Valor principal */}
        <Box mb={1}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>

        {/* Barra de progreso para objetivos */}
        {target && achievement !== undefined && (
          <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                Objetivo: {formatTime(target)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {achievement}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(achievement, 100)}
              color={achievement >= 80 ? 'success' : achievement >= 60 ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// Selector de rango de tiempo
// =====================================================

interface TimeRangeSelectorProps {
  currentRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

function TimeRangeSelector({ currentRange, onRangeChange }: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'last_7_days', label: '7 días' },
    { value: 'last_30_days', label: '30 días' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes pasado' }
  ];

  return (
    <ButtonGroup variant="outlined" size="small">
      {ranges.map((range) => (
        <Button
          key={range.value}
          onClick={() => onRangeChange(range.value)}
          variant={currentRange === range.value ? 'contained' : 'outlined'}
          size="small"
        >
          {range.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

// =====================================================
// Indicador de tendencia
// =====================================================

function TrendIndicator({ trend }: { trend: MetricTrend }) {
  const getTrendIcon = () => {
    switch (trend.trend) {
      case 'up': return <TrendingUpIcon sx={{ fontSize: 16 }} />;
      case 'down': return <TrendingDownIcon sx={{ fontSize: 16 }} />;
      case 'stable': return <TrendingFlatIcon sx={{ fontSize: 16 }} />;
      default: return <TrendingFlatIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend.trend) {
      case 'up': return 'success.main';
      case 'down': return 'error.main';
      case 'stable': return 'text.secondary';
      default: return 'text.secondary';
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Box sx={{ color: getTrendColor(), display: 'flex', alignItems: 'center' }}>
        {getTrendIcon()}
      </Box>
      <Typography variant="caption" fontWeight="medium" sx={{ color: getTrendColor() }}>
        {Math.abs(trend.change)}%
      </Typography>
    </Stack>
  );
}

// =====================================================
// Gráfico de tendencias
// =====================================================

interface TrendsChartProps {
  trends: MetricTrend[];
  timeRange: TimeRange;
  selectedMetric: string | null;
}

function TrendsChart({ trends, timeRange, selectedMetric }: TrendsChartProps) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="600">
          Tendencias
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comparación con período anterior
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {trends.map((trend) => (
          <Grid item xs={12} sm={6} lg={3} key={trend.metric}>
            <Card
              sx={{
                p: 2,
                border: 1,
                borderColor: selectedMetric === trend.metric ? 'primary.main' : 'grey.300',
                bgcolor: selectedMetric === trend.metric ? 'primary.50' : 'grey.50',
                transition: 'all 0.2s'
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ textTransform: 'capitalize' }}>
                  {trend.metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </Typography>
                <TrendIndicator trend={trend} />
              </Stack>
              <Typography variant="h6" fontWeight="bold" color="text.primary">
                {trend.current}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Anterior: {trend.previous}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
}

// =====================================================
// Sección de alertas
// =====================================================

function AlertsSection({ alerts }: { alerts: any[] }) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="600" mb={3}>
        Alertas Activas
      </Typography>
      <Stack spacing={2}>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            severity={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
            action={
              alert.actionable && alert.action && (
                <Button size="small" color="inherit">
                  {alert.action.label}
                </Button>
              )
            }
          >
            <Typography variant="subtitle2" fontWeight="medium">
              {alert.title}
            </Typography>
            <Typography variant="body2">
              {alert.message}
            </Typography>
          </Alert>
        ))}
      </Stack>
    </Card>
  );
}

// =====================================================
// Métricas detalladas
// =====================================================

function DetailedMetrics({ metric, data, onClose }: {
  metric: string;
  data: any;
  onClose: () => void;
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
          Detalles de {metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </Typography>
        <IconButton onClick={onClose} size="small" color="inherit">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box
        sx={{
          height: 256,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Gráfico detallado de {metric}
        </Typography>
      </Box>
    </Card>
  );
}

// =====================================================
// Estados de carga y error
// =====================================================

function MetricsLoadingSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing={1}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Stack>
        <Skeleton variant="rectangular" width={300} height={32} />
      </Stack>

      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <Card sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Skeleton variant="text" width={50} height={24} />
                </Stack>
                <Stack spacing={1}>
                  <Skeleton variant="text" width={60} height={32} />
                  <Skeleton variant="text" width={100} height={20} />
                </Stack>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function MetricsErrorState({ error }: { error: Error }) {
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
        <Box sx={{ color: 'error.main', fontSize: 32 }}>⚠</Box>
      </Box>
      <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
        Error al cargar métricas
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {error.message}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => window.location.reload()}
        startIcon={<RefreshIcon />}
      >
        Reintentar
      </Button>
    </Box>
  );
}

function MetricsEmptyState() {
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
        <Box sx={{ color: 'text.disabled', fontSize: 32 }}>📊</Box>
      </Box>
      <Typography variant="h6" fontWeight="medium" color="text.primary" mb={1}>
        No hay datos disponibles
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Las métricas aparecerán aquí cuando tengas actividad en tu dashboard
      </Typography>
    </Box>
  );
}

// =====================================================
// Componente de icono de métrica
// =====================================================

function MetricIcon({ icon, color }: { icon: string; color: string }) {
  const iconSx = {
    width: 24,
    height: 24,
    color: `${color}.main`
  };

  const icons: Record<string, JSX.Element> = {
    chat: <ChatIcon sx={iconSx} />,
    clock: <ScheduleIcon sx={iconSx} />,
    timer: <TimerIcon sx={iconSx} />,
    'trending-up': <TrendingUpIcon sx={iconSx} />
  };

  return icons[icon] || icons.chat;
}

// =====================================================
// Funciones auxiliares
// =====================================================

function getTrendForMetric(trends: MetricTrend[], metricName: string): MetricTrend | undefined {
  return trends.find(trend => trend.metric === metricName);
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    return `${Math.round(seconds / 3600)}h`;
  }
}