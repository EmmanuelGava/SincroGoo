import { NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { buildInstagramAuthorizeUrl, getInstagramEnv } from '@/lib/instagram/api';
import { createOAuthState } from '@/lib/integrations/oauthState';

export async function GET() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (ctx.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden conectar Instagram' }, { status: 403 });
  }

  const env = getInstagramEnv();
  const secret = process.env.NEXTAUTH_SECRET || '';
  if (!env || !secret) {
    return NextResponse.json(
      { error: 'Falta configurar INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET en el servidor' },
      { status: 503 }
    );
  }

  const state = createOAuthState(
    { proveedor: 'instagram', usuarioId: ctx.usuarioId, organizacionId: ctx.organizacionId },
    secret
  );
  return NextResponse.json({ url: buildInstagramAuthorizeUrl(env, state) });
}
