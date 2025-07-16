import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

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
        mensajes_conversacion!inner (
          contenido,
          fecha_mensaje
        )
      `)
      .order('fecha_mensaje', { ascending: false });

    if (error) throw error;

    // Procesar las conversaciones para obtener el último mensaje
    const conversacionesConUltimoMensaje = conversaciones?.map(conv => {
      // Obtener el último mensaje de esta conversación
      const mensajes = conv.mensajes_conversacion || [];
      const ultimoMensaje = mensajes.length > 0 
        ? mensajes.sort((a, b) => new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime())[0]
        : null;

      return {
        id: conv.id,
        remitente: conv.remitente,
        servicio_origen: conv.servicio_origen,
        fecha_mensaje: conv.fecha_mensaje,
        lead_id: conv.lead_id,
        metadata: conv.metadata,
        ultimo_mensaje: ultimoMensaje?.contenido || null
      };
    }) || [];

    return NextResponse.json({ 
      conversaciones: conversacionesConUltimoMensaje 
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching conversaciones:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ 
      conversaciones: [], 
      error: errorMessage 
    }, { status });
  }
}