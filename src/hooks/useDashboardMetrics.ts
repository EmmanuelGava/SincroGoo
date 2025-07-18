// Dashboard Metrics Hook - Hook personalizado para métricas del dashboard
// Fecha: 2025-01-16

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  DashboardMetricsResponse, 
  TimeRange, 
  Platform,
  UseDashboardMetricsOptions,
  UseDashboardMetricsReturn,
  DashboardError
} from '@/types/dashboard';

// =====================================================
// Hook principal para métricas del dashboard
// =====================================================

export function useDashboardMetrics(options: UseDashboardMetricsOptions): UseDashboardMetricsReturn {
  const { data: session } = useSession();
  const {
    timeRange = 'today',
    refreshInterval = 30000, // 30 segundos por defecto
    enabled = true,
    platforms
  } = options;

  // Estados
  const [data, setData] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Referencias para control de intervalos y requests
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  // =====================================================
  // Función para fetch de datos
  // =====================================================

  const fetchMetrics = useCallback(async (includeComparison = false): Promise<DashboardMetricsResponse | null> => {
    if (!session?.user?.id || !enabled) {
      return null;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Construir URL con parámetros
      const params = new URLSearchParams({
        timeRange,
        includeComparison: includeComparison.toString()
      });

      if (platforms && platforms.length > 0) {
        params.append('platforms', JSON.stringify(platforms));
      }

      const response = await fetch(`/api/dashboard/metrics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const metricsData: DashboardMetricsResponse = await response.json();

      // Solo actualizar estado si el componente sigue montado
      if (mountedRef.current) {
        setData(metricsData);
        setLastUpdated(metricsData.lastUpdated);
        setError(null);
      }

      return metricsData;

    } catch (err) {
      // Ignorar errores de abort
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      console.error('Error fetching dashboard metrics:', err);
      
      if (mountedRef.current) {
        const dashboardError = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(dashboardError);
        setData(null);
      }

      return null;

    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [session?.user?.id, enabled, timeRange, platforms]);

  // =====================================================
  // Función de refetch manual
  // =====================================================

  const refetch = useCallback(async () => {
    return await fetchMetrics(true); // Incluir comparación en refetch manual
  }, [fetchMetrics]);

  // =====================================================
  // Configurar polling automático
  // =====================================================

  useEffect(() => {
    if (!enabled || !session?.user?.id) {
      return;
    }

    // Fetch inicial
    fetchMetrics();

    // Configurar intervalo de actualización
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchMetrics, refreshInterval, enabled, session?.user?.id]);

  // =====================================================
  // Cleanup al desmontar
  // =====================================================

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // =====================================================
  // Manejo de cambios en dependencias
  // =====================================================

  useEffect(() => {
    // Refetch cuando cambien las opciones críticas
    if (enabled && session?.user?.id) {
      fetchMetrics();
    }
  }, [timeRange, platforms, enabled, session?.user?.id]);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  };
}

// =====================================================
// Hook para métricas en tiempo real con Supabase
// =====================================================

export function useDashboardRealtime(userId: string, enabled = true) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Aquí se implementaría la conexión a Supabase Realtime
    // Por ahora, simulamos la conexión
    const connectToRealtime = async () => {
      try {
        setIsConnected(true);
        setConnectionError(null);
        setLastUpdate(new Date().toISOString());
        
        // Simular actualizaciones periódicas
        const interval = setInterval(() => {
          setLastUpdate(new Date().toISOString());
        }, 5000);

        return () => {
          clearInterval(interval);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Error connecting to realtime:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setIsConnected(false);
      }
    };

    const cleanup = connectToRealtime();

    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      } else if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [userId, enabled]);

  return {
    isConnected,
    lastUpdate,
    connectionError
  };
}

// =====================================================
// Hook para invalidar cache de métricas
// =====================================================

export function useDashboardCache() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<boolean>(false);

  const invalidateCache = useCallback(async (): Promise<boolean> => {
    if (!session?.user?.id) {
      return false;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/dashboard/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'invalidate_cache'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Cache invalidated:', result);
      
      return true;

    } catch (error) {
      console.error('Error invalidating cache:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  return {
    invalidateCache,
    loading
  };
}

// =====================================================
// Hook para métricas con comparación temporal
// =====================================================

export function useDashboardComparison(timeRange: TimeRange, enabled = true) {
  const baseMetrics = useDashboardMetrics({ 
    timeRange, 
    enabled,
    refreshInterval: 60000 // 1 minuto para comparaciones
  });

  const [comparisonData, setComparisonData] = useState<{
    current: DashboardMetricsResponse | null;
    previous: DashboardMetricsResponse | null;
    trends: any[];
  }>({
    current: null,
    previous: null,
    trends: []
  });

  useEffect(() => {
    if (baseMetrics.data && enabled) {
      setComparisonData(prev => ({
        ...prev,
        current: baseMetrics.data,
        trends: baseMetrics.data?.trends || []
      }));
    }
  }, [baseMetrics.data, enabled]);

  return {
    ...baseMetrics,
    comparisonData,
    trends: comparisonData.trends
  };
}

// =====================================================
// Tipos de utilidad para los hooks
// =====================================================

export interface DashboardMetricsHookOptions {
  timeRange?: TimeRange;
  platforms?: Platform[];
  refreshInterval?: number;
  enabled?: boolean;
  includeComparison?: boolean;
}

export interface RealtimeConnectionStatus {
  isConnected: boolean;
  lastUpdate: string | null;
  connectionError: string | null;
}

// =====================================================
// Hook compuesto para dashboard completo
// =====================================================

export function useDashboard(options: DashboardMetricsHookOptions = {}) {
  const { data: session } = useSession();
  const {
    timeRange = 'today',
    platforms,
    refreshInterval = 30000,
    enabled = true,
    includeComparison = false
  } = options;

  // Métricas principales
  const metrics = useDashboardMetrics({
    timeRange,
    platforms,
    refreshInterval,
    enabled: enabled && !!session?.user?.id
  });

  // Conexión en tiempo real
  const realtime = useDashboardRealtime(
    session?.user?.id || '',
    enabled && !!session?.user?.id
  );

  // Cache management
  const cache = useDashboardCache();

  // Estado combinado
  const isLoading = metrics.loading;
  const hasError = !!metrics.error;
  const isConnected = realtime.isConnected;

  return {
    // Datos
    data: metrics.data,
    lastUpdated: metrics.lastUpdated,
    
    // Estados
    loading: isLoading,
    error: metrics.error,
    connected: isConnected,
    
    // Acciones
    refetch: metrics.refetch,
    invalidateCache: cache.invalidateCache,
    
    // Información adicional
    realtime: {
      isConnected: realtime.isConnected,
      lastUpdate: realtime.lastUpdate,
      error: realtime.connectionError
    }
  };
}