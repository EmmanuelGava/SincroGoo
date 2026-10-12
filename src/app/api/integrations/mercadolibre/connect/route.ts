import { NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { createOAuthState } from '@/lib/integrations/oauthState';
import { buildMlAuthorizeUrl, getMlEnv } from '@/lib/mercadolibre/api';

export async function GET() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (ctx.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden conectar Mercado Libre' }, { status: 403 });
  }

  const env = getMlEnv();
  const secret = process.env.NEXTAUTH_SECRET || '';
  if (!env || !secret) {
    return NextResponse.json(
      { error: 'Falta configurar MERCADOLIBRE_APP_ID / MERCADOLIBRE_CLIENT_SECRET en el servidor' },
      { status: 503 }
    );
  }

  const state = createOAuthState(
    { proveedor: 'mercadolibre', usuarioId: ctx.usuarioId, organizacionId: ctx.organizacionId },
    secret
  );
  return NextResponse.json({ url: buildMlAuthorizeUrl(env, state) });
}
