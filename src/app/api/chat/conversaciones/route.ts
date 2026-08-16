import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { conversationDisplayName, conversationIdentityKey } from '@/lib/chat/conversationIdentity';

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
        mensajes_conversacion (
          contenido,
          fecha_mensaje
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

      return {
        id: conv.id,
        remitente: conv.remitente,
        display_name: conversationDisplayName(conv),
        servicio_origen: conv.servicio_origen,
        fecha_mensaje: conv.fecha_mensaje,
        lead_id: conv.lead_id,
        metadata: conv.metadata,
        ultimo_mensaje: ultimoMensaje?.contenido || null
      };
    }) || [];

    const merged = new Map<string, (typeof conversacionesConUltimoMensaje)[number]>();
    for (const conv of conversacionesConUltimoMensaje) {
      const key = conversationIdentityKey(conv);
      const current = merged.get(key);
      if (!current || new Date(conv.fecha_mensaje).getTime() > new Date(current.fecha_mensaje).getTime()) {
        merged.set(key, {
          ...conv,
          remitente: conv.display_name || conv.remitente,
        });
      }
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