import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type ScheduledOutboxRow = {
  id: string;
  conversacion_id?: string | null;
  contenido?: string | null;
  message_type?: string | null;
  status?: string | null;
  next_attempt_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const conversacionId = request.nextUrl.searchParams.get('conversacion_id');
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('whatsapp_outbox' as never)
      .select('id, conversacion_id, contenido, message_type, status, next_attempt_at, metadata, created_at')
      .eq('usuario_id', session.user.id)
      .in('status', ['queued'])
      .order('next_attempt_at', { ascending: true });

    if (conversacionId) {
      query = query.eq('conversacion_id', conversacionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const now = Date.now();
    const rows = (data || []) as ScheduledOutboxRow[];
    const scheduled = rows.filter((row) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      const at = new Date(String(row.next_attempt_at || 0)).getTime();
      return meta.scheduled_by_user === true && at > now;
    });

    return NextResponse.json({ scheduled });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('whatsapp_outbox' as never)
      .select('id, status, metadata')
      .eq('id', id)
      .eq('usuario_id', session.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    const outboxRow = row as { id: string; status?: string; metadata?: Record<string, unknown> } | null;
    if (!outboxRow) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    if (outboxRow.status === 'sending') {
      return NextResponse.json({ error: 'El mensaje ya se está enviando' }, { status: 409 });
    }
    const meta = outboxRow.metadata && typeof outboxRow.metadata === 'object' ? outboxRow.metadata : {};
    if (meta.scheduled_by_user !== true) {
      return NextResponse.json({ error: 'Solo se pueden cancelar envíos programados' }, { status: 400 });
    }

    const { error, count } = await supabase
      .from('whatsapp_outbox' as never)
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('usuario_id', session.user.id)
      .eq('status', 'queued');

    if (error) throw error;
    if (!count) {
      return NextResponse.json({ error: 'No se pudo cancelar (ya enviado o en curso)' }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
