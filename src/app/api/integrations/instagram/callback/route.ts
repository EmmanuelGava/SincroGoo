import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  exchangeInstagramCode,
  getInstagramAccount,
  getInstagramEnv,
  getLongLivedInstagramToken,
  subscribeInstagramWebhooks,
} from '@/lib/instagram/api';
import { saveInstagramConnection } from '@/lib/instagram/connection';
import { readOAuthState } from '@/lib/integrations/oauthState';

function backTo(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/configuracion/mensajeria', request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get('error')) {
    return backTo(request, { instagram: 'cancelado' });
  }

  const env = getInstagramEnv();
  const state = readOAuthState(params.get('state'), process.env.NEXTAUTH_SECRET || '', 'instagram');
  const code = params.get('code');
  if (!env || !state || !code) {
    return backTo(request, { instagram: 'error', motivo: 'Solicitud inválida o vencida. Probá de nuevo.' });
  }

  const ctx = await getOrganizacionContext();
  if (!ctx || ctx.rol !== 'admin' || ctx.organizacionId !== state.organizacionId || ctx.usuarioId !== state.usuarioId) {
    return backTo(request, { instagram: 'error', motivo: 'La sesión no coincide con quien inició la conexión.' });
  }

  try {
    const shortToken = await exchangeInstagramCode(env, code);
    const longLived = await getLongLivedInstagramToken(env, shortToken);
    const account = await getInstagramAccount(longLived.accessToken);
    await subscribeInstagramWebhooks(longLived.accessToken);

    await saveInstagramConnection(getSupabaseAdmin(), {
      usuarioId: ctx.usuarioId,
      organizacionId: ctx.organizacionId,
      igUserId: account.igUserId,
      username: account.username,
      name: account.name,
      profilePictureUrl: account.profilePictureUrl,
      accessToken: longLived.accessToken,
      tokenExpiresAt: longLived.expiresAt,
    });

    return backTo(request, { instagram: 'conectado' });
  } catch (error) {
    console.error('❌ Error conectando Instagram:', error);
    const motivo = error instanceof Error ? error.message : 'Error desconocido';
    return backTo(request, { instagram: 'error', motivo: motivo.slice(0, 200) });
  }
}
