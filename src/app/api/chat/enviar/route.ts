import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { messagingService } from '@/app/servicios/messaging';
import type { PlataformaMensajeria } from '@/app/servicios/messaging/types';

export async function POST(req: NextRequest) {
  try {
    // Usar cliente de administrador temporalmente para evitar problemas de sesión
    const supabase = getSupabaseAdmin();

    const { conversacionId, contenido, canal, remitente } = await req.json();

    if (!conversacionId || !contenido || !canal) {
      return NextResponse.json({
        error: 'conversacionId, contenido y canal son requeridos'
      }, { status: 400 });
    }

    // 1. Guardar el mensaje en la base de datos
    const mensaje = {
      conversacion_id: conversacionId,
      tipo: 'texto',
      contenido: contenido.trim(),
      remitente: remitente,
      fecha_mensaje: new Date().toISOString(),
      canal: canal,
      usuario_id: 'admin', // Marcar como mensaje propio (temporalmente usando 'admin')
      metadata: {}
    };

    const { data: mensajeGuardado, error: errorMensaje } = await supabase
      .from('mensajes_conversacion')
      .insert(mensaje)
      .select()
      .single();

    if (errorMensaje) throw errorMensaje;

    // 2. Actualizar la fecha del último mensaje en la conversación
    const { error: errorConversacion } = await supabase
      .from('conversaciones')
      .update({ fecha_mensaje: mensaje.fecha_mensaje })
      .eq('id', conversacionId);

    if (errorConversacion) {
      console.warn('Error actualizando conversación:', errorConversacion);
    }

    // 3. Enviar mensaje a la plataforma externa usando el servicio
    let resultadoEnvio = null;
    try {
      resultadoEnvio = await messagingService.enviarMensaje({
        plataforma: canal as PlataformaMensajeria,
        destinatario: remitente,
        contenido: contenido.trim()
      });

      if (!resultadoEnvio.exito) {
        console.error('Error enviando mensaje externo:', resultadoEnvio.error);
        // Actualizar el mensaje con estado de error
        await supabase
          .from('mensajes_conversacion')
          .update({
            metadata: {
              ...mensaje.metadata,
              estado_envio: 'error',
              error_envio: resultadoEnvio.error
            }
          })
          .eq('id', mensajeGuardado.id);
      } else {
        // Actualizar el mensaje con estado de éxito
        await supabase
          .from('mensajes_conversacion')
          .update({
            metadata: {
              ...mensaje.metadata,
              estado_envio: 'enviado',
              resultado_envio: resultadoEnvio.metadata
            }
          })
          .eq('id', mensajeGuardado.id);
      }
    } catch (error) {
      console.error('Error enviando mensaje externo:', error);
      // Actualizar el mensaje con estado de error
      await supabase
        .from('mensajes_conversacion')
        .update({
          metadata: {
            ...mensaje.metadata,
            estado_envio: 'error',
            error_envio: error instanceof Error ? error.message : 'Error desconocido'
          }
        })
        .eq('id', mensajeGuardado.id);
    }

    return NextResponse.json({
      success: true,
      mensaje: mensajeGuardado,
      envio: resultadoEnvio
    }, { status: 200 });

  } catch (error) {
    console.error('Error enviando mensaje:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({
      error: errorMessage
    }, { status });
  }
}

