import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/chat/sendMessage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

/**
 * Endpoint de redirección temporal para compatibilidad
 * Redirige las llamadas del endpoint viejo al nuevo sistema unificado
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversacionId, contenido, canal, remitente, archivo } = await req.json();

    console.log('🔄 Redirigiendo llamada del endpoint viejo al nuevo sistema:', {
      conversacionId,
      canal,
      remitente,
      tieneArchivo: !!archivo
    });

    // Convertir formato viejo al nuevo formato unificado
    const messageType = archivo ? (archivo.tipo === 'audio' ? 'audio' : 'file') : 'text';
    const message = archivo ? `${archivo.tipo === 'audio' ? '🎤' : '📎'} ${archivo.nombre}` : contenido;

    // Usar la nueva arquitectura unificada
    const result = await sendMessage({
      platform: canal,
      to: remitente,
      message,
      messageType,
      filePath: archivo?.url,
      userId: session.user.id,
      metadata: {
        conversacion_id: conversacionId,
        original_canal: canal,
        migrated_from_old_endpoint: true,
        ...(archivo && {
          file_name: archivo.nombre,
          file_type: archivo.tipo,
          file_url: archivo.url
        })
      }
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Mensaje enviado exitosamente (migrado al nuevo sistema)',
        platformDetails: result.platformDetails
      });
    } else {
      return NextResponse.json({
        error: 'Error enviando mensaje',
        platformDetails: result.platformDetails
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error en endpoint de redirección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

