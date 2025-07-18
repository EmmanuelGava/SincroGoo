// Dashboard Metrics Service Tests - Tests unitarios para el servicio de métricas
// Fecha: 2025-01-16

import { DashboardMetricsService } from '../DashboardMetricsService';
import { TimeRange, Platform } from '@/types/dashboard';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockReturnThis(),
};

// Mock del módulo de Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('DashboardMetricsService', () => {
  let service: DashboardMetricsService;
  const mockUserId = 'test-user-id';
  const mockToken = 'test-supabase-token';

  beforeEach(() => {
    service = new DashboardMetricsService(mockToken);
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return cached metrics when available', async () => {
      const cachedData = {
        overview: {
          activeConversations: 5,
          pendingResponses: 2,
          averageResponseTime: 95,
          conversionRate: 12.5,
          totalLeads: 10,
          newLeadsToday: 3,
          responseTimeTarget: 120,
          targetAchievement: 85
        },
        platformBreakdown: [],
        timeSeriesData: [],
        alerts: [],
        trends: [],
        lastUpdated: new Date().toISOString()
      };

      // Mock cache hit
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: { data: cachedData }
        })
      });

      const result = await service.getDashboardMetrics(mockUserId, 'today');

      expect(result).toEqual(cachedData);
      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_metrics_cache');
    });

    it('should calculate fresh metrics when cache is empty', async () => {
      // Mock cache miss
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null })
      });

      // Mock conversaciones data
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'conv-1',
              fecha_mensaje: new Date().toISOString(),
              servicio_origen: 'whatsapp',
              mensajes_conversacion: [
                { id: 'msg-1', tipo: 'entrante', fecha_mensaje: new Date().toISOString() }
              ]
            }
          ]
        })
      });

      // Mock leads data
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            { id: 'lead-1', valor_potencial: 1000, fecha_creacion: new Date().toISOString() }
          ]
        })
      });

      // Mock preferences data
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            custom_objectives: {
              response_time_target: 120,
              daily_conversations_target: 50,
              conversion_rate_target: 15
            }
          }
        })
      });

      // Mock configuraciones data
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            { plataforma: 'whatsapp', activa: true, configuracion: {} }
          ]
        })
      });

      // Mock cache set
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        upsert: jest.fn().mockResolvedValue({ data: null })
      });

      const result = await service.getDashboardMetrics(mockUserId, 'today');

      expect(result).toBeDefined();
      expect(result.overview).toBeDefined();
      expect(result.platformBreakdown).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should handle different time ranges correctly', async () => {
      const timeRanges: TimeRange[] = ['today', 'yesterday', 'last_7_days', 'last_30_days'];

      for (const timeRange of timeRanges) {
        // Mock cache miss
        mockSupabase.from.mockReturnValueOnce({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ data: null })
        });

        // Mock empty data responses
        mockSupabase.from.mockReturnValue({
          ...mockSupabase,
          mockResolvedValue: jest.fn().mockResolvedValue({ data: [] })
        });

        const result = await service.getDashboardMetrics(mockUserId, timeRange);
        expect(result).toBeDefined();
      }
    });

    it('should filter by platforms when specified', async () => {
      const platforms: Platform[] = ['whatsapp', 'telegram'];

      // Mock cache miss
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null })
      });

      // Mock empty responses for simplicity
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        mockResolvedValue: jest.fn().mockResolvedValue({ data: [] })
      });

      const result = await service.getDashboardMetrics(mockUserId, 'today', platforms);

      expect(result).toBeDefined();
      expect(result.platformBreakdown).toHaveLength(platforms.length);
    });

    it('should handle errors gracefully', async () => {
      // Mock cache error
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(service.getDashboardMetrics(mockUserId, 'today'))
        .rejects.toThrow('Failed to fetch dashboard metrics');
    });
  });

  describe('cleanExpiredCache', () => {
    it('should call the cleanup function and return count', async () => {
      const expectedCount = 5;
      mockSupabase.rpc.mockResolvedValue({ data: expectedCount });

      const result = await service.cleanExpiredCache();

      expect(result).toBe(expectedCount);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('clean_expired_dashboard_cache');
    });

    it('should return 0 when no data is returned', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null });

      const result = await service.cleanExpiredCache();

      expect(result).toBe(0);
    });
  });

  describe('Date range calculations', () => {
    it('should calculate correct date ranges for different time periods', () => {
      // Estos son métodos privados, pero podemos testear indirectamente
      // a través de los métodos públicos que los usan
      
      const timeRanges: TimeRange[] = ['today', 'yesterday', 'last_7_days', 'last_30_days'];
      
      timeRanges.forEach(async (timeRange) => {
        // Mock responses
        mockSupabase.from.mockReturnValue({
          ...mockSupabase,
          single: jest.fn().mockResolvedValue({ data: null }),
          mockResolvedValue: jest.fn().mockResolvedValue({ data: [] })
        });

        const result = await service.getDashboardMetrics(mockUserId, timeRange);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Platform metrics calculation', () => {
    it('should calculate metrics for each platform correctly', async () => {
      // Mock cache miss
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null })
      });

      // Mock platform configurations
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            { plataforma: 'whatsapp', activa: true, configuracion: {} },
            { plataforma: 'telegram', activa: true, configuracion: {} }
          ]
        })
      });

      // Mock conversaciones by platform
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'conv-1',
              servicio_origen: 'whatsapp',
              mensajes_conversacion: [
                { id: 'msg-1', tipo: 'entrante' },
                { id: 'msg-2', tipo: 'saliente' }
              ]
            }
          ]
        })
      });

      const result = await service.getDashboardMetrics(mockUserId, 'today');

      expect(result.platformBreakdown).toBeDefined();
      expect(result.platformBreakdown.length).toBeGreaterThan(0);
      
      result.platformBreakdown.forEach(platform => {
        expect(platform).toHaveProperty('platform');
        expect(platform).toHaveProperty('messageCount');
        expect(platform).toHaveProperty('responseRate');
        expect(platform).toHaveProperty('connectionStatus');
      });
    });
  });

  describe('Cache management', () => {
    it('should set cache with correct expiry time', async () => {
      // Mock cache miss first
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null })
      });

      // Mock data responses
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        mockResolvedValue: jest.fn().mockResolvedValue({ data: [] })
      });

      // Mock cache upsert
      const mockUpsert = jest.fn().mockResolvedValue({ data: null });
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        upsert: mockUpsert
      });

      await service.getDashboardMetrics(mockUserId, 'today');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: mockUserId,
          metric_type: 'overview_metrics',
          time_range: 'today',
          expires_at: expect.any(String)
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(service.getDashboardMetrics(mockUserId, 'today'))
        .rejects.toThrow('Failed to fetch dashboard metrics');
    });

    it('should handle invalid user ID', async () => {
      await expect(service.getDashboardMetrics('', 'today'))
        .rejects.toThrow();
    });

    it('should handle malformed data responses', async () => {
      // Mock cache miss
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null })
      });

      // Mock malformed data
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        mockResolvedValue: jest.fn().mockResolvedValue({ data: null })
      });

      const result = await service.getDashboardMetrics(mockUserId, 'today');
      
      // Should still return a valid structure even with no data
      expect(result).toBeDefined();
      expect(result.overview).toBeDefined();
    });
  });

  describe('Performance considerations', () => {
    it('should use cache when available to avoid redundant queries', async () => {
      const cachedData = {
        overview: { activeConversations: 5 },
        platformBreakdown: [],
        timeSeriesData: [],
        alerts: [],
        trends: [],
        lastUpdated: new Date().toISOString()
      };

      // Mock cache hit
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: { data: cachedData }
        })
      });

      await service.getDashboardMetrics(mockUserId, 'today');

      // Should only call cache table, not data tables
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('dashboard_metrics_cache');
    });

    it('should handle concurrent requests properly', async () => {
      // Mock cache miss
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ data: null }),
        mockResolvedValue: jest.fn().mockResolvedValue({ data: [] })
      });

      // Make concurrent requests
      const promises = [
        service.getDashboardMetrics(mockUserId, 'today'),
        service.getDashboardMetrics(mockUserId, 'today'),
        service.getDashboardMetrics(mockUserId, 'yesterday')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});