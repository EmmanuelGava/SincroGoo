import { NextRequest, NextResponse } from 'next/server';
import { whatsappLiteService } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Verificando y reconectando WhatsApp Lite...');
    
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el UUID de Supabase del usuario
    let userId = session.user.id;
    
    // Si es un ID de Google (numérico), necesitamos obtener el UUID de Supabase
    if (userId && /^\d+$/.test(userId)) {
      console.log('🔄 [Reconnect API] ID de Google detectado, obteniendo UUID de Supabase...');
      try {
        const supabase = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', userId)
          .single();
        
        if (userError) {
          console.error('❌ [Reconnect API] Error obteniendo UUID de Supabase:', userError);
          return NextResponse.json({
            error: 'Error obteniendo información del usuario'
          }, { status: 500 });
        }
        
        if (userData) {
          userId = userData.id;
          console.log('✅ [Reconnect API] UUID de Supabase obtenido:', userId);
        }
      } catch (error) {
        console.error('❌ [Reconnect API] Error en consulta de usuario:', error);
        return NextResponse.json({
          error: 'Error obteniendo información del usuario'
        }, { status: 500 });
      }
    }
    
    // Restaurar estado desde la base de datos
    if (userId) {
      await whatsappLiteService.restoreStateFromDatabase(userId);
    }
    
    // Verificar estado actual
    const currentStatus = whatsappLiteService.getConnectionStatus();
    console.log('📊 Estado actual:', currentStatus);
    
    if (currentStatus.connected) {
      console.log('✅ WhatsApp Lite ya está conectado');
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite ya está conectado',
        status: currentStatus,
        action: 'none'
      });
    }
    
    // Si no está conectado, intentar reconectar
    console.log('🔄 WhatsApp Lite no está conectado, intentando reconectar...');
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no identificado' }, { status: 400 });
    }
    
    try {
      const qrData = await whatsappLiteService.connect(userId);
      
      if (qrData.qrCode) {
        // Necesita QR code
        return NextResponse.json({
          success: true,
          message: 'QR Code generado para reconexión',
          qrCode: qrData.qrCode,
          sessionId: qrData.sessionId,
          expiresAt: qrData.expiresAt,
          action: 'qr_needed'
        });
      } else {
        // Reconexión exitosa
        const newStatus = whatsappLiteService.getConnectionStatus();
        return NextResponse.json({
          success: true,
          message: 'WhatsApp Lite reconectado exitosamente',
          status: newStatus,
          action: 'reconnected'
        });
      }
    } catch (error) {
      console.error('❌ Error en reconexión:', error);
      return NextResponse.json({
        success: false,
        error: 'Error reconectando WhatsApp Lite',
        details: error instanceof Error ? error.message : 'Error desconocido',
        action: 'failed'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error verificando estado de WhatsApp Lite:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error verificando estado de WhatsApp Lite',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 