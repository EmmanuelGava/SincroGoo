import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { botToken } = await req.json();

    if (!botToken) {
      return NextResponse.json({
        error: 'Token del bot es requerido'
      }, { status: 400 });
    }

    // URL del webhook
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/integrations/incoming/telegram`;

    // Configurar webhook en Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error('Error setting webhook:', data);
      return NextResponse.json({
        error: 'Error configurando webhook'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      webhook_url: webhookUrl,
      description: data.description
    });

  } catch (error) {
    console.error('Error setting up Telegram webhook:', error);
    return NextResponse.json({
      error: 'Error configurando webhook'
    }, { status: 500 });
  }
}