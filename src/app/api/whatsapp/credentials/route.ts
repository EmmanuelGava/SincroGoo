import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, sessionId, credentials } = body;

    if (action === 'save') {
      // Guardar credenciales en la base de datos
      const { error } = await supabase
        .from('whatsapp_lite_sessions')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          credentials: credentials,
          status: 'active',
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ [API Credentials] Error guardando en BD:', error);
        return NextResponse.json({ error: 'Error guardando credenciales' }, { status: 500 });
      }

      console.log('✅ [API Credentials] Credenciales guardadas en BD');
      return NextResponse.json({ success: true });
    }

    if (action === 'load') {
      // Cargar credenciales de la base de datos
      const { data, error } = await supabase
        .from('whatsapp_lite_sessions')
        .select('credentials, session_id, updated_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log('📭 [API Credentials] No hay credenciales en BD');
        return NextResponse.json({ credentials: null });
      }

      console.log('✅ [API Credentials] Credenciales cargadas de BD');
      return NextResponse.json({ 
        credentials: data.credentials,
        sessionId: data.session_id,
        updatedAt: data.updated_at
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('❌ [API Credentials] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}