import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liteConnect, liteStatus } from '@/lib/whatsapp/workerClient';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const status = await liteStatus(session.user.id);
    const data = (status.body.data || {}) as { connected?: boolean };
    if (data.connected) {
      return NextResponse.json({
        success: true,
        message: 'Ya está conectado',
        status: data,
      });
    }

    const qrData = await liteConnect(session.user.id);
    return NextResponse.json({
      success: qrData.body.success !== false,
      message: 'Reconexión iniciada',
      qrData: qrData.body.data,
      status: (qrData.body.data || {}) as Record<string, unknown>,
      error: qrData.body.error,
    }, { status: qrData.status });
  } catch (error) {
    console.error('❌ [API] Error en reconexión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en reconexión',
      details: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await liteStatus(session.user.id);
    const data = (result.body.data || {}) as { connected?: boolean };
    return NextResponse.json({
      success: true,
      status: data,
      needsReconnection: !data.connected,
    });
  } catch (error) {
    console.error('❌ [API] Error obteniendo estado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado',
    }, { status: 500 });
  }
}
