// Priority Conversations API - Endpoint para conversaciones prioritarias
// Fecha: 2025-01-16

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PriorityConversationsService } from '@/services/PriorityConversationsService';
import { Platform, Priority } from '@/types/dashboard';

// =====================================================
// GET /api/dashboard/priority-conversations
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const platformsParam = searchParams.get('platforms');
    const priorityParam = searchParams.get('priority');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    // Validar límite
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit', message: 'El límite debe estar entre 1 y 100' },
        { status: 400 }
      );
    }

    // Validar offset
    if (offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset', message: 'El offset debe ser mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Parsear plataformas
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

    // Parsear prioridades
    let priorityFilter: Priority[] | undefined;
    if (priorityParam) {
      try {
        priorityFilter = JSON.parse(priorityParam) as Priority[];
        const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
        const invalidPriorities = priorityFilter.filter(p => !validPriorities.includes(p));
        
        if (invalidPriorities.length > 0) {
          return NextResponse.json(
            { error: 'Invalid priorities', message: `Prioridades no válidas: ${invalidPriorities.join(', ')}` },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid priority format', message: 'Formato de prioridades no válido' },
          { status: 400 }
        );
      }
    }

    // Crear instancia del servicio
    const conversationsService = new PriorityConversationsService(session.supabaseToken);

    // Obtener conversaciones prioritarias
    const result = await conversationsService.getPriorityConversations(
      session.user.id,
      {
        limit,
        offset,
        platforms,
        priorityFilter,
        includeCompleted
      }
    );

    // Agregar headers de cache
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'private, max-age=60'); // Cache por 1 minuto
    response.headers.set('X-Total-Count', result.totalCount.toString());
    response.headers.set('X-Has-More', result.hasMore.toString());

    return response;

  } catch (error) {
    console.error('Error in priority conversations API:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { error: 'Database error', message: 'Error al obtener conversaciones de la base de datos' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No autorizado para acceder a estas conversaciones' },
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
// POST /api/dashboard/priority-conversations (marcar como importante)
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
    const { action, conversationId, important } = body;

    // Validar acción
    if (action !== 'mark_important') {
      return NextResponse.json(
        { error: 'Invalid action', message: 'Acción no válida' },
        { status: 400 }
      );
    }

    // Validar parámetros
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid conversation ID', message: 'ID de conversación requerido' },
        { status: 400 }
      );
    }

    if (typeof important !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid important flag', message: 'El flag important debe ser boolean' },
        { status: 400 }
      );
    }

    // Crear instancia del servicio
    const conversationsService = new PriorityConversationsService(session.supabaseToken);

    // Marcar conversación como importante
    const success = await conversationsService.markConversationImportant(
      conversationId,
      session.user.id,
      important
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Update failed', message: 'No se pudo actualizar la conversación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: important ? 'Conversación marcada como importante' : 'Conversación desmarcada como importante',
      conversationId,
      important
    });

  } catch (error) {
    console.error('Error in priority conversations POST:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET /api/dashboard/priority-conversations/stats
// =====================================================

export async function GET_STATS(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sesión requerida' }, 
        { status: 401 }
      );
    }

    // Crear instancia del servicio
    const conversationsService = new PriorityConversationsService(session.supabaseToken);

    // Obtener estadísticas
    const stats = await conversationsService.getPriorityStats(session.user.id);

    // Agregar headers de cache
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'private, max-age=300'); // Cache por 5 minutos

    return response;

  } catch (error) {
    console.error('Error in priority conversations stats:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET /api/dashboard/priority-conversations/follow-up
// =====================================================

export async function GET_FOLLOWUP(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sesión requerida' }, 
        { status: 401 }
      );
    }

    // Crear instancia del servicio
    const conversationsService = new PriorityConversationsService(session.supabaseToken);

    // Obtener conversaciones que requieren seguimiento
    const followUpConversations = await conversationsService.getFollowUpConversations(session.user.id);

    const response = NextResponse.json({
      conversations: followUpConversations,
      count: followUpConversations.length,
      message: followUpConversations.length > 0 ? 
        `${followUpConversations.length} conversaciones requieren seguimiento` :
        'No hay conversaciones pendientes de seguimiento'
    });

    response.headers.set('Cache-Control', 'private, max-age=180'); // Cache por 3 minutos

    return response;

  } catch (error) {
    console.error('Error in follow-up conversations:', error);
    
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