import type { SupabaseClient } from '@supabase/supabase-js';
import { getMlEnv, refreshMlToken } from './api';

export type MlConnection = {
  id: string;
  usuarioId: string;
  organizacionId: string | null;
  mlUserId: string;
  nickname: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
};

type Row = {
  id: string;
  usuario_id: string;
  organizacion_id: string | null;
  configuracion: Record<string, unknown> | null;
};

const SELECT = 'id, usuario_id, organizacion_id, configuracion';
const TABLE = 'configuracion_mensajeria_usuario';
const REFRESH_BEFORE_MS = 10 * 60 * 1000;

function toConnection(row: Row | null): MlConnection | null {
  const cfg = row?.configuracion || {};
  const mlUserId = String(cfg.ml_user_id || '');
  const accessToken = String(cfg.access_token || '');
  if (!row || !mlUserId || !accessToken) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    organizacionId: row.organizacion_id,
    mlUserId,
    nickname: String(cfg.nickname || ''),
    accessToken,
    refreshToken: cfg.refresh_token ? String(cfg.refresh_token) : null,
    tokenExpiresAt: cfg.token_expires_at ? String(cfg.token_expires_at) : null,
  };
}

export async function getMlConnectionBySeller(supabase: SupabaseClient, mlUserId: string) {
  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('plataforma', 'mercadolibre')
    .eq('activa', true)
    .filter('configuracion->>ml_user_id', 'eq', mlUserId)
    .limit(1)
    .maybeSingle();
  return toConnection(data as Row | null);
}

export async function getMlConnectionByOrg(supabase: SupabaseClient, organizacionId: string) {
  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('plataforma', 'mercadolibre')
    .eq('activa', true)
    .eq('organizacion_id', organizacionId)
    .order('fecha_actualizacion', { ascending: false })
    .limit(1)
    .maybeSingle();
  return toConnection(data as Row | null);
}

export async function saveMlConnection(
  supabase: SupabaseClient,
  input: {
    usuarioId: string;
    organizacionId: string;
    mlUserId: string;
    nickname: string;
    siteId: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from(TABLE)
    .update({ activa: false, fecha_actualizacion: now })
    .eq('plataforma', 'mercadolibre')
    .filter('configuracion->>ml_user_id', 'eq', input.mlUserId)
    .neq('organizacion_id', input.organizacionId);

  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('plataforma', 'mercadolibre')
    .eq('organizacion_id', input.organizacionId)
    .limit(1)
    .maybeSingle();

  const row = {
    usuario_id: input.usuarioId,
    organizacion_id: input.organizacionId,
    plataforma: 'mercadolibre',
    nombre_configuracion: `Mercado Libre ${input.nickname}`,
    descripcion: 'Preguntas de Mercado Libre',
    activa: true,
    configuracion: {
      ml_user_id: input.mlUserId,
      nickname: input.nickname,
      site_id: input.siteId,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      token_expires_at: input.tokenExpiresAt,
      tipo_conexion: 'mercadolibre',
    },
    fecha_actualizacion: now,
  };

  const { error } = existing?.id
    ? await supabase.from(TABLE).update(row).eq('id', existing.id)
    : await supabase.from(TABLE).insert({ ...row, fecha_creacion: now });
  if (error) throw error;
}

export async function disconnectMl(supabase: SupabaseClient, organizacionId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('plataforma', 'mercadolibre')
    .eq('organizacion_id', organizacionId);
  if (error) throw error;
}

export function needsMlTokenRefresh(conn: MlConnection, now: number = Date.now()): boolean {
  if (!conn.tokenExpiresAt) return true;
  return new Date(conn.tokenExpiresAt).getTime() - now < REFRESH_BEFORE_MS;
}

/**
 * Token vigente del vendedor. El refresh token de ML es de un solo uso:
 * si otra request ya lo usó, se relee la fila y se toma el token nuevo.
 */
export async function ensureFreshMlToken(supabase: SupabaseClient, conn: MlConnection): Promise<string> {
  if (!needsMlTokenRefresh(conn)) return conn.accessToken;
  const env = getMlEnv();
  if (!env || !conn.refreshToken) return conn.accessToken;

  try {
    const fresh = await refreshMlToken(env, conn.refreshToken);
    const { data } = await supabase.from(TABLE).select('configuracion').eq('id', conn.id).maybeSingle();
    await supabase
      .from(TABLE)
      .update({
        configuracion: {
          ...((data?.configuracion as Record<string, unknown>) || {}),
          access_token: fresh.accessToken,
          refresh_token: fresh.refreshToken || conn.refreshToken,
          token_expires_at: fresh.expiresAt,
        },
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', conn.id);
    return fresh.accessToken;
  } catch (error) {
    const { data } = await supabase.from(TABLE).select(SELECT).eq('id', conn.id).maybeSingle();
    const reread = toConnection(data as Row | null);
    if (reread && reread.accessToken !== conn.accessToken && !needsMlTokenRefresh(reread)) {
      return reread.accessToken;
    }
    console.warn('⚠️ No se pudo renovar el token de Mercado Libre:', error);
    return conn.accessToken;
  }
}
