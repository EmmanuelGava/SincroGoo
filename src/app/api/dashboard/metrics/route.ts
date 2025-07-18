// Dashboard Metrics API - Endpoint para métricas del dashboard
// Fecha: 2025-01-16

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardMetricsService } from '@/services/DashboardMetricsService';
import { TimeRange, Platform } from '@/types/dashboard';

// =====================================================
// GET /api/dashboard/metrics
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sesión requerida' }, 
        { status: 401 }
      );
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'today';
    const platformsParam = searchParams.get('platforms');
    const includeComparison = searchParams.get('includeComparison') === 'true';
    
    // Validar timeRange
    const validTimeRanges: TimeRange[] = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid time range', message: 'Rango de tiempo no válido' },
        { status: 400 }
      );
    }

    // Parsear plataformas si se proporcionan
    let platforms: Platform[] | undefined;
    if (platformsParam) {
      try {
        platforms = JSON.parse(platformsParam) as Platform[];
        const validPlatforms: Platform[] = ['whatsapp', 'telegram', 'email'];
        const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
        
        if (invalidPlatforms.length > 0) {
          return NextResponse.json(
            { error: 'Invalid platforms', message: `Plataformas no válidas: ${invalidPlatforms.join(', ')}` },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid platforms format', message: 'Formato de plataformas no válido' },
          { status: 400 }
        );
      }
    }

    // Manejar rango personalizado
    if (timeRange === 'custom') {
      const customStart = searchParams.get('customStart');
      const customEnd = searchParams.get('customEnd');
      
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Custom range incomplete', message: 'Rango personalizado requiere customStart y customEnd' },
          { status: 400 }
        );
      }

      // Validar fechas
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid dates', message: 'Fechas no válidas' },
          { status: 400 }
        );
      }

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Invalid date range', message: 'La fecha de inicio debe ser anterior a la fecha de fin' },
          { status: 400 }
        );
      }
    }

    // Crear instancia del servicio con token de Supabase
    const metricsService = new DashboardMetricsService(session.supabaseToken);

    // Obtener métricas
    const metrics = await metricsService.getDashboardMetrics(
      session.user.id,
      timeRange,
      platforms,
      includeComparison
    );

    // Agregar headers de cache
    const response = NextResponse.json(metrics);
    response.headers.set('Cache-Control', 'private, max-age=30'); // Cache por 30 segundos
    response.headers.set('X-Last-Updated', metrics.lastUpdated);

    return response;

  } catch (error) {
    console.error('Error in dashboard metrics API:', error);
    
    // Determinar tipo de error y respuesta apropiada
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { error: 'Database error', message: 'Error al obtener datos de la base de datos' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No autorizado para acceder a estos datos' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/dashboard/metrics (para invalidar cache)
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sesión requerida' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'invalidate_cache') {
      const metricsService = new DashboardMetricsService(session.supabaseToken);
      const deletedCount = await metricsService.cleanExpiredCache();
      
      return NextResponse.json({
        success: true,
        message: 'Cache invalidado exitosamente',
        deletedEntries: deletedCount
      });
    }

    return NextResponse.json(
      { error: 'Invalid action', message: 'Acción no válida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in dashboard metrics POST:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// OPTIONS para CORS
// =====================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}