import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { botToken } = await req.json();

    if (!botToken) {
      return NextResponse.json({
        error: 'Token del bot es requerido'
      }, { status: 400 });
    }

    // Probar el bot con la API de Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      return NextResponse.json({
        error: 'Token inválido o bot no encontrado'
      }, { status: 400 });
    }

    const botInfo = data.result;

    return NextResponse.json({
      success: true,
      username: botInfo.username,
      first_name: botInfo.first_name,
      id: botInfo.id,
      can_join_groups: botInfo.can_join_groups,
      can_read_all_group_messages: botInfo.can_read_all_group_messages,
      supports_inline_queries: botInfo.supports_inline_queries
    });

  } catch (error) {
    console.error('Error testing Telegram bot:', error);
    return NextResponse.json({
      error: 'Error verificando el bot'
    }, { status: 500 });
  }
}