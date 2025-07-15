import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const leadId = params.id;

    if (!leadId) {
      return NextResponse.json({
        error: 'ID del lead es requerido'
      }, { status: 400 });
    }

    // Obtener interacciones del lead desde diferentes fuentes
    const interacciones = [];

    // 1. Obtener mensajes de conversaciones relacionadas con este lead
    const { data: mensajes, error: mensajesError } = await supabase
      .from('mensajes_conversacion')
      .select(`
        id,
        contenido,
        fecha_mensaje,
        canal,
        tipo,
        conversacion_id,
        conversaciones!inner(lead_id)
      `)
      .eq('conversaciones.lead_id', leadId)
      .order('fecha_mensaje', { ascending: false })
      .limit(20);

    if (!mensajesError && mensajes) {
      mensajes.forEach(mensaje => {
        interacciones.push({
          id: `msg_${mensaje.id}`,
          tipo: 'mensaje',
          descripcion: `Mensaje ${mensaje.tipo}: ${mensaje.contenido.substring(0, 100)}${mensaje.contenido.length > 100 ? '...' : ''}`,
          fecha: mensaje.fecha_mensaje,
          canal: mensaje.canal
        });
      });
    }

    // 2. Obtener interacciones específicas si existe una tabla de interacciones
    const { data: interaccionesDirectas, error: interaccionesError } = await supabase
      .from('interacciones_lead')
      .select(`
        id,
        tipo,
        descripcion,
        fecha,
        canal,
        metadata
      `)
      .eq('lead_id', leadId)
      .order('fecha', { ascending: false })
      .limit(10);

    if (!interaccionesError && interaccionesDirectas) {
      interaccionesDirectas.forEach(interaccion => {
        interacciones.push({
          id: `int_${interaccion.id}`,
          tipo: interaccion.tipo,
          descripcion: interaccion.descripcion,
          fecha: interaccion.fecha,
          canal: interaccion.canal
        });
      });
    }

    // 3. Obtener cambios de estado del lead
    const { data: cambiosEstado, error: cambiosError } = await supabase
      .from('historial_estados_lead')
      .select(`
        id,
        estado_anterior,
        estado_nuevo,
        fecha_cambio,
        motivo
      `)
      .eq('lead_id', leadId)
      .order('fecha_cambio', { ascending: false })
      .limit(5);

    if (!cambiosError && cambiosEstado) {
      cambiosEstado.forEach(cambio => {
        interacciones.push({
          id: `estado_${cambio.id}`,
          tipo: 'cambio_estado',
          descripcion: `Estado cambiado de "${cambio.estado_anterior}" a "${cambio.estado_nuevo}"${cambio.motivo ? `: ${cambio.motivo}` : ''}`,
          fecha: cambio.fecha_cambio,
          canal: 'sistema'
        });
      });
    }

    // Ordenar todas las interacciones por fecha (más recientes primero)
    interacciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({
      success: true,
      interacciones: interacciones.slice(0, 50) // Limitar a 50 interacciones más recientes
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET /api/leads/[id]/interacciones:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({
      error: errorMessage
    }, { status });
  }
}