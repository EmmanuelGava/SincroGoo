// Tasks Service - Servicio para gestión de tareas y seguimientos
// Fecha: 2025-01-16

import { createClient } from '@supabase/supabase-js';
import { 
  Task, 
  TaskStatus, 
  TaskType, 
  Priority,
  TasksRequest,
  TasksResponse,
  RecurringPattern
} from '@/types/dashboard';
import { 
  CrearTask,
  ActualizarTask,
  Lead
} from '@/types/database';

export class TasksService {
  private supabase;

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
  // Obtener tareas del usuario
  // =====================================================

  async getTasks(usuarioId: string, request: TasksRequest = {}): Promise<TasksResponse> {
    try {
      const {
        status,
        priority,
        taskType,
        dueDateRange,
        limit = 50,
        offset = 0
      } = request;

      // Construir consulta base
      let query = this.supabase
        .from('tasks')
        .select(`
          *,
          leads(
            id,
            nombre,
            email,
            empresa,
            valor_potencial
          ),
          conversaciones(
            id,
            servicio_origen
          )
        `)
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (priority && priority.length > 0) {
        query = query.in('priority', priority);
      }

      if (taskType && taskType.length > 0) {
        query = query.in('task_type', taskType);
      }

      if (dueDateRange) {
        if (dueDateRange.start) {
          query = query.gte('due_date', dueDateRange.start);
        }
        if (dueDateRange.end) {
          query = query.lte('due_date', dueDateRange.end);
        }
      }

      // Ejecutar consulta con paginación
      const { data: tasksData, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Error fetching tasks: ${error.message}`);
      }

      // Procesar tareas
      const tasks = (tasksData || []).map(task => this.processTask(task));

      // Obtener tareas vencidas
      const overdueTasks = await this.getOverdueTasks(usuarioId);

      // Obtener tareas próximas (próximas 24 horas)
      const upcomingTasks = await this.getUpcomingTasks(usuarioId);

      // Obtener count total
      const totalCount = await this.getTotalTasksCount(usuarioId, request);

      // Calcular resumen
      const summary = await this.getTasksSummary(usuarioId);

      return {
        tasks,
        overdueTasks,
        upcomingTasks,
        totalCount,
        hasMore: offset + limit < totalCount,
        summary
      };

    } catch (error) {
      console.error('Error in getTasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  // =====================================================
  // Crear nueva tarea
  // =====================================================

  async createTask(usuarioId: string, taskData: CrearTask): Promise<Task> {
    try {
      // Validar datos requeridos
      if (!taskData.title || !taskData.task_type) {
        throw new Error('Title and task_type are required');
      }

      // Preparar datos para inserción
      const insertData = {
        ...taskData,
        usuario_id: usuarioId,
        status: 'pending' as TaskStatus,
        priority: taskData.priority || 'medium' as Priority,
        auto_generated: taskData.auto_generated || false,
        metadata: taskData.metadata || {}
      };

      // Insertar tarea
      const { data, error } = await this.supabase
        .from('tasks')
        .insert(insertData)
        .select(`
          *,
          leads(
            id,
            nombre,
            email,
            empresa,
            valor_potencial
          ),
          conversaciones(
            id,
            servicio_origen
          )
        `)
        .single();

      if (error) {
        throw new Error(`Error creating task: ${error.message}`);
      }

      // Si es recurrente, programar próxima instancia
      if (data.is_recurring && data.recurring_pattern) {
        await this.scheduleNextRecurringTask(data);
      }

      return this.processTask(data);

    } catch (error) {
      console.error('Error in createTask:', error);
      throw new Error('Failed to create task');
    }
  }

  // =====================================================
  // Actualizar tarea
  // =====================================================

  async updateTask(taskId: string, usuarioId: string, updates: ActualizarTask): Promise<Task> {
    try {
      // Actualizar tarea
      const { data, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('usuario_id', usuarioId)
        .select(`
          *,
          leads(
            id,
            nombre,
            email,
            empresa,
            valor_potencial
          ),
          conversaciones(
            id,
            servicio_origen
          )
        `)
        .single();

      if (error) {
        throw new Error(`Error updating task: ${error.message}`);
      }

      if (!data) {
        throw new Error('Task not found or access denied');
      }

      return this.processTask(data);

    } catch (error) {
      console.error('Error in updateTask:', error);
      throw new Error('Failed to update task');
    }
  }

  // =====================================================
  // Completar tarea
  // =====================================================

  async completeTask(taskId: string, usuarioId: string): Promise<Task> {
    try {
      const updates: ActualizarTask = {
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      const completedTask = await this.updateTask(taskId, usuarioId, updates);

      // Si es recurrente, crear próxima instancia
      if (completedTask.is_recurring && completedTask.recurring_pattern) {
        await this.createNextRecurringTask(completedTask);
      }

      return completedTask;

    } catch (error) {
      console.error('Error in completeTask:', error);
      throw new Error('Failed to complete task');
    }
  }

  // =====================================================
  // Posponer tarea
  // =====================================================

  async snoozeTask(taskId: string, usuarioId: string, snoozeMinutes: number): Promise<Task> {
    try {
      const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);

      const updates: ActualizarTask = {
        status: 'snoozed',
        snoozed_until: snoozeUntil.toISOString()
      };

      return await this.updateTask(taskId, usuarioId, updates);

    } catch (error) {
      console.error('Error in snoozeTask:', error);
      throw new Error('Failed to snooze task');
    }
  }

  // =====================================================
  // Eliminar tarea
  // =====================================================

  async deleteTask(taskId: string, usuarioId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('usuario_id', usuarioId);

      if (error) {
        throw new Error(`Error deleting task: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Error in deleteTask:', error);
      return false;
    }
  }

  // =====================================================
  // Crear tareas automáticas para leads sin primera respuesta
  // =====================================================

  async createAutoTasksForUnrespondedLeads(usuarioId: string): Promise<number> {
    try {
      // Buscar leads con conversaciones sin respuesta en las últimas 24 horas
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: unrespondedConversations } = await this.supabase
        .from('conversaciones')
        .select(`
          id,
          lead_id,
          fecha_mensaje,
          leads!inner(
            id,
            nombre,
            valor_potencial
          ),
          mensajes_conversacion!inner(
            tipo,
            fecha_mensaje
          )
        `)
        .eq('usuario_id', usuarioId)
        .eq('mensajes_conversacion.tipo', 'entrante')
        .lt('mensajes_conversacion.fecha_mensaje', oneDayAgo);

      if (!unrespondedConversations || unrespondedConversations.length === 0) {
        return 0;
      }

      let createdTasks = 0;

      for (const conversation of unrespondedConversations) {
        // Verificar si ya existe una tarea para esta conversación
        const { data: existingTask } = await this.supabase
          .from('tasks')
          .select('id')
          .eq('usuario_id', usuarioId)
          .eq('conversation_id', conversation.id)
          .eq('task_type', 'first_response')
          .eq('status', 'pending')
          .single();

        if (!existingTask) {
          // Crear tarea automática
          const taskData: CrearTask = {
            usuario_id: usuarioId,
            lead_id: conversation.lead_id,
            conversation_id: conversation.id,
            task_type: 'first_response',
            title: `Primera respuesta a ${conversation.leads[0]?.nombre || 'Lead'}`,
            description: `Responder al mensaje de ${conversation.leads[0]?.nombre || 'Lead'} recibido hace más de 24 horas`,
            priority: (conversation.leads[0]?.valor_potencial || 0) > 5000 ? 'high' : 'medium',
            due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
            auto_generated: true,
            metadata: {
              lead_name: conversation.leads[0]?.nombre || 'Lead',
              lead_value: conversation.leads[0]?.valor_potencial || 0,
              conversation_date: conversation.fecha_mensaje
            }
          };

          await this.createTask(usuarioId, taskData);
          createdTasks++;
        }
      }

      return createdTasks;

    } catch (error) {
      console.error('Error creating auto tasks:', error);
      return 0;
    }
  }

