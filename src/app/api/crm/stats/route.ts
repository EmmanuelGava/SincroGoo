import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import {
  buildInboxStatsSnapshot,
  type ConversationStatsInput,
} from '@/lib/crm/inboxStats';

/**
 * GET /api/crm/stats
 *
 * Auth: NextAuth + UUID de usuarios (igual que el resto del CRM).
 * Scope:
 * - Leads: asignado_a = usuario
 * - Estados: usuario_id = usuario
 * - Conversaciones: sin lead del mismo Google ID + leads/contactos del usuario
 */
async function requireCrm() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return { supabase: getSupabaseAdmin(), usuarioId };
}

type MsgRow = {
  fecha_mensaje?: string | null;
  usuario_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ConvRow = {
  id: string;
  fecha_mensaje?: string | null;
  unread_count?: number | null;
  lead_id?: string | null;
  contacto_id?: string | null;
  mensajes_conversacion?: MsgRow[] | null;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const client = await requireCrm();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { supabase, usuarioId } = client;
    const googleUserId = session.user.id;

    const [{ data: estados, error: estadosError }, { data: leads, error: leadsError }, { data: contactos }] =
      await Promise.all([
        supabase
          .from('estados_lead')
          .select('id, nombre, orden, color')
          .eq('usuario_id', usuarioId)
          .order('orden', { ascending: true }),
        supabase
          .from('leads')
          .select('id, estado_id, contacto_id')
          .eq('asignado_a', usuarioId),
        supabase.from('contactos').select('id').eq('usuario_id', usuarioId),
      ]);

    if (estadosError) throw estadosError;
    if (leadsError) throw leadsError;

    const leadIds = (leads || []).map((l) => l.id);
    const contactoIds = new Set((contactos || []).map((c) => c.id));
    for (const lead of leads || []) {
      if (lead.contacto_id) contactoIds.add(lead.contacto_id);
    }

    const convSelect = `
      id,
      fecha_mensaje,
      unread_count,
      lead_id,
      contacto_id,
      mensajes_conversacion (
        fecha_mensaje,
        usuario_id,
        metadata
      )
    `;

    const convMap = new Map<string, ConvRow>();

    // Chats sin lead: solo los del usuario conectado (Google ID en conversaciones.usuario_id).
    const { data: sinLead, error: sinLeadErr } = await supabase
      .from('conversaciones')
      .select(convSelect)
      .is('lead_id', null)
      .eq('usuario_id', googleUserId);
    if (sinLeadErr) throw sinLeadErr;
    for (const row of (sinLead || []) as ConvRow[]) {
      convMap.set(row.id, row);
    }

    if (leadIds.length > 0) {
      const { data: byLead, error: byLeadErr } = await supabase
        .from('conversaciones')
        .select(convSelect)
        .in('lead_id', leadIds);
      if (byLeadErr) throw byLeadErr;
      for (const row of (byLead || []) as ConvRow[]) {
        convMap.set(row.id, row);
      }
    }

    if (contactoIds.size > 0) {
      const { data: byContacto, error: byContactoErr } = await supabase
        .from('conversaciones')
        .select(convSelect)
        .in('contacto_id', [...contactoIds]);
      if (byContactoErr) throw byContactoErr;
      for (const row of (byContacto || []) as ConvRow[]) {
        convMap.set(row.id, row);
      }
    }

    const estadoNombreById = new Map((estados || []).map((e) => [e.id, e.nombre]));
    const leadEtapaByLeadId = new Map(
      (leads || []).map((l) => [l.id, estadoNombreById.get(l.estado_id) ?? null])
    );

    const conversaciones: ConversationStatsInput[] = [...convMap.values()].map((row) => ({
      id: row.id,
      fecha_mensaje: row.fecha_mensaje,
      unread_count: row.unread_count,
      leadEtapaNombre: row.lead_id ? leadEtapaByLeadId.get(row.lead_id) ?? null : null,
      mensajes: (row.mensajes_conversacion || []).map((m) => ({
        fecha_mensaje: m.fecha_mensaje,
        usuario_id: m.usuario_id,
        metadata: m.metadata,
      })),
    }));

    const snapshot = buildInboxStatsSnapshot({
      conversaciones,
      estados: (estados || []).map((e) => ({
        id: e.id,
        nombre: e.nombre,
        orden: e.orden,
        color: e.color,
      })),
      leads: (leads || []).map((l) => ({ estado_id: l.estado_id })),
    });

    return NextResponse.json(
      {
        ...snapshot,
        meta: {
          conversacionesScoped: conversaciones.length,
          leadsCount: (leads || []).length,
          generatedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Error en /api/crm/stats:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
