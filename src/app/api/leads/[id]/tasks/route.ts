import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

const ESTADOS_TAREA = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
type EstadoTarea = (typeof ESTADOS_TAREA)[number];

async function leadDeLaOrganizacion(leadId: string, organizacionId: string) {
  const { data } = await getSupabaseAdmin()
    .from('leads')
    .select('id, nombre, asignado_a')
    .eq('id', leadId)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  return data;
}

/** POST /api/leads/[id]/tasks — recordatorio ligado al lead, visible para toda la organización. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const lead = await leadDeLaOrganizacion(params.id, ctx.organizacionId);
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

    const { title, due_date, priority, conversation_id } = await request.json();
    if (!due_date) return NextResponse.json({ error: 'due_date es requerido' }, { status: 400 });

    const dueDate = new Date(due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const { data: task, error } = await getSupabaseAdmin()
      .from('tasks')
      .insert({
        usuario_id: ctx.usuarioId,
        organizacion_id: ctx.organizacionId,
        asignado_a: lead.asignado_a || ctx.usuarioId,
        lead_id: lead.id,
        conversation_id: conversation_id || null,
        task_type: 'follow_up',
        title: (title || `Seguimiento ${lead.nombre || 'lead'}`).trim(),
        due_date: dueDate.toISOString(),
        priority: priority === 'high' ? 'high' : 'medium',
        status: 'pending',
        metadata: { source: 'kanban_recordatorio' },
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/** PATCH /api/leads/[id]/tasks — cambia el estado de una tarea del lead ({ task_id, status }). */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { task_id, status } = await request.json();
    if (typeof task_id !== 'string' || !task_id) {
      return NextResponse.json({ error: 'task_id es requerido' }, { status: 400 });
    }
    if (!ESTADOS_TAREA.includes(status as EstadoTarea)) {
      return NextResponse.json({ error: 'Estado de tarea inválido' }, { status: 400 });
    }

    const { data: task, error } = await getSupabaseAdmin()
      .from('tasks')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task_id)
      .eq('lead_id', params.id)
      .eq('organizacion_id', ctx.organizacionId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });

    return NextResponse.json({ task });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
