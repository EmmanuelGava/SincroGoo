// Dashboard Metrics API Tests - Tests unitarios para el endpoint de métricas
// Fecha: 2025-01-16

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET, POST } from '../route';
import { DashboardMetricsService } from '@/services/DashboardMetricsService';

// Mock de next-auth
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock del servicio
jest.mock('@/services/DashboardMetricsService');
const MockDashboardMetricsService = DashboardMetricsService as jest.MockedClass<typeof DashboardMetricsService>;

// Mock data
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  supabaseToken: 'test-supabase-token'
};

const mockMetricsResponse = {
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
  lastUpdated: '2025-01-16T10:30:00Z'
};

describe('/api/dashboard/metrics', () => {
  let mockServiceInstance: jest.Mocked<DashboardMetricsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServiceInstance = {
      getDashboardMetrics: jest.fn(),
      cleanExpiredCache: jest.fn()
    } as any;

    MockDashboardMetricsService.mockImplementation(() => mockServiceInstance);
  });

  describe('GET', () => {
    it('should return metrics for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics?timeRange=today');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual(mockMetricsResponse);
      
      expect(mockServiceInstance.getDashboardMetrics).toHaveBeenCalledWith(
        'test-user-id',
        'today',
        undefined,
        false
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle timeRange parameter correctly', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics?timeRange=last_7_days');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockServiceInstance.getDashboardMetrics).toHaveBeenCalledWith(
        'test-user-id',
        'last_7_days',
        undefined,
        false
      );
    });

    it('should validate timeRange parameter', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics?timeRange=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid time range');
    });

    it('should handle platforms parameter correctly', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const platforms = ['whatsapp', 'telegram'];
      const request = new NextRequest(
        `http://localhost:3000/api/dashboard/metrics?platforms=${encodeURIComponent(JSON.stringify(platforms))}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockServiceInstance.getDashboardMetrics).toHaveBeenCalledWith(
        'test-user-id',
        'today',
        platforms,
        false
      );
    });

    it('should validate platforms parameter', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const invalidPlatforms = ['whatsapp', 'invalid'];
      const request = new NextRequest(
        `http://localhost:3000/api/dashboard/metrics?platforms=${encodeURIComponent(JSON.stringify(invalidPlatforms))}`
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid platforms');
    });

    it('should handle malformed platforms parameter', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?platforms=invalid-json'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid platforms format');
    });

    it('should handle includeComparison parameter', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?includeComparison=true'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockServiceInstance.getDashboardMetrics).toHaveBeenCalledWith(
        'test-user-id',
        'today',
        undefined,
        true
      );
    });

    it('should handle custom time range', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?timeRange=custom&customStart=2025-01-01&customEnd=2025-01-15'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should validate custom time range parameters', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?timeRange=custom&customStart=2025-01-01'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Custom range incomplete');
    });

    it('should validate custom date format', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?timeRange=custom&customStart=invalid-date&customEnd=2025-01-15'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid dates');
    });

    it('should validate custom date range logic', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest(
        'http://localhost:3000/api/dashboard/metrics?timeRange=custom&customStart=2025-01-15&customEnd=2025-01-01'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid date range');
    });

    it('should set appropriate cache headers', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=30');
      expect(response.headers.get('X-Last-Updated')).toBe(mockMetricsResponse.lastUpdated);
    });

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle specific service error types', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockRejectedValue(new Error('Failed to fetch dashboard metrics'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(503);
      
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });

    it('should handle unauthorized service errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockRejectedValue(new Error('Unauthorized access'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST', () => {
    it('should invalidate cache successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.cleanExpiredCache.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalidate_cache' })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.deletedEntries).toBe(5);
      expect(mockServiceInstance.cleanExpiredCache).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalidate_cache' })
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate action parameter', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid action');
    });

    it('should handle service errors in POST', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.cleanExpiredCache.mockRejectedValue(new Error('Cache cleanup failed'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalidate_cache' })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON in request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: 'invalid-json'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle session without user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle empty request body in POST', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle service instantiation with token', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockServiceInstance.getDashboardMetrics.mockResolvedValue(mockMetricsResponse);

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics');
      await GET(request);

      expect(MockDashboardMetricsService).toHaveBeenCalledWith('test-supabase-token');
    });
  });
});