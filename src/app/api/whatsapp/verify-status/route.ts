import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { liteStatus } from '@/lib/whatsapp/workerClient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await liteStatus(session.user.id);
    const data = (result.body.data || {}) as { connected?: boolean; phoneNumber?: string };

    return NextResponse.json({
      success: true,
      realStatus: {
        isReallyConnected: Boolean(data.connected),
        phoneNumber: data.phoneNumber,
      },
      reportedStatus: data,
      isConsistent: true,
      needsReconnection: !data.connected,
    }, { status: result.status === 503 ? 503 : 200 });
  } catch (error) {
    console.error('❌ [API] Error verificando estado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando estado',
      details: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}
