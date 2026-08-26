import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const conversacionId = params.id;
    if (!conversacionId) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const body = await req.json();
    if (typeof body.archived !== 'boolean') {
      return NextResponse.json({ error: 'archived (boolean) requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('conversaciones')
      .update({
        archived_at: body.archived ? new Date().toISOString() : null,
      })
      .eq('id', conversacionId)
      .select('id, archived_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      archived_at: data.archived_at,
    });
  } catch (error) {
    console.error('Error archivando conversación:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
