import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import {
  conversationChatDisplayName,
  conversationIdentityKey,
  conversationRealPhone,
  onlyDigits,
} from '@/lib/chat/conversationIdentity';
import {
  ilikeContainsPattern,
  normalizeSearchQuery,
  rankConversationSearchHits,
  type ConversationSearchCandidate,
  type ConversationSearchMatchKind,
} from '@/lib/chat/buscarConversaciones';

type MensajeRow = {
  contenido?: string | null;
  fecha_mensaje?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ConversacionRow = {
  id: string;
  remitente: string;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string | null;
  contacto_id?: string | null;
  contactos?: { nombre?: string | null } | { nombre?: string | null }[] | null;
  metadata?: Record<string, unknown> | null;
  unread_count?: number | null;
  last_read_at?: string | null;
  mensajes_conversacion?: MensajeRow[] | null;
};

type ConversacionListaItem = {
  id: string;
  remitente: string;
  display_name: string;
  display_phone: string | null;
  servicio_origen: string;
  fecha_mensaje: string;
  lead_id?: string | null;
  contacto_id?: string | null;
  metadata: Record<string, unknown>;
  unread_count: number;
  ultimo_mensaje: string | null;
  match_kind?: ConversationSearchMatchKind;
};

function contactoNombre(
  contactos?: { nombre?: string | null } | { nombre?: string | null }[] | null
): string {
  const row = Array.isArray(contactos) ? contactos[0] : contactos;
  return String(row?.nombre || '').trim();
}

function mapConversacionRow(conv: ConversacionRow): ConversacionListaItem {
  const mensajes = conv.mensajes_conversacion || [];
  const sorted = [...mensajes].sort(
    (a, b) => new Date(b.fecha_mensaje || 0).getTime() - new Date(a.fecha_mensaje || 0).getTime()
  );
  const ultimoMensaje = sorted[0] || null;
  const named = sorted.find((m) => {
    const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
    return String(meta.contact_name || '').trim();
  });
  const namedMeta =
    named?.metadata && typeof named.metadata === 'object' ? named.metadata : {};
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
    display_name: conversationChatDisplayName({
      ...view,
      contactos: conv.contactos,
    }),
    display_phone: conversationRealPhone(view),
    servicio_origen: conv.servicio_origen,
    fecha_mensaje: conv.fecha_mensaje,
    lead_id: conv.lead_id,
    contacto_id: conv.contacto_id,
    metadata,
    unread_count: conv.unread_count || 0,
    ultimo_mensaje: ultimoMensaje?.contenido || null,
  };
}

function mergeByIdentity(
  items: ConversacionListaItem[],
  options?: { preserveOrder?: boolean }
): ConversacionListaItem[] {
  const merged = new Map<string, ConversacionListaItem>();
  const order: string[] = [];

  for (const conv of items) {
    const key = conversationIdentityKey(conv);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, conv);
      order.push(key);
      continue;
    }
    const newer =
      new Date(conv.fecha_mensaje).getTime() > new Date(current.fecha_mensaje).getTime()
        ? conv
        : current;
    const older = newer === conv ? current : conv;
    const preferSearchPreview = Boolean(options?.preserveOrder);
    merged.set(key, {
      ...newer,
      unread_count: (current.unread_count || 0) + (conv.unread_count || 0),
      ultimo_mensaje: preferSearchPreview
        ? (current.ultimo_mensaje || newer.ultimo_mensaje || older.ultimo_mensaje)
        : (newer.ultimo_mensaje || older.ultimo_mensaje),
      lead_id: newer.lead_id || older.lead_id,
      display_name: newer.display_name || older.display_name,
      match_kind: preferSearchPreview
        ? (current.match_kind || newer.match_kind || older.match_kind)
        : (newer.match_kind || older.match_kind),
    });
  }

  if (options?.preserveOrder) {
    return order.map((key) => merged.get(key)!);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime()
  );
}

const CONVERSACION_SELECT = `
  id,
  remitente,
  servicio_origen,
  fecha_mensaje,
  lead_id,
  contacto_id,
  contactos(nombre),
  metadata,
  unread_count,
  last_read_at,
  mensajes_conversacion (
    contenido,
    fecha_mensaje,
    metadata
  )
`;

