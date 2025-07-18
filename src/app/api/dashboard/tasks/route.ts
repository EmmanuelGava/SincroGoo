// Dashboard Tasks API - Endpoint para gestión de tareas
// Fecha: 2025-01-16

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TasksService } from '@/services/TasksService';
import { TaskStatus, TaskType, Priority } from '@/types/dashboard';
import { CrearTask } from '@/types/database';

// =====================================================
// GET /api/dashboard/tasks
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const taskTypeParam = searchParams.get('taskType');
    const dueDateStart = searchParams.get('dueDateStart');
    const dueDateEnd = searchParams.get('dueDateEnd');

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

    // Parsear filtros de estado
    let status: TaskStatus[] | undefined;
    if (statusParam) {
      try {
        status = JSON.parse(statusParam) as TaskStatus[];
        const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'snoozed'];
        const invalidStatuses = status.filter(s => !validStatuses.includes(s));
        
        if (invalidStatuses.length > 0) {
          return NextResponse.json(
            { error: 'Invalid status', message: `Estados no válidos: ${invalidStatuses.join(', ')}` },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid status format', message: 'Formato de estados no válido' },
          { status: 400 }
        );
      }
    }

    // Parsear filtros de prioridad
    let priority: Priority[] | undefined;
    if (priorityParam) {
      try {
        priority = JSON.parse(priorityParam) as Priority[];
        const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
        const invalidPriorities = priority.filter(p => !validPriorities.includes(p));
        
        if (invalidPriorities.length > 0) {
          return NextResponse.json(
            { error: 'Invalid priority', message: `Prioridades no válidas: ${invalidPriorities.join(', ')}` },
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

    // Parsear filtros de tipo de tarea
    let taskType: TaskType[] | undefined;
    if (taskTypeParam) {
      try {
        taskType = JSON.parse(taskTypeParam) as TaskType[];
        const validTaskTypes: TaskType[] = ['follow_up', 'first_response', 'scheduled_contact', 'lead_qualification', 'proposal_followup', 'meeting_reminder', 'custom'];
        const invalidTaskTypes = taskType.filter(t => !validTaskTypes.includes(t));
        
        if (invalidTaskTypes.length > 0) {
          return NextResponse.json(
            { error: 'Invalid task type', message: `Tipos de tarea no válidos: ${invalidTaskTypes.join(', ')}` },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid task type format', message: 'Formato de tipos de tarea no válido' },
          { status: 400 }
        );
      }
    }

    // Validar fechas si se proporcionan
    let dueDateRange: { start?: string; end?: string } | undefined;
    if (dueDateStart || dueDateEnd) {
      dueDateRange = {};
      
      if (dueDateStart) {
        const startDate = new Date(dueDateStart);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid start date', message: 'Fecha de inicio no válida' },
            { status: 400 }
          );
        }
        dueDateRange.start = startDate.toISOString();
      }
      
      if (dueDateEnd) {
        const endDate = new Date(dueDateEnd);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid end date', message: 'Fecha de fin no válida' },
            { status: 400 }
          );
        }
        dueDateRange.end = endDate.toISOString();
      }

      // Validar que la fecha de inicio sea anterior a la de fin
      if (dueDateRange.start && dueDateRange.end && dueDateRange.start >= dueDateRange.end) {
        return NextResponse.json(
          { error: 'Invalid date range', message: 'La fecha de inicio debe ser anterior a la fecha de fin' },
          { status: 400 }
        );
      }
    }

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    // Obtener tareas
    const result = await tasksService.getTasks(session.user.id, {
      limit,
      offset,
      status,
      priority,
      taskType,
      dueDateRange
    });

    // Agregar headers de respuesta
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'private, max-age=30'); // Cache por 30 segundos
    response.headers.set('X-Total-Count', result.totalCount.toString());
    response.headers.set('X-Has-More', result.hasMore.toString());

    return response;

  } catch (error) {
    console.error('Error in tasks API GET:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json(
          { error: 'Database error', message: 'Error al obtener tareas de la base de datos' },
          { status: 503 }
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
// POST /api/dashboard/tasks (crear nueva tarea)
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
    const {
      title,
      description,
      task_type,
      lead_id,
      conversation_id,
      due_date,
      priority,
      is_recurring,
      recurring_pattern,
      metadata
    } = body;

    // Validar campos requeridos
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid title', message: 'El título es requerido' },
        { status: 400 }
      );
    }

    if (!task_type || typeof task_type !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task type', message: 'El tipo de tarea es requerido' },
        { status: 400 }
      );
    }

    // Validar tipo de tarea
    const validTaskTypes: TaskType[] = ['follow_up', 'first_response', 'scheduled_contact', 'lead_qualification', 'proposal_followup', 'meeting_reminder', 'custom'];
    if (!validTaskTypes.includes(task_type as TaskType)) {
      return NextResponse.json(
        { error: 'Invalid task type', message: `Tipo de tarea no válido: ${task_type}` },
        { status: 400 }
      );
    }

    // Validar prioridad si se proporciona
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority', message: `Prioridad no válida: ${priority}` },
        { status: 400 }
      );
    }

    // Validar fecha de vencimiento si se proporciona
    if (due_date) {
      const dueDate = new Date(due_date);
      if (isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date', message: 'Fecha de vencimiento no válida' },
          { status: 400 }
        );
      }
    }

    // Validar patrón de recurrencia si se proporciona
    if (is_recurring && recurring_pattern) {
      if (!recurring_pattern.frequency || !['daily', 'weekly', 'monthly'].includes(recurring_pattern.frequency)) {
        return NextResponse.json(
          { error: 'Invalid recurring pattern', message: 'Frecuencia de recurrencia no válida' },
          { status: 400 }
        );
      }
      
      if (!recurring_pattern.interval || recurring_pattern.interval < 1) {
        return NextResponse.json(
          { error: 'Invalid recurring interval', message: 'Intervalo de recurrencia debe ser mayor a 0' },
          { status: 400 }
        );
      }
    }

    // Preparar datos de la tarea
    const taskData: CrearTask = {
      usuario_id: session.user.id,
      title: title.trim(),
      description: description?.trim(),
      task_type: task_type as TaskType,
      lead_id,
      conversation_id,
      due_date,
      priority: priority || 'medium',
      is_recurring: is_recurring || false,
      recurring_pattern,
      metadata: metadata || {}
    };

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    // Crear tarea
    const newTask = await tasksService.createTask(session.user.id, taskData);

    return NextResponse.json({
      success: true,
      message: 'Tarea creada exitosamente',
      task: newTask
    }, { status: 201 });

  } catch (error) {
    console.error('Error in tasks API POST:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('required')) {
        return NextResponse.json(
          { error: 'Validation error', message: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Failed to create')) {
        return NextResponse.json(
          { error: 'Creation failed', message: 'No se pudo crear la tarea' },
          { status: 500 }
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
// PUT /api/dashboard/tasks (actualizar tarea)
// =====================================================

export async function PUT(request: NextRequest) {
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
    const { taskId, ...updates } = body;

    // Validar ID de tarea
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID', message: 'ID de tarea requerido' },
        { status: 400 }
      );
    }

    // Validar campos si se proporcionan
    if (updates.title !== undefined && (typeof updates.title !== 'string' || updates.title.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Invalid title', message: 'El título no puede estar vacío' },
        { status: 400 }
      );
    }

    if (updates.status && !['pending', 'in_progress', 'completed', 'cancelled', 'snoozed'].includes(updates.status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: `Estado no válido: ${updates.status}` },
        { status: 400 }
      );
    }

    if (updates.priority && !['low', 'medium', 'high', 'urgent'].includes(updates.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority', message: `Prioridad no válida: ${updates.priority}` },
        { status: 400 }
      );
    }

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    // Actualizar tarea
    const updatedTask = await tasksService.updateTask(taskId, session.user.id, updates);

    return NextResponse.json({
      success: true,
      message: 'Tarea actualizada exitosamente',
      task: updatedTask
    });

  } catch (error) {
    console.error('Error in tasks API PUT:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Task not found', message: 'Tarea no encontrada o sin permisos' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Failed to update')) {
        return NextResponse.json(
          { error: 'Update failed', message: 'No se pudo actualizar la tarea' },
          { status: 500 }
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
// DELETE /api/dashboard/tasks (eliminar tarea)
// =====================================================

export async function DELETE(request: NextRequest) {
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
    const taskId = searchParams.get('taskId');

    // Validar ID de tarea
    if (!taskId) {
      return NextResponse.json(
        { error: 'Invalid task ID', message: 'ID de tarea requerido' },
        { status: 400 }
      );
    }

    // Crear instancia del servicio
    const tasksService = new TasksService(session.supabaseToken);

    // Eliminar tarea
    const success = await tasksService.deleteTask(taskId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Delete failed', message: 'No se pudo eliminar la tarea' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tarea eliminada exitosamente',
      taskId
    });

  } catch (error) {
    console.error('Error in tasks API DELETE:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}