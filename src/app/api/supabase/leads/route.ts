import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import {
  attachLeadConversationMeta,
  pickUltimoMensaje,
  type LeadConversationLink,
} from '@/lib/crm/leadConversationUnread';
import { shouldRecordEtapaChange } from '@/lib/crm/leadEtapaHistorial';
import { isEstadoPerdido, isMotivoPerdido } from '@/lib/contactos/estadoLead';

type ConvRow = LeadConversationLink & {
  mensajes_conversacion?: Array<{ contenido?: string | null; fecha_mensaje?: string | null }> | null;
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
    };
  });
}

// Helper: supabaseToken si existe; si no, fallback a admin + usuario_id (cuando signInWithIdToken falló)
async function getUserSupabaseClient(): Promise<{ supabase: ReturnType<typeof getSupabaseAdmin>; userId: string } | null> {
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  try {
    const { supabase } = await getSupabaseClient(true);
    return { supabase, userId: usuarioId };
  } catch {
    return { supabase: getSupabaseAdmin(), userId: usuarioId };
  }
}

// GET /api/supabase/leads - Listar leads (opcional: filtrar por estado_id)
export async function GET(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase, userId } = client;

    const searchParams = request.nextUrl.searchParams;
    const estado_id = searchParams.get('estado_id');
    
    // Try vista first, fallback to basic leads table
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

    const leads = (data || []) as Array<{ id: string; contacto_id?: string | null }>;
    const ids = leads.map((lead) => lead.id);
    const contactoIds = [...new Set(leads.map((lead) => lead.contacto_id).filter((id): id is string => Boolean(id)))];
    const convSelect = `
      id,
      lead_id,
      contacto_id,
      unread_count,
      fecha_mensaje,
      servicio_origen,
      mensajes_conversacion (
        contenido,
        fecha_mensaje
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

    return NextResponse.json(
      attachLeadConversationMeta(leads, toLeadConversationLinks(convRows))
    );
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
      // leave as-is if undefined; empty string → null
      if (fields.valor_potencial === '') fields.valor_potencial = null;
    }

    if (fields.estado_id) {
      const { data: current } = await supabase
        .from('leads')
        .select('id, estado_id, contacto_id')
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
    return NextResponse.json(data);
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