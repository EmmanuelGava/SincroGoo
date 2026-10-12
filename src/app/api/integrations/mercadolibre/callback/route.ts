import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { readOAuthState } from '@/lib/integrations/oauthState';
import { exchangeMlCode, getMlEnv, getMlMe } from '@/lib/mercadolibre/api';
import { saveMlConnection } from '@/lib/mercadolibre/connection';

function backTo(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/configuracion/mensajeria', request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get('error')) {
    return backTo(request, { mercadolibre: 'cancelado' });
  }

  const env = getMlEnv();
  const state = readOAuthState(params.get('state'), process.env.NEXTAUTH_SECRET || '', 'mercadolibre');
  const code = params.get('code');
  if (!env || !state || !code) {
    return backTo(request, { mercadolibre: 'error', motivo: 'Solicitud inválida o vencida. Probá de nuevo.' });
  }

  const ctx = await getOrganizacionContext();
  if (!ctx || ctx.rol !== 'admin' || ctx.organizacionId !== state.organizacionId || ctx.usuarioId !== state.usuarioId) {
    return backTo(request, { mercadolibre: 'error', motivo: 'La sesión no coincide con quien inició la conexión.' });
  }

  try {
    const tokens = await exchangeMlCode(env, code);
    const seller = await getMlMe(tokens.accessToken);
    await saveMlConnection(getSupabaseAdmin(), {
      usuarioId: ctx.usuarioId,
      organizacionId: ctx.organizacionId,
      mlUserId: seller.id,
      nickname: seller.nickname,
      siteId: seller.siteId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    });
    return backTo(request, { mercadolibre: 'conectado' });
  } catch (error) {
    console.error('❌ Error conectando Mercado Libre:', error);
    const motivo = error instanceof Error ? error.message : 'Error desconocido';
    return backTo(request, { mercadolibre: 'error', motivo: motivo.slice(0, 200) });
  }
}
