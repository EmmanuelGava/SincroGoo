// Dashboard Metrics Hook Tests - Tests unitarios para el hook de métricas
// Fecha: 2025-01-16

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useDashboardMetrics, useDashboardCache, useDashboard } from '../useDashboardMetrics';
import { TimeRange, Platform } from '@/types/dashboard';

// Mock de next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock de fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock data
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
  platformBreakdown: [
    {
      platform: 'whatsapp' as Platform,
      messageCount: 25,
      responseRate: 95,
      averageResponseTime: 90,
      connectionStatus: 'connected' as const,
      activeConversations: 3,
      pendingResponses: 1,
      conversionRate: 15
    }
  ],
  timeSeriesData: [
    { timestamp: '2025-01-16T10:00:00Z', value: 5, label: '10:00' }
  ],
  alerts: [],
  trends: [],
  lastUpdated: '2025-01-16T10:30:00Z'
};

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  supabaseToken: 'test-token'
};

describe('useDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    } as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should fetch metrics on mount when enabled', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsResponse
    } as Response);

    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0 // Disable auto-refresh for test
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockMetricsResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBe(mockMetricsResponse.lastUpdated);
  });

  it('should not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: false
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('should not fetch when user is not authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    } as any);

    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should handle HTTP errors correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Server error' })
    } as Response);

    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Server error');
  });

  it('should refetch data when refetch is called', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockMetricsResponse,
          overview: { ...mockMetricsResponse.overview, activeConversations: 10 }
        })
      } as Response);

    const { result } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.overview.activeConversations).toBe(5);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data?.overview.activeConversations).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should update when timeRange changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMetricsResponse
    } as Response);

    const { result, rerender } = renderHook(
      ({ timeRange }) =>
        useDashboardMetrics({
          timeRange,
          enabled: true,
          refreshInterval: 0
        }),
      {
        initialProps: { timeRange: 'today' as TimeRange }
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender({ timeRange: 'yesterday' as TimeRange });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('timeRange=yesterday'),
      expect.any(Object)
    );
  });

  it('should include platforms in request when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsResponse
    } as Response);

    const platforms: Platform[] = ['whatsapp', 'telegram'];

    renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        platforms,
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const fetchCall = mockFetch.mock.calls[0];
    const url = fetchCall[0] as string;
    expect(url).toContain('platforms=' + encodeURIComponent(JSON.stringify(platforms)));
  });

  it('should setup and cleanup intervals correctly', async () => {
    jest.useFakeTimers();
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMetricsResponse
    } as Response);

    const { unmount } = renderHook(() =>
      useDashboardMetrics({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 5000 // 5 seconds
      })
    );

    // Initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Fast forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Unmount should cleanup interval
    unmount();

    // Fast forward another 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should not have made another call
    expect(mockFetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should abort previous requests when new ones are made', async () => {
    const abortSpy = jest.fn();
    const mockAbortController = {
      abort: abortSpy,
      signal: { aborted: false }
    };

    global.AbortController = jest.fn(() => mockAbortController) as any;

    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockMetricsResponse
      } as Response), 100))
    );

    const { result, rerender } = renderHook(
      ({ timeRange }) =>
        useDashboardMetrics({
          timeRange,
          enabled: true,
          refreshInterval: 0
        }),
      {
        initialProps: { timeRange: 'today' as TimeRange }
      }
    );

    // Change timeRange quickly to trigger abort
    rerender({ timeRange: 'yesterday' as TimeRange });

    await waitFor(() => {
      expect(abortSpy).toHaveBeenCalled();
    });
  });
});

describe('useDashboardCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    } as any);
  });

  it('should invalidate cache successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Cache invalidated',
        deletedEntries: 5
      })
    } as Response);

    const { result } = renderHook(() => useDashboardCache());

    let invalidateResult: boolean;
    await act(async () => {
      invalidateResult = await result.current.invalidateCache();
    });

    expect(invalidateResult!).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'invalidate_cache'
      }),
    });
  });

  it('should handle cache invalidation errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    } as Response);

    const { result } = renderHook(() => useDashboardCache());

    let invalidateResult: boolean;
    await act(async () => {
      invalidateResult = await result.current.invalidateCache();
    });

    expect(invalidateResult!).toBe(false);
  });

  it('should not invalidate when user is not authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    } as any);

    const { result } = renderHook(() => useDashboardCache());

    let invalidateResult: boolean;
    await act(async () => {
      invalidateResult = await result.current.invalidateCache();
    });

    expect(invalidateResult!).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('useDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    } as any);
  });

  it('should combine metrics, realtime, and cache functionality', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsResponse
    } as Response);

    const { result } = renderHook(() =>
      useDashboard({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockMetricsResponse);
    expect(result.current.connected).toBe(true); // Simulated realtime connection
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.invalidateCache).toBe('function');
    expect(result.current.realtime).toBeDefined();
  });

  it('should handle disabled state correctly', async () => {
    const { result } = renderHook(() =>
      useDashboard({
        timeRange: 'today',
        enabled: false
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.connected).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should provide realtime connection status', async () => {
    const { result } = renderHook(() =>
      useDashboard({
        timeRange: 'today',
        enabled: true,
        refreshInterval: 0
      })
    );

    await waitFor(() => {
      expect(result.current.realtime.isConnected).toBe(true);
    });

    expect(result.current.realtime.lastUpdate).toBeDefined();
    expect(result.current.realtime.error).toBeNull();
  });
});