  // =====================================================
  // Métodos privados auxiliares
  // =====================================================

  private processTask(taskData: any): Task {
    return {
      id: taskData.id,
      usuario_id: taskData.usuario_id,
      lead_id: taskData.lead_id,
      conversation_id: taskData.conversation_id,
      task_type: taskData.task_type,
      title: taskData.title,
      description: taskData.description,
      due_date: taskData.due_date,
      priority: taskData.priority,
      status: taskData.status,
      is_recurring: taskData.is_recurring,
      recurring_pattern: taskData.recurring_pattern,
      completed_at: taskData.completed_at,
      snoozed_until: taskData.snoozed_until,
      auto_generated: taskData.auto_generated,
      metadata: {
        ...taskData.metadata,
        lead_name: taskData.leads?.nombre,
        lead_email: taskData.leads?.email,
        lead_company: taskData.leads?.empresa,
        lead_value: taskData.leads?.valor_potencial,
        conversation_platform: taskData.conversaciones?.servicio_origen
      },
      created_at: taskData.created_at,
      updated_at: taskData.updated_at
    };
  }

  private async getOverdueTasks(usuarioId: string): Promise<Task[]> {
    const now = new Date().toISOString();

    const { data } = await this.supabase
      .from('tasks')
      .select(`
        *,
        leads(id, nombre, email, empresa, valor_potencial),
        conversaciones(id, servicio_origen)
      `)
      .eq('usuario_id', usuarioId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', now)
      .order('due_date', { ascending: true });

    return (data || []).map(task => this.processTask(task));
  }

  private async getUpcomingTasks(usuarioId: string): Promise<Task[]> {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data } = await this.supabase
      .from('tasks')
      .select(`
        *,
        leads(id, nombre, email, empresa, valor_potencial),
        conversaciones(id, servicio_origen)
      `)
      .eq('usuario_id', usuarioId)
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', now.toISOString())
      .lte('due_date', next24Hours.toISOString())
      .order('due_date', { ascending: true });

    return (data || []).map(task => this.processTask(task));
  }

