import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TasksService } from '@/services/TasksService';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const usuarioId = session?.user?.id || (await getUsuarioIdFromSession());
    if (!usuarioId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const leadId = params.id;
    if (!leadId) {
      return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead } = await supabase
      .from('leads')
      .select('id, nombre, asignado_a')
      .eq('id', leadId)
      .maybeSingle();

    if (!lead || lead.asignado_a !== usuarioId) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      due_date,
      priority,
      conversation_id,
    } = body;

    if (!due_date) {
      return NextResponse.json({ error: 'due_date es requerido' }, { status: 400 });
    }

    const dueDate = new Date(due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const tasksService = new TasksService(session?.supabaseToken);
    const task = await tasksService.createTask(usuarioId, {
      usuario_id: usuarioId,
      lead_id: leadId,
      conversation_id: conversation_id || null,
      task_type: 'follow_up',
      title: (title || `Seguimiento ${lead.nombre || 'lead'}`).trim(),
      due_date: dueDate.toISOString(),
      priority: priority === 'high' ? 'high' : 'medium',
      metadata: { source: 'kanban_recordatorio' },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
