import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { processInstagramEvent } from '@/lib/instagram/incoming';
import { parseInstagramWebhook, verifyInstagramSignature } from '@/lib/instagram/webhook';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || '';
  if (
    verifyToken
    && params.get('hub.mode') === 'subscribe'
    && params.get('hub.verify_token') === verifyToken
  ) {
    return new NextResponse(params.get('hub.challenge') || '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  if (!verifyInstagramSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const events = parseInstagramWebhook(body);
  const supabase = getSupabaseAdmin();
  let failed = 0;
  for (const event of events) {
    try {
      await processInstagramEvent(supabase, event);
    } catch (error) {
      failed += 1;
      console.error('❌ Error procesando DM de Instagram:', event.mid, error);
    }
  }

  // 500 hace que Meta reintente; los ya guardados se deduplican por id.
  if (failed > 0) {
    return NextResponse.json({ ok: false, failed }, { status: 500 });
  }
  return NextResponse.json({ ok: true, processed: events.length });
}
