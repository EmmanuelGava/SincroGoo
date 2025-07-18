// Dashboard Tasks Actions API - Endpoints para acciones específicas de tareas
// Fecha: 2025-01-16

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TasksService } from '@/services/TasksService';

// =====================================================
// POST /api/dashboard/tasks/actions
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
    const { action, taskId, ...params } = body;

    // Validar acción
    const validActions = ['complete', 'snooze', 'reactivate_snoozed', 'create_auto_tasks'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action', message: `Acción no válida. Acciones válidas: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    switch (action) {
      case 'complete':
        return await handleCompleteTask(tasksService, taskId, session.user.id);
      
      case 'snooze':
        return await handleSnoozeTask(tasksService, taskId, session.user.id, params.snoozeMinutes);
      
      case 'reactivate_snoozed':
        return await handleReactivateSnoozedTasks(tasksService, session.user.id);
      
      case 'create_auto_tasks':
        return await handleCreateAutoTasks(tasksService, session.user.id);
      
      default:
        return NextResponse.json(
          { error: 'Action not implemented', message: 'Acción no implementada' },
          { status: 501 }
        );
    }

  } catch (error) {
    console.error('Error in tasks actions API:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// Handlers para cada acción
// =====================================================

async function handleCompleteTask(
  tasksService: TasksService, 
  taskId: string, 
  usuarioId: string
): Promise<NextResponse> {
  // Validar ID de tarea
  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json(
      { error: 'Invalid task ID', message: 'ID de tarea requerido' },
      { status: 400 }
    );
  }

  try {
    const completedTask = await tasksService.completeTask(taskId, usuarioId);
    
    return NextResponse.json({
      success: true,
      message: 'Tarea completada exitosamente',
      task: completedTask,
      action: 'complete'
    });

  } catch (error) {
    console.error('Error completing task:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Task not found', message: 'Tarea no encontrada o sin permisos' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Complete failed', message: 'No se pudo completar la tarea' },
      { status: 500 }
    );
  }
}

async function handleSnoozeTask(
  tasksService: TasksService, 
  taskId: string, 
  usuarioId: string, 
  snoozeMinutes: number
): Promise<NextResponse> {
  // Validar parámetros
  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json(
      { error: 'Invalid task ID', message: 'ID de tarea requerido' },
      { status: 400 }
    );
  }

  if (!snoozeMinutes || typeof snoozeMinutes !== 'number' || snoozeMinutes <= 0) {
    return NextResponse.json(
      { error: 'Invalid snooze time', message: 'Tiempo de posposición debe ser mayor a 0 minutos' },
      { status: 400 }
    );
  }

  // Validar límites razonables (máximo 7 días)
  if (snoozeMinutes > 7 * 24 * 60) {
    return NextResponse.json(
      { error: 'Snooze time too long', message: 'Tiempo de posposición máximo: 7 días' },
      { status: 400 }
    );
  }

  try {
    const snoozedTask = await tasksService.snoozeTask(taskId, usuarioId, snoozeMinutes);
    
    const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      message: `Tarea pospuesta hasta ${snoozeUntil.toLocaleString('es-ES')}`,
      task: snoozedTask,
      snoozeUntil: snoozeUntil.toISOString(),
      action: 'snooze'
    });

  } catch (error) {
    console.error('Error snoozing task:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Task not found', message: 'Tarea no encontrada o sin permisos' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Snooze failed', message: 'No se pudo posponer la tarea' },
      { status: 500 }
    );
  }
}

async function handleReactivateSnoozedTasks(
  tasksService: TasksService, 
  usuarioId: string
): Promise<NextResponse> {
  try {
    const reactivatedCount = await tasksService.reactivateSnoozedTasks(usuarioId);
    
    return NextResponse.json({
      success: true,
      message: `${reactivatedCount} tareas reactivadas`,
      reactivatedCount,
      action: 'reactivate_snoozed'
    });

  } catch (error) {
    console.error('Error reactivating snoozed tasks:', error);
    
    return NextResponse.json(
      { error: 'Reactivation failed', message: 'No se pudieron reactivar las tareas' },
      { status: 500 }
    );
  }
}

async function handleCreateAutoTasks(
  tasksService: TasksService, 
  usuarioId: string
): Promise<NextResponse> {
  try {
    const createdCount = await tasksService.createAutoTasksForUnrespondedLeads(usuarioId);
    
    return NextResponse.json({
      success: true,
      message: createdCount > 0 ? 
        `${createdCount} tareas automáticas creadas` : 
        'No se encontraron leads que requieran tareas automáticas',
      createdCount,
      action: 'create_auto_tasks'
    });

  } catch (error) {
    console.error('Error creating auto tasks:', error);
    
    return NextResponse.json(
      { error: 'Auto task creation failed', message: 'No se pudieron crear tareas automáticas' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET /api/dashboard/tasks/actions (obtener estadísticas de acciones)
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    switch (action) {
      case 'snoozed_count':
        return await getSnoozedTasksCount(tasksService, session.user.id);
      
      case 'auto_tasks_candidates':
        return await getAutoTasksCandidates(tasksService, session.user.id);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action', message: 'Acción no válida para GET' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in tasks actions GET:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// Handlers para GET
// =====================================================

async function getSnoozedTasksCount(
  tasksService: TasksService, 
  usuarioId: string
): Promise<NextResponse> {
  try {
    // Obtener tareas pospuestas que ya deberían estar activas
    const now = new Date().toISOString();
    
    const result = await tasksService.getTasks(usuarioId, {
      status: ['snoozed'],
      limit: 1000 // Obtener todas para contar
    });

    const readyToReactivate = result.tasks.filter(task => 
      task.snoozed_until && task.snoozed_until <= now
    );

    return NextResponse.json({
      totalSnoozed: result.tasks.length,
      readyToReactivate: readyToReactivate.length,
      snoozedTasks: result.tasks.map(task => ({
        id: task.id,
        title: task.title,
        snoozed_until: task.snoozed_until,
        ready: task.snoozed_until ? task.snoozed_until <= now : false
      }))
    });

  } catch (error) {
    console.error('Error getting snoozed tasks count:', error);
    
    return NextResponse.json(
      { error: 'Failed to get snoozed tasks', message: 'No se pudieron obtener las tareas pospuestas' },
      { status: 500 }
    );
  }
}

async function getAutoTasksCandidates(
  tasksService: TasksService, 
  usuarioId: string
): Promise<NextResponse> {
  try {
    // Esta función simula la lógica para encontrar candidatos para tareas automáticas
    // En una implementación real, consultaría la base de datos directamente
    
    return NextResponse.json({
      message: 'Función de candidatos para tareas automáticas',
      note: 'Esta función requiere implementación específica basada en reglas de negocio',
      candidates: 0
    });

  } catch (error) {
    console.error('Error getting auto tasks candidates:', error);
    
    return NextResponse.json(
      { error: 'Failed to get candidates', message: 'No se pudieron obtener los candidatos' },
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