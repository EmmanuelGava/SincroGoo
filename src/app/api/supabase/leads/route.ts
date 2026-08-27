import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getCrmApiClient } from '@/lib/crm/crmApiClient';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import {
  attachLeadConversationMeta,
  pickUltimoMensaje,
  type LeadConversationLink,
} from '@/lib/crm/leadConversationUnread';
import { shouldRecordEtapaChange } from '@/lib/crm/leadEtapaHistorial';
import { isEstadoPerdido, isMotivoPerdido, isEstadoGanado } from '@/lib/contactos/estadoLead';
import {
  descontarStockAlGanado,
  leadTagsStockAlreadyDeducted,
  mergeLeadTagsWithStockDeduction,
} from '@/lib/catalogo/descontarStockAlGanado';
import { attachUltimoMovEtapa } from '@/lib/crm/leadUltimoMov';
import type { ProximaTareaLead } from '@/lib/crm/leadTaskBadge';

type ConvRow = LeadConversationLink & {
  metadata?: Record<string, unknown> | null;
  mensajes_conversacion?: Array<{
    contenido?: string | null;
    fecha_mensaje?: string | null;
    usuario_id?: string | null;
    metadata?: Record<string, unknown> | null;
  }> | null;
};

type LeadRow = {
  id: string;
  contacto_id?: string | null;
  estados_lead?: { nombre?: string | null } | { nombre?: string | null }[] | null;
};

function toLeadConversationLinks(rows: ConvRow[] | null | undefined): LeadConversationLink[] {
  return (rows || []).map((conv) => {
    const preview = pickUltimoMensaje(conv.mensajes_conversacion);
    return {
      id: conv.id,
      lead_id: conv.lead_id,
      contacto_id: conv.contacto_id,
      unread_count: conv.unread_count,
      fecha_mensaje: preview.fecha_mensaje || conv.fecha_mensaje || null,
      ultimo_mensaje: preview.contenido,
      servicio_origen: conv.servicio_origen || null,
      seguimiento_dismissed_at: typeof conv.metadata?.seguimiento_dismissed_at === 'string'
        ? conv.metadata.seguimiento_dismissed_at
        : null,
      mensajes: (conv.mensajes_conversacion || []).map((m) => ({
        fecha_mensaje: m.fecha_mensaje,
        usuario_id: m.usuario_id,
        metadata: m.metadata,
      })),
    };
  });
}

function attachContactoEtiquetas<T extends { contacto_id?: string | null }>(
  leads: T[],
  contactos: Array<{ id: string; etiquetas?: string[] | null }> | null | undefined
): Array<T & { contacto_etiquetas: string[] }> {
  const byId = new Map((contactos || []).map((c) => [c.id, c.etiquetas || []]));
  return leads.map((lead) => ({
    ...lead,
    contacto_etiquetas: lead.contacto_id ? (byId.get(lead.contacto_id) || []) : [],
  }));
}

function attachProximaTarea<T extends { id: string }>(
  leads: T[],
  tasks: Array<{ id: string; lead_id: string; due_date: string; title?: string | null }> | null | undefined
): Array<T & { proxima_tarea: ProximaTareaLead | null }> {
  const byLead = new Map<string, ProximaTareaLead>();
  for (const task of tasks || []) {
    if (!task.lead_id || !task.due_date) continue;
    const prev = byLead.get(task.lead_id);
    if (!prev || new Date(task.due_date).getTime() < new Date(prev.due_date).getTime()) {
      byLead.set(task.lead_id, {
        id: task.id,
        due_date: task.due_date,
        title: task.title,
      });
    }
  }
  return leads.map((lead) => ({
    ...lead,
    proxima_tarea: byLead.get(lead.id) || null,
  }));
}

// Helper: CRM con service role + usuario_id de la sesión.
async function getUserSupabaseClient(): Promise<{ supabase: ReturnType<typeof getSupabaseAdmin>; userId: string } | null> {
  return getCrmApiClient();
}

