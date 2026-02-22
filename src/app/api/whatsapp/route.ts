import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Endpoint unificado para WhatsApp (Lite y Business)
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
    try {
      // Conectar WhatsApp Lite
      const { whatsappLiteServiceV2 } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2');
      console.log('🔗 [API] Intentando conectar WhatsApp Lite V2 para usuario:', userId);
      
      const result = await whatsappLiteServiceV2.connect(userId);
      console.log('✅ [API] WhatsApp Lite conectado exitosamente');
      console.log('📡 [API] Resultado devuelto:', JSON.stringify(result, null, 2));
      
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      console.error('❌ [API] Error conectando WhatsApp Lite:', error);
      console.error('❌ [API] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Proporcionar más detalles del error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorDetails = {
        message: errorMessage,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(
        { 
          error: 'Error conectando WhatsApp Lite', 
          details: errorMessage,
          debug: errorDetails
        }, 
        { status: 500 }
      );
    }
  } else if (type === 'business') {
    // Conectar WhatsApp Business (usar OAuth existente)
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/oauth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return NextResponse.json(await response.json());
  }
  
  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleDisconnect(type: 'lite' | 'business', userId: string) {
  if (type === 'lite') {
    const { whatsappLiteServiceV2 } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2');
    await whatsappLiteServiceV2.disconnect();
    return NextResponse.json({ success: true, message: 'WhatsApp Lite desconectado' });
  } else if (type === 'business') {
    // TODO: Implementar desconexión de Business
    return NextResponse.json({ success: true, message: 'WhatsApp Business desconectado' });
  }
  
  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleStatus(type: 'lite' | 'business', userId: string) {
  if (type === 'lite') {
    const { whatsappLiteServiceV2 } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2');
    const status = whatsappLiteServiceV2.getState();
    return NextResponse.json({ success: true, data: status });
  } else if (type === 'business') {
    // TODO: Implementar verificación de estado de Business
    return NextResponse.json({ 
      success: true, 
      data: { connected: false, type: 'business' } 
    });
  }
  
  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
}

async function handleSend(type: 'lite' | 'business', data: any, userId: string) {
  const { to, message, messageType = 'text' } = data;
  
  if (type === 'lite') {
    const { whatsappLiteServiceV2 } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2');
    // TODO: Implementar sendMessage en V2
    const success = false; // Temporalmente deshabilitado
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Mensaje enviado via WhatsApp Lite' });
    } else {
      return NextResponse.json({ error: 'Error enviando mensaje' }, { status: 500 });
    }
  } else if (type === 'business') {
    // TODO: Implementar envío via Business API
    return NextResponse.json({ error: 'WhatsApp Business no implementado aún' }, { status: 501 });
  }
  
  return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
} 