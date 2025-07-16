import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { messagingService } from '@/app/servicios/messaging';
import type { PlataformaMensajeria } from '@/app/servicios/messaging/types';

export async function POST(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { plataforma, contacto, nombre, mensaje, leadId, configuracionId } = await req.json();

    if (!plataforma || !contacto || !nombre || !mensaje) {
      return NextResponse.json({
        error: 'plataforma, contacto, nombre y mensaje son requeridos'
      }, { status: 400 });
    }

    // Validar plataforma
    const plataformasValidas: PlataformaMensajeria[] = ['telegram', 'whatsapp', 'email'];
    if (!plataformasValidas.includes(plataforma)) {
      return NextResponse.json({
        error: 'Plataforma no válida'
      }, { status: 400 });
    }

    // 1. Verificar si ya existe una conversación con este contacto en esta plataforma
    const { data: conversacionExistente, error: errorBusqueda } = await supabase
      .from('conversaciones')
      .select('id, remitente, servicio_origen, lead_id')
      .eq('remitente', contacto)
      .eq('servicio_origen', plataforma)
      .maybeSingle(); // Cambiar de .single() a .maybeSingle()

    console.log('Buscando conversación existente para:', { contacto, plataforma });
    console.log('Resultado búsqueda:', conversacionExistente);
    console.log('Error búsqueda:', errorBusqueda);

    if (conversacionExistente) {
      console.log('Conversación existente encontrada:', conversacionExistente);
      // TEMPORAL: Comentar para permitir conversaciones duplicadas durante pruebas
      /*
      return NextResponse.json({
        error: 'Ya existe una conversación con este contacto en esta plataforma',
        conversacion: conversacionExistente,
        debug: {
          contacto_buscado: contacto,
          plataforma_buscada: plataforma,
          conversacion_encontrada: conversacionExistente
        }
      }, { status: 409 });
      */
    }

    // 2. Crear nueva conversación
    const nuevaConversacion = {
      remitente: contacto,
      servicio_origen: plataforma,
      tipo: 'saliente', // Requerido por la tabla
      fecha_mensaje: new Date().toISOString(),
      lead_id: leadId || null,
      usuario_id: session.user.id, // Columna requerida
      metadata: {
        iniciada_por_usuario: true,
        nombre_contacto: nombre, // Guardamos el nombre en metadata
        estado: 'activa'
      }
    };

    console.log('Intentando crear conversación:', nuevaConversacion);
    console.log('Usuario autenticado:', session.user.id);

    const { data: conversacionCreada, error: errorConversacion } = await supabase
      .from('conversaciones')
      .insert(nuevaConversacion)
      .select()
      .single();

    if (errorConversacion) {
      console.error('Error creando conversación:', errorConversacion);
      console.error('Detalles del error:', JSON.stringify(errorConversacion, null, 2));
      
      return NextResponse.json({
        error: `Error creando conversación: ${errorConversacion.message}`,
        details: errorConversacion
      }, { status: 400 });
    }

    // 3. Enviar mensaje inicial usando el servicio de mensajería
    let resultadoEnvio = null;
    try {
      resultadoEnvio = await messagingService.enviarMensaje({
        plataforma: plataforma as PlataformaMensajeria,
        destinatario: contacto,
        contenido: mensaje.trim(),
        usuarioId: session.user.id, // Añadir ID del usuario para usar su configuración
        configuracionId: configuracionId // Añadir configuración específica seleccionada
      });

      if (!resultadoEnvio.exito) {
        console.error('Error enviando mensaje inicial:', resultadoEnvio.error);
        
        // Si falla el envío, eliminar la conversación creada
        await supabase
          .from('conversaciones')
          .delete()
          .eq('id', conversacionCreada.id);

        return NextResponse.json({
          error: `Error enviando mensaje: ${resultadoEnvio.error}`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error enviando mensaje inicial:', error);
      
      // Si falla el envío, eliminar la conversación creada
      await supabase
        .from('conversaciones')
        .delete()
        .eq('id', conversacionCreada.id);

      return NextResponse.json({
        error: 'Error enviando mensaje inicial'
      }, { status: 500 });
    }

    // 4. Guardar el mensaje inicial en la base de datos
    const mensajeInicial = {
      conversacion_id: conversacionCreada.id,
      tipo: 'texto',
      contenido: mensaje.trim(),
      remitente: contacto,
      fecha_mensaje: new Date().toISOString(),
      canal: plataforma,
      usuario_id: session.user.id, // Marcar como mensaje propio
      metadata: {
        estado_envio: 'enviado',
        resultado_envio: resultadoEnvio.metadata,
        mensaje_inicial: true
      }
    };

    const { data: mensajeGuardado, error: errorMensaje } = await supabase
      .from('mensajes_conversacion')
      .insert(mensajeInicial)
      .select()
      .single();

    if (errorMensaje) {
      console.warn('Error guardando mensaje inicial:', errorMensaje);
      // No fallar por esto, la conversación ya está creada y el mensaje enviado
    }

    // 5. Si hay leadId, crear una interacción
    if (leadId) {
      try {
        await supabase
          .from('interacciones_lead')
          .insert({
            lead_id: leadId,
            tipo: 'mensaje',
            descripcion: `Conversación iniciada por ${plataforma}: ${mensaje.substring(0, 100)}${mensaje.length > 100 ? '...' : ''}`,
            fecha: new Date().toISOString(),
            canal: plataforma,
            usuario_id: session.user.id,
            metadata: {
              conversacion_id: conversacionCreada.id,
              mensaje_id: mensajeGuardado?.id
            }
          });
      } catch (error) {
        console.warn('Error creando interacción del lead:', error);
        // No fallar por esto
      }
    }

    // 6. Preparar respuesta con formato esperado por el frontend
    const conversacionRespuesta = {
      id: conversacionCreada.id,
      remitente: conversacionCreada.remitente,
      servicio_origen: conversacionCreada.servicio_origen,
      fecha_mensaje: conversacionCreada.fecha_mensaje,
      lead_id: conversacionCreada.lead_id,
      ultimo_mensaje: mensaje.trim(),
      metadata: conversacionCreada.metadata
    };

    return NextResponse.json({
      success: true,
      conversacion: conversacionRespuesta,
      mensaje: mensajeGuardado,
      envio: resultadoEnvio
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando nueva conversación:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({
      error: errorMessage
    }, { status });
  }
}