async function searchConversaciones(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  query: string
): Promise<ConversacionListaItem[]> {
  const pattern = ilikeContainsPattern(query);
  if (!pattern) return [];

  const digits = onlyDigits(query);
  const messageHits = new Map<string, { contenido: string; fecha_mensaje: string }>();
  const idSet = new Set<string>();

  const msgPromise = supabase
    .from('mensajes_conversacion')
    .select('conversacion_id, contenido, fecha_mensaje')
    .ilike('contenido', pattern)
    .order('fecha_mensaje', { ascending: false })
    .limit(150);

  const remitentePromise = supabase
    .from('conversaciones')
    .select('id')
    .ilike('remitente', pattern)
    .limit(100);

  const metaNamePromise = supabase
    .from('conversaciones')
    .select('id')
    .filter('metadata->>contact_name', 'ilike', pattern)
    .limit(100);

  const metaPhonePromise =
    digits.length >= 3
      ? supabase
          .from('conversaciones')
          .select('id')
          .filter('metadata->>phone_number', 'ilike', `%${digits}%`)
          .limit(100)
      : supabase
          .from('conversaciones')
          .select('id')
          .filter('metadata->>phone_number', 'ilike', pattern)
          .limit(100);

  const contactosNombrePromise = supabase
    .from('contactos')
    .select('id')
    .ilike('nombre', pattern)
    .limit(100);

  const contactosPhonePromise =
    digits.length >= 3
      ? supabase
          .from('contactos')
          .select('id')
          .or(`telefono_digits.ilike.%${digits}%,telefono.ilike.%${digits}%`)
          .limit(100)
      : Promise.resolve({ data: [] as { id: string }[], error: null });

  const [
    msgRes,
    remitenteRes,
    metaNameRes,
    metaPhoneRes,
    contactosNombreRes,
    contactosPhoneRes,
  ] = await Promise.all([
    msgPromise,
    remitentePromise,
    metaNamePromise,
    metaPhonePromise,
    contactosNombrePromise,
    contactosPhonePromise,
  ]);

  for (const row of msgRes.data || []) {
    const cid = String((row as { conversacion_id?: string }).conversacion_id || '');
    if (!cid) continue;
    idSet.add(cid);
    if (!messageHits.has(cid)) {
      messageHits.set(cid, {
        contenido: String((row as { contenido?: string }).contenido || ''),
        fecha_mensaje: String((row as { fecha_mensaje?: string }).fecha_mensaje || ''),
      });
    }
  }

  for (const row of [
    ...(remitenteRes.data || []),
    ...(metaNameRes.data || []),
    ...(metaPhoneRes.data || []),
  ]) {
    if (row?.id) idSet.add(String(row.id));
  }

  const contactoIds = [
    ...new Set(
      [...(contactosNombreRes.data || []), ...(contactosPhoneRes.data || [])]
        .map((r) => r?.id)
        .filter(Boolean)
        .map(String)
    ),
  ];

  if (contactoIds.length > 0) {
    const { data: byContacto } = await supabase
      .from('conversaciones')
      .select('id')
      .in('contacto_id', contactoIds)
      .limit(100);
    for (const row of byContacto || []) {
      if (row?.id) idSet.add(String(row.id));
    }
  }

  // Remitente también por dígitos (teléfono crudo)
  if (digits.length >= 3) {
    const { data: byDigits } = await supabase
      .from('conversaciones')
      .select('id')
      .ilike('remitente', `%${digits}%`)
      .limit(100);
    for (const row of byDigits || []) {
      if (row?.id) idSet.add(String(row.id));
    }
  }

  const ids = [...idSet];
  if (ids.length === 0) return [];

  const { data: conversaciones, error } = await supabase
    .from('conversaciones')
    .select(CONVERSACION_SELECT)
    .in('id', ids.slice(0, 80))
    .order('fecha_mensaje', { ascending: false });

  if (error) throw error;

  const mapped = ((conversaciones || []) as ConversacionRow[]).map(mapConversacionRow);
  const candidates: ConversationSearchCandidate[] = mapped.map((conv) => {
    const hit = messageHits.get(conv.id);
    const meta = conv.metadata || {};
    return {
      id: conv.id,
      remitente: conv.remitente,
      display_name: conv.display_name,
      display_phone: conv.display_phone,
      contacto_nombre: contactoNombre(
        (conversaciones as ConversacionRow[] | null)?.find((c) => c.id === conv.id)?.contactos
      ),
      contact_name: String(meta.contact_name || ''),
      phone_number: String(meta.phone_number || ''),
      fecha_mensaje: conv.fecha_mensaje,
      ultimo_mensaje: conv.ultimo_mensaje,
      hit_mensaje: hit?.contenido || null,
      hit_fecha: hit?.fecha_mensaje || null,
    };
  });

  const ranked = rankConversationSearchHits(candidates, query);
  const byId = new Map(mapped.map((c) => [c.id, c]));

  const rankedItems: ConversacionListaItem[] = [];
  for (const hit of ranked) {
    const base = byId.get(hit.id);
    if (!base) continue;
    rankedItems.push({
      ...base,
      ultimo_mensaje: hit.preview || base.ultimo_mensaje,
      match_kind: hit.match_kind,
    });
  }

  return mergeByIdentity(rankedItems, { preserveOrder: true });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const q = normalizeSearchQuery(req.nextUrl.searchParams.get('q'));

    if (q) {
      const conversaciones = await searchConversaciones(supabase, q);
      return NextResponse.json(
        { conversaciones, q },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const { data: conversaciones, error } = await supabase
      .from('conversaciones')
      .select(CONVERSACION_SELECT)
      .order('fecha_mensaje', { ascending: false });

    if (error) throw error;

    const conversacionesConUltimoMensaje = ((conversaciones || []) as ConversacionRow[]).map(
      mapConversacionRow
    );
    const conversacionesUnicas = mergeByIdentity(conversacionesConUltimoMensaje);

    return NextResponse.json(
      { conversaciones: conversacionesUnicas },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Error fetching conversaciones:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json(
      {
        conversaciones: [],
        error: errorMessage,
      },
      { status }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const conversacionId = body.conversacionId || body.id;
    if (!conversacionId) {
      return NextResponse.json({ error: 'conversacionId requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('conversaciones')
      .update({
        unread_count: 0,
        last_read_at: new Date().toISOString(),
      })
      .eq('id', conversacionId);

    if (error) throw error;

    return NextResponse.json({ success: true }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error marcando conversación leída:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const conversacionId = body.conversacionId || body.id;
    if (!conversacionId) {
      return NextResponse.json({ error: 'conversacionId requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await supabase
      .from('tasks')
      .update({ conversation_id: null })
      .eq('conversation_id', conversacionId);

    const { error: messagesError } = await supabase
      .from('mensajes_conversacion')
      .delete()
      .eq('conversacion_id', conversacionId);
    if (messagesError) throw messagesError;

    const { error } = await supabase
      .from('conversaciones')
      .delete()
      .eq('id', conversacionId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando conversación:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
