import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { conversationDisplayName, conversationRealPhone } from '@/lib/chat/conversationIdentity';
import {
  decideKanbanIncomingAction,
  findOpenLead,
  upsertContactoPorTelefono,
  type LeadConEstado,
} from '@/lib/contactos/matchContacto';

async function requireCrm() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  return { supabase: getSupabaseAdmin(), usuarioId };
}

export async function GET() {
  try {
    const client = await requireCrm();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: conversaciones, error } = await client.supabase
      .from('conversaciones')
      .select(`
        id,
        remitente,
        servicio_origen,
        fecha_mensaje,
        lead_id,
        metadata,
        mensajes_conversacion (
          contenido,
          fecha_mensaje,
          metadata
        )
      `)
      .is('lead_id', null)
      .order('fecha_mensaje', { ascending: false });

    if (error) throw error;

    const mensajes = (conversaciones || []).map((conv) => {
      const msgs = conv.mensajes_conversacion || [];
      const ultimo = [...msgs].sort(
        (a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime()
      )[0];
      const named = [...msgs]
        .sort((a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime())
        .find((m) => {
          const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata as Record<string, unknown> : {};
          return String(meta.contact_name || '').trim();
        });
      const namedMeta = named?.metadata && typeof named.metadata === 'object'
        ? named.metadata as Record<string, unknown>
        : {};
      const metadata = {
        ...(conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {}),
        ...(namedMeta.contact_name && !(conv.metadata as Record<string, unknown> | null)?.contact_name
          ? { contact_name: namedMeta.contact_name }
          : {}),
      };
      const view = { ...conv, metadata };

      return {
        id: conv.id,
        remitente: conv.remitente,
        display_name: conversationDisplayName(view),
        display_phone: conversationRealPhone(view),
        servicio_origen: conv.servicio_origen,
        fecha_mensaje: conv.fecha_mensaje,
        contenido: ultimo?.contenido || 'Sin mensajes',
        ultimo_mensaje: ultimo?.contenido || 'Sin mensajes',
        metadata,
      };
    });

    return NextResponse.json({ mensajes }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ mensajes: [], error: errorMessage }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireCrm();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!client.usuarioId) {
      return NextResponse.json({ error: 'No se pudo identificar al usuario' }, { status: 401 });
    }

    const { conversationId, estadoId, forceNewLead, reuseLeadId } = await req.json();
    if (!conversationId || !estadoId) {
      return NextResponse.json({ error: 'Faltan conversationId o estadoId' }, { status: 400 });
    }

    const { data: conversacion, error: convError } = await client.supabase
      .from('conversaciones')
      .select('id, remitente, servicio_origen, lead_id, metadata, mensajes_conversacion(contenido, fecha_mensaje, metadata)')
      .eq('id', conversationId)
      .maybeSingle();

    if (convError || !conversacion) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    if (conversacion.lead_id) {
      const existing = await client.supabase
        .from('leads')
        .select('*')
        .eq('id', conversacion.lead_id)
        .maybeSingle();
      return NextResponse.json({ lead: existing.data, alreadyLinked: true });
    }

    const msgs = conversacion.mensajes_conversacion || [];
    const named = [...msgs]
      .sort((a: { fecha_mensaje: string }, b: { fecha_mensaje: string }) =>
        new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime())
      .find((m: { metadata?: Record<string, unknown> }) => {
        const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
        return String(meta.contact_name || '').trim();
      });
    const namedMeta = named?.metadata && typeof named.metadata === 'object' ? named.metadata : {};
    const metadata = {
      ...(conversacion.metadata && typeof conversacion.metadata === 'object' ? conversacion.metadata : {}),
      ...(namedMeta.contact_name ? { contact_name: namedMeta.contact_name } : {}),
    };
    const view = { ...conversacion, metadata };
    const nombre = conversationDisplayName(view);
    let telefono = conversationRealPhone(view);

    if (!telefono) {
      const remoteJid = String((metadata as Record<string, unknown>).remote_jid || '');
      const jid = remoteJid || (String(conversacion.remitente).includes('@')
        ? String(conversacion.remitente)
        : `${conversacion.remitente}@lid`);
      if (jid.includes('@lid')) {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          const { liteResolvePeer } = await import('@/lib/whatsapp/workerClient');
          const resolved = await liteResolvePeer(session.user.id, jid);
          const phone = typeof resolved.body.phone === 'string' ? resolved.body.phone : '';
          if (resolved.body.resolved && phone) {
            telefono = phone;
            const { persistResolvedPeerPhone } = await import('@/lib/chat/persistPeerPhone');
            await persistResolvedPeerPhone({ conversacionId: conversationId, phone });
          }
        }
      }
    }

    const email = '';
    const remoteJid = String((metadata as Record<string, unknown>).remote_jid || '');
    const waJid = remoteJid.includes('@')
      ? remoteJid
      : (String(conversacion.remitente).includes('@') ? String(conversacion.remitente) : null);

    const contactoId = await upsertContactoPorTelefono(client.supabase, {
      usuarioId: client.usuarioId,
      nombre,
      telefonoDisplay: telefono,
      waJid,
    });

    let openLead: { id: string; nombre: string; estado_id: string } | null = null;
    if (contactoId) {
      const { data: abiertos } = await client.supabase
        .from('leads')
        .select('id, nombre, estado_id, estados_lead(nombre)')
        .eq('contacto_id', contactoId)
        .eq('asignado_a', client.usuarioId);
      const abierto = findOpenLead((abiertos || []) as LeadConEstado[]);
      if (abierto) {
        openLead = { id: abierto.id, nombre: abierto.nombre, estado_id: abierto.estado_id };
      }
    }

    const decision = decideKanbanIncomingAction({
      contactoId,
      openLead,
      reuseLeadId: typeof reuseLeadId === 'string' ? reuseLeadId : undefined,
      forceNewLead: forceNewLead === true,
    });

    if (decision.action === 'needsChoice') {
      return NextResponse.json({
        needsChoice: true,
        openLead: decision.openLead,
        contactoId: decision.contactoId,
      });
    }

    const linkConversacion = async (leadId: string) => {
      const convUpdate: Record<string, unknown> = { lead_id: leadId };
      if (contactoId) convUpdate.contacto_id = contactoId;
      const { error: linkError } = await client.supabase
        .from('conversaciones')
        .update(convUpdate)
        .eq('id', conversationId);
      if (linkError) throw linkError;
    };

    if (decision.action === 'reuse') {
      const { data: existingLead, error: existingErr } = await client.supabase
        .from('leads')
        .select('*')
        .eq('id', decision.reuseLeadId)
        .eq('asignado_a', client.usuarioId)
        .maybeSingle();
      if (existingErr || !existingLead) {
        return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
      }
      if (contactoId && existingLead.contacto_id && existingLead.contacto_id !== contactoId) {
        return NextResponse.json({ error: 'El lead no pertenece a este contacto' }, { status: 400 });
      }

      const { data: updated, error: updErr } = await client.supabase
        .from('leads')
        .update({ estado_id: estadoId, ...(contactoId ? { contacto_id: contactoId } : {}) })
        .eq('id', existingLead.id)
        .select('*')
        .single();
      if (updErr) throw updErr;

      await linkConversacion(existingLead.id);
      return NextResponse.json({ lead: updated });
    }

    const { data: lead, error: leadError } = await client.supabase
      .from('leads')
      .insert({
        nombre,
        email,
        telefono: telefono || null,
        estado_id: estadoId,
        asignado_a: client.usuarioId,
        creado_por: client.usuarioId,
        notas: `Creado desde chat ${conversacion.servicio_origen || ''}`.trim(),
        ...(contactoId ? { contacto_id: contactoId } : {}),
      })
      .select('*')
      .single();

    if (leadError) throw leadError;

    await linkConversacion(lead.id);

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error convirtiendo conversación en lead:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const client = await requireCrm();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const { error } = await client.supabase.from('conversaciones').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const client = await requireCrm();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversationId, leadId } = await req.json();
    if (!conversationId || !leadId) {
      return NextResponse.json({ error: 'Faltan conversationId o leadId' }, { status: 400 });
    }

    const { data: conversacionOriginal, error: errorConsulta } = await client.supabase
      .from('conversaciones')
      .select('remitente, servicio_origen')
      .eq('id', conversationId)
      .single();
    if (errorConsulta || !conversacionOriginal) {
      return NextResponse.json({ error: 'No se pudo obtener la conversación original' }, { status: 400 });
    }

    const { error } = await client.supabase
      .from('conversaciones')
      .update({ lead_id: leadId })
      .eq('remitente', conversacionOriginal.remitente)
      .eq('servicio_origen', conversacionOriginal.servicio_origen);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error detallado al asociar conversación:', JSON.stringify(error, null, 2));
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
