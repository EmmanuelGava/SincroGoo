import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/app/servicios/messaging';

export async function GET(req: NextRequest) {
  try {
    // Verificar si el bot está configurado
    const botInfo = await telegramService.obtenerInfoBot();
    const isActive = await telegramService.verificarBot();
    
    return NextResponse.json({
      success: true,
      bot: botInfo,
      active: isActive,
      message: 'Bot de Telegram configurado correctamente'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      message: 'Error verificando bot de Telegram'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chatId, message } = await req.json();
    
    if (!chatId || !message) {
      return NextResponse.json({
        success: false,
        error: 'chatId y message son requeridos'
      }, { status: 400 });
    }

    const result = await telegramService.enviarMensaje({
      chatId,
      text: message
    });

    return NextResponse.json({
      success: result.ok,
      result: result.result,
      error: result.description,
      message: result.ok ? 'Mensaje enviado correctamente' : 'Error enviando mensaje'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}