  private async getTotalTasksCount(usuarioId: string, request: TasksRequest): Promise<number> {
    let query = this.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId);

    // Aplicar los mismos filtros que en getTasks
    if (request.status && request.status.length > 0) {
      query = query.in('status', request.status);
    }

    if (request.priority && request.priority.length > 0) {
      query = query.in('priority', request.priority);
    }

    if (request.taskType && request.taskType.length > 0) {
      query = query.in('task_type', request.taskType);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting total tasks count:', error);
      return 0;
    }

    return count || 0;
  }

  private async getTasksSummary(usuarioId: string): Promise<{
    pending: number;
    overdue: number;
    completed_today: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingResult, overdueResult, completedTodayResult] = await Promise.all([
      // Tareas pendientes
      this.supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('status', 'pending'),

      // Tareas vencidas
      this.supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', now.toISOString()),

      // Tareas completadas hoy
      this.supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString())
    ]);

    return {
      pending: pendingResult.count || 0,
      overdue: overdueResult.count || 0,
      completed_today: completedTodayResult.count || 0
    };
  }

  private async scheduleNextRecurringTask(task: any): Promise<void> {
    // Implementar lógica para programar próxima tarea recurrente
    // Esta es una implementación simplificada
    console.log('Scheduling next recurring task for:', task.id);
  }

  private async createNextRecurringTask(completedTask: Task): Promise<void> {
    if (!completedTask.recurring_pattern) return;

    try {
      const pattern = completedTask.recurring_pattern;
      const nextDueDate = this.calculateNextDueDate(completedTask.due_date || '', pattern);

      const nextTaskData: CrearTask = {
        usuario_id: completedTask.usuario_id,
        lead_id: completedTask.lead_id,
        conversation_id: completedTask.conversation_id,
        task_type: completedTask.task_type,
        title: completedTask.title,
        description: completedTask.description,
        due_date: nextDueDate,
        priority: completedTask.priority,
        is_recurring: true,
        recurring_pattern: pattern,
        auto_generated: true,
        metadata: {
          ...completedTask.metadata,
          previous_task_id: completedTask.id,
          recurring_sequence: (completedTask.metadata.recurring_sequence || 0) + 1
        }
      };

      await this.createTask(completedTask.usuario_id, nextTaskData);

    } catch (error) {
      console.error('Error creating next recurring task:', error);
    }
  }

  private calculateNextDueDate(currentDueDate: string, pattern: RecurringPattern): string {
    const current = new Date(currentDueDate);
    const next = new Date(current);

    switch (pattern.frequency) {
      case 'daily':
        next.setDate(current.getDate() + pattern.interval);
        break;
      case 'weekly':
        next.setDate(current.getDate() + (pattern.interval * 7));
        break;
      case 'monthly':
        next.setMonth(current.getMonth() + pattern.interval);
        break;
    }

    return next.toISOString();
  }

  // =====================================================
  // Reactivar tareas pospuestas
  // =====================================================

  async reactivateSnoozedTasks(usuarioId: string): Promise<number> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('tasks')
        .update({ 
          status: 'pending',
          snoozed_until: null
        })
        .eq('usuario_id', usuarioId)
        .eq('status', 'snoozed')
        .lt('snoozed_until', now)
        .select('id');

      if (error) {
        throw new Error(`Error reactivating snoozed tasks: ${error.message}`);
      }

      return data?.length || 0;

    } catch (error) {
      console.error('Error reactivating snoozed tasks:', error);
      return 0;
    }
  }
}