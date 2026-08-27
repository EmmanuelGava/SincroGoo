import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

/** Marca seguimiento A8 como atendido hasta el próximo mensaje entrante. */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const conversacionId = params.id;
    const now = new Date().toISOString();

    const { data: conv, error: fetchError } = await supabase
      .from('conversaciones')
      .select('id, metadata')
      .eq('id', conversacionId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const metadata = {
      ...(conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {}),
      seguimiento_dismissed_at: now,
    };

    const { error: updateError } = await supabase
      .from('conversaciones')
      .update({ metadata })
      .eq('id', conversacionId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, seguimiento_dismissed_at: now });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
