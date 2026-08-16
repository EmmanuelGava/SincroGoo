import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liteConnect, liteDisconnect, liteReset, liteSend, liteStatus } from '@/lib/whatsapp/workerClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action, type, ...data } = await request.json();

    switch (action) {
      case 'connect':
        return await handleConnect(type, data, session.user.id);

      case 'disconnect':
        return await handleDisconnect(type, session.user.id);

      case 'reset':
        return await handleReset(type, session.user.id);

      case 'status':
        return await handleStatus(type, session.user.id);

      case 'send':
        return await handleSend(type, data, session.user.id);

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error en endpoint unificado de WhatsApp:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function handleConnect(type: 'lite' | 'business', data: any, userId: string) {
  if (type === 'lite') {
    const result = await liteConnect(userId);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (type === 'business') {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/oauth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return NextResponse.json(await response.json());
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleDisconnect(type: 'lite' | 'business', userId: string) {
  if (type === 'lite') {
    const result = await liteDisconnect(userId);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (type === 'business') {
    return NextResponse.json({ success: true, message: 'WhatsApp Business desconectado' });
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleReset(type: 'lite' | 'business', userId: string) {
  if (type === 'lite') {
    const result = await liteReset(userId);
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleStatus(type: 'lite' | 'business', userId: string) {
  if (type === 'lite') {
    const result = await liteStatus(userId);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (type === 'business') {
    return NextResponse.json({
      success: true,
      data: { connected: false, type: 'business' },
    });
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleSend(type: 'lite' | 'business', data: any, userId: string) {
  const { to, message } = data;

  if (type === 'lite') {
    if (!to || !message) {
      return NextResponse.json({ error: 'to y message requeridos' }, { status: 400 });
    }
    const result = await liteSend(userId, String(to), String(message));
    return NextResponse.json(result.body, { status: result.status });
  }

  if (type === 'business') {
    return NextResponse.json({ error: 'WhatsApp Business no implementado aún' }, { status: 501 });
  }

  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}
