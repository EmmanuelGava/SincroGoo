import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { liteConnect, liteStatus } from '@/lib/whatsapp/workerClient';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const current = await liteStatus(userId);
    const status = (current.body.data || {}) as { connected?: boolean; qrCode?: string };

    if (status.connected) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite ya está conectado',
        status,
        action: 'none',
      });
    }

    const qrData = await liteConnect(userId);
    const data = (qrData.body.data || {}) as { connected?: boolean; qrCode?: string; sessionId?: string };

    if (data.qrCode && !data.connected) {
      return NextResponse.json({
        success: true,
        message: 'QR Code generado para reconexión',
        qrCode: data.qrCode,
        sessionId: data.sessionId,
        action: 'qr_needed',
      });
    }

    if (data.connected) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite reconectado exitosamente',
        status: data,
        action: 'reconnected',
      });
    }

    return NextResponse.json({
      success: qrData.body.success !== false,
      message: String(qrData.body.error || 'Reconexión iniciada'),
      status: data,
      action: data.connected ? 'reconnected' : 'qr_needed',
    }, { status: qrData.status === 503 ? 503 : 200 });
  } catch (error) {
    console.error('❌ Error en reconexión:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error reconectando',
    }, { status: 500 });
  }
}
