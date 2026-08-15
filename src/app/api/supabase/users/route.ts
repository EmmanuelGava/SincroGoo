import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

/**
 * GET /api/supabase/users
 * Devuelve el perfil del usuario de la sesión. Ignora auth_id del query.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nombre, auth_id')
      .eq('auth_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ user });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
