import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Número de teléfono requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // Limpiar el número de teléfono
    const cleanPhoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
    
    console.log('🔍 Verificando conexiones activas para:', cleanPhoneNumber);
    
    // Buscar conexiones activas
    const { data: activeConnections, error } = await supabase
      .from('whatsapp_lite_sessions')
      .select(`
        id,
        usuario_id,
        session_id,
        phone_number,
        status,
        last_activity,
        created_at,
        usuarios!inner(
          email,
          nombre
        )
      `)
      .eq('status', 'connected')
      .or(`phone_number.eq.${cleanPhoneNumber},phone_number.eq.${phoneNumber}`);
    
    if (error) {
      console.error('❌ Error verificando conexiones:', error);
      return NextResponse.json({ error: 'Error verificando conexiones' }, { status: 500 });
    }
    
    const hasActiveConnections = activeConnections && activeConnections.length > 0;
    
    if (hasActiveConnections) {
      console.log('⚠️ Conexiones activas encontradas:', activeConnections.length);
      
      return NextResponse.json({
        success: true,
        hasActiveConnections: true,
        activeConnections: activeConnections.map(conn => {
          const u = Array.isArray(conn.usuarios) ? conn.usuarios[0] : conn.usuarios;
          return {
            sessionId: conn.session_id,
            phoneNumber: conn.phone_number,
            status: conn.status,
            lastActivity: conn.last_activity,
            createdAt: conn.created_at,
            user: {
              email: (u as { email?: string } | null)?.email,
              nombre: (u as { nombre?: string } | null)?.nombre
            }
          };
        }),
        message: `El número ${cleanPhoneNumber} tiene ${activeConnections.length} conexión(es) activa(s)`
      });
    } else {
      console.log('✅ No hay conexiones activas para el número');
      
      return NextResponse.json({
        success: true,
        hasActiveConnections: false,
        activeConnections: [],
        message: `El número ${cleanPhoneNumber} está disponible`
      });
    }

  } catch (error) {
    console.error('❌ Error en verificación de número:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { phoneNumber, force = false } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Número de teléfono requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // Limpiar el número de teléfono
    const cleanPhoneNumber = phoneNumber.replace('@s.whatsapp.net', '');
    
    console.log('🔌 Desconectando conexiones del número:', cleanPhoneNumber);
    
    if (force) {
      // Desconectar todas las conexiones del número
      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .update({ 
          status: 'disconnected',
          last_activity: new Date().toISOString()
        })
        .or(`phone_number.eq.${cleanPhoneNumber},phone_number.eq.${phoneNumber}`)
        .eq('status', 'connected');
      
      if (error) {
        console.error('❌ Error desconectando sesiones:', error);
        return NextResponse.json({ error: 'Error desconectando sesiones' }, { status: 500 });
      }
      
      console.log('✅ Todas las conexiones del número han sido desconectadas');
      
      return NextResponse.json({
        success: true,
        message: `Todas las conexiones del número ${cleanPhoneNumber} han sido desconectadas`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Usa force=true para desconectar las sesiones existentes'
      });
    }

  } catch (error) {
    console.error('❌ Error desconectando número:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    );
  }
}