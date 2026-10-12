import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { processMlQuestionNotification } from '@/lib/mercadolibre/incoming';
import { parseMlQuestionNotification } from '@/lib/mercadolibre/notification';

export const runtime = 'nodejs';

/**
 * ML no firma las notificaciones: solo se usan como aviso. La pregunta se
 * lee con el token del vendedor conectado, que es la fuente de verdad.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const notification = parseMlQuestionNotification(body);
  const appId = process.env.MERCADOLIBRE_APP_ID || '';

  if (notification && appId && notification.applicationId === appId) {
    waitUntil(
      processMlQuestionNotification(getSupabaseAdmin(), notification).catch((error) => {
        console.error('❌ Error procesando pregunta de Mercado Libre:', notification.questionId, error);
      })
    );
  }

  // ML exige 200 en menos de 500 ms; los reintentos se deduplican por id.
  return NextResponse.json({ ok: true });
}
