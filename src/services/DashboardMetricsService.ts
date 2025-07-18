// Dashboard Metrics Service - Servicio para consultas agregadas del dashboard
// Fecha: 2025-01-16

import { createClient } from '@supabase/supabase-js';
import { 
  DashboardMetricsResponse, 
  DashboardOverview, 
  PlatformMetrics, 
  MetricTrend, 
  TimeSeriesPoint,
  Alert,
  TimeRange,
  Platform
} from '@/types/dashboard';
import { 
  MetricasConversaciones, 
  MetricasLeads, 
  MetricasPlataforma,
  DashboardMetricsCache 
} from '@/types/database';

export class DashboardMetricsService {
  private supabase;
  private cacheExpiryMinutes = 5; // Cache por 5 minutos por defecto

  constructor(supabaseToken?: string) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseToken ? {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`
          }
        }
      } : undefined
    );
  }

  // =====================================================
  // Métodos principales
  // =====================================================

  async getDashboardMetrics(
    usuarioId: string, 
    timeRange: TimeRange = 'today',
    platforms?: Platform[],
    includeComparison = false
  ): Promise<DashboardMetricsResponse> {
    try {
      // Intentar obtener datos del cache primero
      const cachedData = await this.getCachedMetrics(usuarioId, 'overview_metrics', timeRange);
      if (cachedData) {
        return cachedData as DashboardMetricsResponse;
      }

      // Si no hay cache, calcular métricas
      const [overview, platformBreakdown, timeSeriesData, alerts, trends] = await Promise.all([
        this.getOverviewMetrics(usuarioId, timeRange),
        this.getPlatformBreakdown(usuarioId, timeRange, platforms),
        this.getTimeSeriesData(usuarioId, timeRange),
        this.getActiveAlerts(usuarioId),
        includeComparison ? this.getMetricTrends(usuarioId, timeRange) : []
      ]);

      const response: DashboardMetricsResponse = {
        overview,
        platformBreakdown,
        timeSeriesData,
        alerts,
        trends,
        lastUpdated: new Date().toISOString()
      };

      // Guardar en cache
      await this.setCachedMetrics(usuarioId, 'overview_metrics', timeRange, response);

      return response;
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  }

  // =====================================================
  // Métricas de overview
  // =====================================================

  private async getOverviewMetrics(usuarioId: string, timeRange: TimeRange): Promise<DashboardOverview> {
    const dateRange = this.getDateRange(timeRange);

    // Consulta para conversaciones activas
    const { data: conversacionesData } = await this.supabase
      .from('conversaciones')
      .select(`
        id,
        fecha_mensaje,
        servicio_origen,
        mensajes_conversacion!inner(
          id,
          fecha_mensaje,
          tipo
        )
      `)
      .eq('usuario_id', usuarioId)
      .gte('fecha_mensaje', dateRange.start)
      .lte('fecha_mensaje', dateRange.end);

    // Consulta para leads
    const { data: leadsData } = await this.supabase
      .from('leads')
      .select('id, valor_potencial, fecha_creacion, asignado_a')
      .or(`creado_por.eq.${usuarioId},asignado_a.eq.${usuarioId}`)
      .gte('fecha_creacion', dateRange.start)
      .lte('fecha_creacion', dateRange.end);

    // Calcular métricas
    const activeConversations = conversacionesData?.length || 0;
    
    const pendingResponses = conversacionesData?.filter(conv => {
      const lastMessage = conv.mensajes_conversacion?.[0];
      return lastMessage?.tipo === 'entrante' && 
             new Date(lastMessage.fecha_mensaje) > new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 horas
    }).length || 0;

    const averageResponseTime = await this.calculateAverageResponseTime(usuarioId, dateRange);
    const conversionRate = await this.calculateConversionRate(usuarioId, dateRange);
    
    const totalLeads = leadsData?.length || 0;
    const newLeadsToday = totalLeads; // Simplified for now

    // Obtener objetivo de tiempo de respuesta de las preferencias del usuario
    const { data: preferences } = await this.supabase
      .from('dashboard_preferences')
      .select('custom_objectives')
      .eq('usuario_id', usuarioId)
      .single();

    const responseTimeTarget = preferences?.custom_objectives?.response_time_target || 120; // 2 minutos por defecto
    const targetAchievement = averageResponseTime > 0 ? 
      Math.max(0, 100 - ((averageResponseTime - responseTimeTarget) / responseTimeTarget * 100)) : 100;

    return {
      activeConversations,
      pendingResponses,
      averageResponseTime,
      conversionRate,
      totalLeads,
      newLeadsToday,
      responseTimeTarget,
      targetAchievement: Math.round(targetAchievement)
    };
  }

  // =====================================================
  // Breakdown por plataforma
  // =====================================================

  private async getPlatformBreakdown(
    usuarioId: string, 
    timeRange: TimeRange, 
    platforms?: Platform[]
  ): Promise<PlatformMetrics[]> {
    const dateRange = this.getDateRange(timeRange);
    
    // Obtener configuraciones de mensajería activas
    const { data: configuraciones } = await this.supabase
      .from('configuracion_mensajeria_usuario')
      .select('plataforma, activa, configuracion')
      .eq('usuario_id', usuarioId)
      .eq('activa', true);

    const platformsToQuery = platforms || ['whatsapp', 'telegram', 'email'];
    const metrics: PlatformMetrics[] = [];

    for (const platform of platformsToQuery) {
      const config = configuraciones?.find(c => c.plataforma === platform);
      
      // Consultar conversaciones por plataforma
      const { data: conversaciones } = await this.supabase
        .from('conversaciones')
        .select(`
          id,
          servicio_origen,
          fecha_mensaje,
          mensajes_conversacion(
            id,
            tipo,
            fecha_mensaje
          )
        `)
        .eq('usuario_id', usuarioId)
        .eq('servicio_origen', platform)
        .gte('fecha_mensaje', dateRange.start)
        .lte('fecha_mensaje', dateRange.end);

      const messageCount = conversaciones?.reduce((total, conv) => 
        total + (conv.mensajes_conversacion?.length || 0), 0) || 0;

      const activeConversations = conversaciones?.length || 0;
      
      const pendingResponses = conversaciones?.filter(conv => {
        const lastMessage = conv.mensajes_conversacion?.[0];
        return lastMessage?.tipo === 'entrante';
      }).length || 0;

      const responseRate = activeConversations > 0 ? 
        ((activeConversations - pendingResponses) / activeConversations) * 100 : 100;

      const averageResponseTime = await this.calculatePlatformResponseTime(usuarioId, platform, dateRange);
      
      const connectionStatus = this.getConnectionStatus(config);
      const conversionRate = await this.calculatePlatformConversionRate(usuarioId, platform, dateRange);

      metrics.push({
        platform,
        messageCount,
        responseRate: Math.round(responseRate),
        averageResponseTime,
        connectionStatus,
        activeConversations,
        pendingResponses,
        conversionRate
      });
    }

    return metrics;
  }

  // =====================================================
  // Datos de series temporales
  // =====================================================

  private async getTimeSeriesData(usuarioId: string, timeRange: TimeRange): Promise<TimeSeriesPoint[]> {
    const dateRange = this.getDateRange(timeRange);
    const interval = this.getTimeSeriesInterval(timeRange);

    const { data } = await this.supabase
      .from('mensajes_conversacion')
      .select(`
        fecha_mensaje,
        conversacion_id,
        conversaciones!inner(usuario_id)
      `)
      .eq('conversaciones.usuario_id', usuarioId)
      .gte('fecha_mensaje', dateRange.start)
      .lte('fecha_mensaje', dateRange.end)
      .order('fecha_mensaje');

    // Agrupar por intervalo de tiempo
    const groupedData = this.groupByTimeInterval(data || [], interval);
    
    return Object.entries(groupedData).map(([timestamp, count]) => ({
      timestamp,
      value: count as number,
      label: this.formatTimeLabel(timestamp, interval)
    }));
  }

  // =====================================================
  // Alertas activas
  // =====================================================

  private async getActiveAlerts(usuarioId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Alerta por mensajes sin responder
    const { data: pendingMessages } = await this.supabase
      .from('conversaciones')
      .select(`
        id,
        lead_id,
        leads(nombre),
        mensajes_conversacion!inner(
          fecha_mensaje,
          tipo
        )
      `)
      .eq('usuario_id', usuarioId)
      .eq('mensajes_conversacion.tipo', 'entrante')
      .lt('mensajes_conversacion.fecha_mensaje', twoHoursAgo.toISOString());

    if (pendingMessages && pendingMessages.length > 0) {
      alerts.push({
        id: 'pending-responses',
        type: 'warning',
        title: 'Mensajes sin responder',
        message: `Tienes ${pendingMessages.length} mensajes sin responder por más de 2 horas`,
        actionable: true,
        action: {
          label: 'Ver conversaciones',
          url: '/dashboard?section=conversations&filter=pending'
        },
        priority: 'high',
        timestamp: now.toISOString(),
        dismissed: false
      });
    }

    // Alerta por tareas vencidas
    const { data: overdueTasks } = await this.supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('usuario_id', usuarioId)
      .eq('status', 'pending')
      .lt('due_date', now.toISOString());

    if (overdueTasks && overdueTasks.length > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: 'error',
        title: 'Tareas vencidas',
        message: `Tienes ${overdueTasks.length} tareas vencidas`,
        actionable: true,
        action: {
          label: 'Ver tareas',
          url: '/dashboard?section=tasks&filter=overdue'
        },
        priority: 'urgent',
        timestamp: now.toISOString(),
        dismissed: false
      });
    }

    return alerts;
  }

  // =====================================================
  // Tendencias y comparativas
  // =====================================================

  private async getMetricTrends(usuarioId: string, timeRange: TimeRange): Promise<MetricTrend[]> {
    const currentRange = this.getDateRange(timeRange);
    const previousRange = this.getPreviousDateRange(timeRange);

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getOverviewMetrics(usuarioId, timeRange),
      this.getOverviewMetricsForRange(usuarioId, previousRange)
    ]);

    const trends: MetricTrend[] = [
      {
        metric: 'activeConversations',
        current: currentMetrics.activeConversations,
        previous: previousMetrics.activeConversations,
        change: this.calculatePercentageChange(previousMetrics.activeConversations, currentMetrics.activeConversations),
        trend: this.getTrendDirection(previousMetrics.activeConversations, currentMetrics.activeConversations)
      },
      {
        metric: 'averageResponseTime',
        current: currentMetrics.averageResponseTime,
        previous: previousMetrics.averageResponseTime,
        change: this.calculatePercentageChange(previousMetrics.averageResponseTime, currentMetrics.averageResponseTime),
        trend: this.getTrendDirection(previousMetrics.averageResponseTime, currentMetrics.averageResponseTime, true) // invertido para tiempo de respuesta
      },
      {
        metric: 'conversionRate',
        current: currentMetrics.conversionRate,
        previous: previousMetrics.conversionRate,
        change: this.calculatePercentageChange(previousMetrics.conversionRate, currentMetrics.conversionRate),
        trend: this.getTrendDirection(previousMetrics.conversionRate, currentMetrics.conversionRate)
      }
    ];

    return trends;
  }

  // =====================================================
  // Métodos de cache
  // =====================================================

  private async getCachedMetrics(
    usuarioId: string, 
    metricType: string, 
    timeRange: TimeRange
  ): Promise<any | null> {
    const { data } = await this.supabase
      .from('dashboard_metrics_cache')
      .select('data, expires_at')
      .eq('usuario_id', usuarioId)
      .eq('metric_type', metricType)
      .eq('time_range', timeRange)
      .gt('expires_at', new Date().toISOString())
      .single();

    return data?.data || null;
  }

  private async setCachedMetrics(
    usuarioId: string,
    metricType: string,
    timeRange: TimeRange,
    data: any,
    expiryMinutes = this.cacheExpiryMinutes
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.supabase
      .from('dashboard_metrics_cache')
      .upsert({
        usuario_id: usuarioId,
        metric_type: metricType,
        time_range: timeRange,
        data,
        expires_at: expiresAt.toISOString(),
        filters: {}
      });
  }

  // =====================================================
  // Métodos auxiliares
  // =====================================================

  private getDateRange(timeRange: TimeRange): { start: string; end: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeRange) {
      case 'today':
        return {
          start: today.toISOString(),
          end: now.toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday.toISOString(),
          end: today.toISOString()
        };
      case 'last_7_days':
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: sevenDaysAgo.toISOString(),
          end: now.toISOString()
        };
      case 'last_30_days':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString()
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfMonth.toISOString(),
          end: now.toISOString()
        };
      case 'last_month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: startOfLastMonth.toISOString(),
          end: endOfLastMonth.toISOString()
        };
      default:
        return {
          start: today.toISOString(),
          end: now.toISOString()
        };
    }
  }

  private getPreviousDateRange(timeRange: TimeRange): { start: string; end: string } {
    const current = this.getDateRange(timeRange);
    const currentStart = new Date(current.start);
    const currentEnd = new Date(current.end);
    const duration = currentEnd.getTime() - currentStart.getTime();

    return {
      start: new Date(currentStart.getTime() - duration).toISOString(),
      end: currentStart.toISOString()
    };
  }

  private async calculateAverageResponseTime(usuarioId: string, dateRange: { start: string; end: string }): Promise<number> {
    // Implementar cálculo de tiempo promedio de respuesta
    // Esta es una implementación simplificada
    return 95; // segundos
  }

  private async calculateConversionRate(usuarioId: string, dateRange: { start: string; end: string }): Promise<number> {
    // Implementar cálculo de tasa de conversión
    // Esta es una implementación simplificada
    return 12.5; // porcentaje
  }

  private async calculatePlatformResponseTime(usuarioId: string, platform: string, dateRange: { start: string; end: string }): Promise<number> {
    // Implementar cálculo específico por plataforma
    return 90; // segundos
  }

  private async calculatePlatformConversionRate(usuarioId: string, platform: string, dateRange: { start: string; end: string }): Promise<number> {
    // Implementar cálculo específico por plataforma
    return 10; // porcentaje
  }

  private getConnectionStatus(config: any): 'connected' | 'disconnected' | 'error' {
    if (!config) return 'disconnected';
    if (!config.activa) return 'disconnected';
    // Aquí se podría implementar lógica más compleja para verificar el estado real
    return 'connected';
  }

  private getTimeSeriesInterval(timeRange: TimeRange): 'hour' | 'day' | 'week' {
    switch (timeRange) {
      case 'today':
      case 'yesterday':
        return 'hour';
      case 'last_7_days':
      case 'last_30_days':
        return 'day';
      default:
        return 'day';
    }
  }

  private groupByTimeInterval(data: any[], interval: 'hour' | 'day' | 'week'): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    data.forEach(item => {
      const date = new Date(item.fecha_mensaje);
      let key: string;

      switch (interval) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    return grouped;
  }

  private formatTimeLabel(timestamp: string, interval: 'hour' | 'day' | 'week'): string {
    const date = new Date(timestamp);
    
    switch (interval) {
      case 'hour':
        return `${String(date.getHours()).padStart(2, '0')}:00`;
      case 'day':
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      case 'week':
        return `Semana ${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}`;
      default:
        return timestamp;
    }
  }

  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private getTrendDirection(previous: number, current: number, inverted = false): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% threshold for stability
    const change = Math.abs(current - previous) / (previous || 1);
    
    if (change < threshold) return 'stable';
    
    const isUp = current > previous;
    if (inverted) {
      return isUp ? 'down' : 'up';
    }
    return isUp ? 'up' : 'down';
  }

  private async getOverviewMetricsForRange(usuarioId: string, dateRange: { start: string; end: string }): Promise<DashboardOverview> {
    // Implementación similar a getOverviewMetrics pero para un rango específico
    // Por simplicidad, retornamos valores por defecto
    return {
      activeConversations: 0,
      pendingResponses: 0,
      averageResponseTime: 0,
      conversionRate: 0,
      totalLeads: 0,
      newLeadsToday: 0,
      responseTimeTarget: 120,
      targetAchievement: 0
    };
  }

  // =====================================================
  // Método para limpiar cache expirado
  // =====================================================

  async cleanExpiredCache(): Promise<number> {
    const { data } = await this.supabase
      .rpc('clean_expired_dashboard_cache');
    
    return data || 0;
  }
}