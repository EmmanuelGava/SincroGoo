import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { conversationDisplayName, conversationIdentityKey, conversationRealPhone } from '@/lib/chat/conversationIdentity';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación con NextAuth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usar cliente admin para operaciones del servidor
    const supabase = getSupabaseAdmin();

    // Obtener todas las conversaciones con su último mensaje
    const { data: conversaciones, error } = await supabase
      .from('conversaciones')
      .select(`
        id,
        remitente,
        servicio_origen,
        fecha_mensaje,
        lead_id,
        metadata,
        unread_count,
        last_read_at,
        mensajes_conversacion (
          contenido,
          fecha_mensaje,
          metadata
        )
      `)
      .order('fecha_mensaje', { ascending: false });

    if (error) throw error;

    // Procesar las conversaciones para obtener el último mensaje
    const conversacionesConUltimoMensaje = conversaciones?.map(conv => {
      const mensajes = conv.mensajes_conversacion || [];
      const ultimoMensaje = mensajes.length > 0 
        ? mensajes.sort((a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime())[0]
        : null;
      const named = [...mensajes]
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
        lead_id: conv.lead_id,
        metadata,
        unread_count: conv.unread_count || 0,
        ultimo_mensaje: ultimoMensaje?.contenido || null
      };
    }) || [];

    const merged = new Map<string, (typeof conversacionesConUltimoMensaje)[number]>();
    for (const conv of conversacionesConUltimoMensaje) {
      const key = conversationIdentityKey(conv);
      const current = merged.get(key);
      if (!current) {
        merged.set(key, conv);
        continue;
      }
      const newer = new Date(conv.fecha_mensaje).getTime() > new Date(current.fecha_mensaje).getTime()
        ? conv
        : current;
      const older = newer === conv ? current : conv;
      merged.set(key, {
        ...newer,
        unread_count: (current.unread_count || 0) + (conv.unread_count || 0),
        ultimo_mensaje: newer.ultimo_mensaje || older.ultimo_mensaje,
      });
    }

    const conversacionesUnicas = [...merged.values()].sort(
      (a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime()
    );

    return NextResponse.json({ 
      conversaciones: conversacionesUnicas 
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (error) {
    console.error('Error fetching conversaciones:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ 
      conversaciones: [], 
      error: errorMessage 
    }, { status });
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