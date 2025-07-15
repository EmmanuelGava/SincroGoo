import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(req: NextRequest) {
  try {
    // Usar cliente de administrador temporalmente para evitar problemas de sesión
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const conversacionId = searchParams.get('conversacionId');

    if (!conversacionId) {
      return NextResponse.json({ 
        error: 'conversacionId es requerido' 
      }, { status: 400 });
    }

    // Obtener todos los mensajes de la conversación
    const { data: mensajes, error } = await supabase
      .from('mensajes_conversacion')
      .select(`
        id,
        contenido,
        tipo,
        remitente,
        fecha_mensaje,
        canal,
        usuario_id,
        metadata
      `)
      .eq('conversacion_id', conversacionId)
      .order('fecha_mensaje', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ 
      mensajes: mensajes || [] 
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching mensajes:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ 
      mensajes: [], 
      error: errorMessage 
    }, { status });
  }
}