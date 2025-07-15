import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Verificación del webhook (requerido por Meta)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook de WhatsApp verificado correctamente');
        return new Response(challenge, { status: 200 });
    } else {
        console.error('❌ Error verificando webhook de WhatsApp');
        return new Response('Forbidden', { status: 403 });
    }
}

// Recepción de mensajes de WhatsApp
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('📩 Webhook recibido de WhatsApp:', JSON.stringify(body, null, 2));

        // Verificar que es una notificación de WhatsApp
        if (body.object !== 'whatsapp_business_account') {
            return NextResponse.json({ status: 'ignored' });
        }

        // Procesar cada entrada
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field === 'messages') {
                    await procesarMensajesWhatsApp(change.value);
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Error procesando webhook de WhatsApp:', error);
        return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
    }
}

async function procesarMensajesWhatsApp(value: any) {
    const { messages, contacts } = value;

    if (!messages || messages.length === 0) {
        return;
    }

    for (const message of messages) {
        try {
            // Solo procesar mensajes entrantes (no los que enviamos nosotros)
            if (message.type === 'text' && message.from) {
                const mensajeNormalizado = {
                    remitente: message.from,
                    contenido: message.text?.body || '',
                    fecha_mensaje: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                    servicio_origen: 'whatsapp',
                    metadata: {
                        message_id: message.id,
                        contact_name: contacts?.find((c: any) => c.wa_id === message.from)?.profile?.name,
                        message_type: message.type
                    }
                };

                await guardarMensajeWhatsApp(mensajeNormalizado);
            }
        } catch (error) {
            console.error('Error procesando mensaje individual de WhatsApp:', error);
        }
    }
}

async function guardarMensajeWhatsApp(mensaje: any) {
    try {
        // 1. Buscar o crear conversación
        const { data: conversacionExistente } = await supabase
            .from('conversaciones')
            .select('id, lead_id')
            .eq('remitente', mensaje.remitente)
            .eq('servicio_origen', 'whatsapp')
            .order('fecha_mensaje', { ascending: false })
            .limit(1)
            .single();

        let conversacionId;
        if (conversacionExistente) {
            conversacionId = conversacionExistente.id;
            // Actualizar fecha del último mensaje
            await supabase
                .from('conversaciones')
                .update({ fecha_mensaje: mensaje.fecha_mensaje })
                .eq('id', conversacionId);
        } else {
            // Crear nueva conversación
            const { data: nuevaConversacion, error: errorConversacion } = await supabase
                .from('conversaciones')
                .insert({
                    lead_id: null,
                    servicio_origen: 'whatsapp',
                    tipo: 'entrante',
                    remitente: mensaje.remitente,
                    fecha_mensaje: mensaje.fecha_mensaje,
                    metadata: mensaje.metadata
                })
                .select('id')
                .single();

            if (errorConversacion) {
                throw errorConversacion;
            }
            conversacionId = nuevaConversacion.id;
        }

        // 2. Guardar el mensaje
        const { error: errorMensaje } = await supabase
            .from('mensajes_conversacion')
            .insert({
                conversacion_id: conversacionId,
                tipo: 'texto',
                contenido: mensaje.contenido,
                remitente: mensaje.remitente,
                fecha_mensaje: mensaje.fecha_mensaje,
                canal: 'whatsapp',
                metadata: mensaje.metadata,
                usuario_id: null
            });

        if (errorMensaje) {
            throw errorMensaje;
        }

        console.log('✅ Mensaje de WhatsApp guardado correctamente');
    } catch (error) {
        console.error('Error guardando mensaje de WhatsApp:', error);
        throw error;
    }
}