// GET /api/supabase/leads - Listar leads (opcional: filtrar por estado_id)
export async function GET(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase, userId } = client;

    const searchParams = request.nextUrl.searchParams;
    const estado_id = searchParams.get('estado_id');
    
    let query = supabase.from('leads').select(`
      *,
      estados_lead(nombre, color)
    `).eq('asignado_a', userId);

    if (estado_id) {
      query = query.eq('estado_id', estado_id);
    }

    const { data, error } = await query.order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error al obtener leads:', error);
      throw error;
    }

    const leads = (data || []) as LeadRow[];
    const ids = leads.map((lead) => lead.id);
    const contactoIds = [...new Set(leads.map((lead) => lead.contacto_id).filter((id): id is string => Boolean(id)))];
    const convSelect = `
      id,
      lead_id,
      contacto_id,
      unread_count,
      fecha_mensaje,
      servicio_origen,
      metadata,
      mensajes_conversacion (
        contenido,
        fecha_mensaje,
        usuario_id,
        metadata
      )
    `;
    const convRows: ConvRow[] = [];

    if (ids.length > 0) {
      const { data: byLead } = await supabase
        .from('conversaciones')
        .select(convSelect)
        .in('lead_id', ids)
        .order('fecha_mensaje', { ascending: false });
      convRows.push(...((byLead || []) as ConvRow[]));
    }
    if (contactoIds.length > 0) {
      const { data: byContacto } = await supabase
        .from('conversaciones')
        .select(convSelect)
        .in('contacto_id', contactoIds)
        .order('fecha_mensaje', { ascending: false });
      convRows.push(...((byContacto || []) as ConvRow[]));
    }

    let contactosRows: Array<{ id: string; etiquetas?: string[] | null }> = [];
    if (contactoIds.length > 0) {
      const { data: contactosData } = await supabase
        .from('contactos')
        .select('id, etiquetas')
        .in('id', contactoIds);
      contactosRows = (contactosData || []) as Array<{ id: string; etiquetas?: string[] | null }>;
    }

    let tasksRows: Array<{ id: string; lead_id: string; due_date: string; title?: string | null }> = [];
    if (ids.length > 0) {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, lead_id, due_date, title')
        .eq('usuario_id', userId)
        .in('lead_id', ids)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      tasksRows = (tasksData || []) as Array<{ id: string; lead_id: string; due_date: string; title?: string | null }>;
    }

    const withConv = attachLeadConversationMeta(leads, toLeadConversationLinks(convRows));
    const withTags = attachContactoEtiquetas(withConv, contactosRows);
    const withTasks = attachProximaTarea(withTags, tasksRows);

    let historialRows: Array<{
      lead_id: string;
      fecha: string;
      estado_anterior_nombre: string | null;
      estado_nuevo_nombre: string;
      motivo?: string | null;
    }> = [];
    if (ids.length > 0) {
      const { data: historialData } = await supabase
        .from('lead_etapa_historial')
        .select('lead_id, fecha, estado_anterior_nombre, estado_nuevo_nombre, motivo')
        .in('lead_id', ids)
        .order('fecha', { ascending: false });
      historialRows = (historialData || []) as typeof historialRows;
    }

    const result = attachUltimoMovEtapa(withTasks, historialRows);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completo en GET leads:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST /api/supabase/leads - Crear lead
