import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/app/servicios/messaging';

export async function GET(req: NextRequest) {
  try {
    // Verificar si WhatsApp está configurado
    const isConfigured = await whatsappService.verificarConfiguracion();
    
    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp no está configurado correctamente',
        message: 'Verifica las variables de entorno WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID',
        configured: false
      }, { status: 400 });
    }

    // Obtener información del número
    const phoneInfo = await whatsappService.obtenerInfoNumero();
    
    return NextResponse.json({
      success: true,
      phoneInfo,
      configured: true,
      message: 'WhatsApp Business API configurado correctamente'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      message: 'Error verificando WhatsApp Business API',
      configured: false
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();
    
    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: 'Los campos "to" y "message" son requeridos'
      }, { status: 400 });
    }

    // Validar formato del número
    const numeroFormateado = whatsappService.formatearNumero(to);
    if (!whatsappService.validarNumero(numeroFormateado)) {
      return NextResponse.json({
        success: false,
        error: `Número de WhatsApp inválido: ${to}. Debe ser un número internacional sin + (ej: 5491123456789)`
      }, { status: 400 });
    }

    const result = await whatsappService.enviarMensaje({
      to: numeroFormateado,
      text: message,
      type: 'text'
    });

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error.message,
        details: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result: {
        contacts: result.contacts,
        messages: result.messages
      },
      message: 'Mensaje enviado correctamente a WhatsApp'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}