export async function POST(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { supabase, userId } = client;
    const body = await request.json();
    const {
      nombre,
      email,
      telefono,
      empresa,
      cargo,
      estado_id,
      probabilidad_cierre,
      tags,
      notas,
      origen,
      valor_potencial,
      fecha_cierre,
      score,
    } = body;
    
    if (!nombre || !estado_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, estado_id)' }, { status: 400 });
    }

    if (score != null && score !== '' && !['alta', 'media', 'baja'].includes(score)) {
      return NextResponse.json({ error: 'score inválido (alta, media o baja)' }, { status: 400 });
    }

    const emailFinal = email || '';
    
    const { data, error } = await supabase.from('leads').insert({ 
      nombre, 
      email: emailFinal, 
      telefono, 
      empresa, 
      cargo, 
      estado_id, 
      probabilidad_cierre, 
      tags, 
      notas,
      origen: origen || null,
      valor_potencial: valor_potencial ?? null,
      fecha_cierre: fecha_cierre || null,
      score: score || 'media',
      asignado_a: userId,
      creado_por: userId
    }).select('*').single();
    
    if (error) {
      console.error('ERROR SUPABASE AL INSERTAR LEAD:', error);
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PATCH /api/supabase/leads - Actualizar lead (por id)
export async function PATCH(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase, userId } = client;
    const body = await request.json();
    const { id, motivo, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });

    if (fields.score != null && fields.score !== '' && !['alta', 'media', 'baja'].includes(fields.score)) {
      return NextResponse.json({ error: 'score inválido (alta, media o baja)' }, { status: 400 });
    }
    if (fields.score === '') fields.score = null;
    if (fields.fecha_cierre === '') fields.fecha_cierre = null;
    if (fields.valor_potencial === '' || fields.valor_potencial === undefined) {
      if (fields.valor_potencial === '') fields.valor_potencial = null;
    }

    let stockDeduction: Awaited<ReturnType<typeof descontarStockAlGanado>> | null = null;

    if (fields.estado_id) {
      const { data: current } = await supabase
        .from('leads')
        .select('id, estado_id, contacto_id, tags')
        .eq('id', id)
        .eq('asignado_a', userId)
        .maybeSingle();
      if (!current) {
        return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
      }

      const estadoIds = [current.estado_id, fields.estado_id].filter(Boolean);
      const { data: estados } = estadoIds.length
        ? await supabase.from('estados_lead').select('id, nombre').in('id', estadoIds)
        : { data: [] as Array<{ id: string; nombre: string }> };
      const nameOf = (estadoId: string | null | undefined) =>
        estados?.find((estado) => estado.id === estadoId)?.nombre || 'Sin etapa';
      const nuevoNombre = nameOf(fields.estado_id);

      if (isEstadoPerdido(nuevoNombre) && !isMotivoPerdido(motivo)) {
        return NextResponse.json(
          { error: 'Al marcar como Perdido hay que indicar el motivo' },
          { status: 400 }
        );
      }
      const prevNombre = nameOf(current.estado_id);
      const movingToGanado =
        isEstadoGanado(nuevoNombre) && !isEstadoGanado(prevNombre) && !leadTagsStockAlreadyDeducted(current.tags);

      if (movingToGanado) {
        stockDeduction = await descontarStockAlGanado(supabase, {
          usuarioId: userId,
          leadId: id,
          nuevoEstadoNombre: nuevoNombre,
          leadTags: current.tags,
        });
        if (stockDeduction.applied && stockDeduction.deductions) {
          fields.tags = mergeLeadTagsWithStockDeduction(current.tags, stockDeduction.deductions);
        }
      }

      if (current && shouldRecordEtapaChange(current.estado_id, fields.estado_id)) {
        const { error: historialError } = await supabase.from('lead_etapa_historial').insert({
          lead_id: id,
          contacto_id: current.contacto_id || null,
          usuario_id: userId,
          estado_anterior_id: current.estado_id || null,
          estado_nuevo_id: fields.estado_id,
          estado_anterior_nombre: current.estado_id ? nameOf(current.estado_id) : 'Sin etapa',
          estado_nuevo_nombre: nuevoNombre,
          motivo: isEstadoPerdido(nuevoNombre) ? motivo : null,
        });
        if (historialError) {
          console.warn('No se pudo guardar historial de etapa:', historialError.message);
        }
      }
    }
    
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({
      ...data,
      stock_deduction: stockDeduction?.applied
        ? {
            applied: true,
            deductions: stockDeduction.deductions,
            skippedReason: stockDeduction.skippedReason,
          }
        : stockDeduction
          ? { applied: false, skippedReason: stockDeduction.skippedReason }
          : undefined,
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE /api/supabase/leads - Eliminar lead (por id)
export async function DELETE(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase } = client;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });
    
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
