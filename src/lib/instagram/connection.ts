import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshInstagramToken } from './api';

export type InstagramConnection = {
  id: string;
  usuarioId: string;
  organizacionId: string | null;
  igUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: string | null;
  tokenRefreshedAt: string | null;
};

type Row = {
  id: string;
  usuario_id: string;
  organizacion_id: string | null;
  configuracion: Record<string, unknown> | null;
};

const SELECT = 'id, usuario_id, organizacion_id, configuracion';

/** Renovar cuando falten menos de 10 días; Meta exige que el token tenga al menos 24 h. */
const REFRESH_BEFORE_MS = 10 * 24 * 60 * 60 * 1000;
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

function toConnection(row: Row | null): InstagramConnection | null {
  const cfg = row?.configuracion || {};
  const igUserId = String(cfg.ig_user_id || '');
  const accessToken = String(cfg.access_token || '');
  if (!row || !igUserId || !accessToken) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    organizacionId: row.organizacion_id,
    igUserId,
    username: String(cfg.username || ''),
    accessToken,
    tokenExpiresAt: cfg.token_expires_at ? String(cfg.token_expires_at) : null,
    tokenRefreshedAt: cfg.token_refreshed_at ? String(cfg.token_refreshed_at) : null,
  };
}

export async function getInstagramConnectionByIgUserId(
  supabase: SupabaseClient,
  igUserId: string
): Promise<InstagramConnection | null> {
  const { data } = await supabase
    .from('configuracion_mensajeria_usuario')
    .select(SELECT)
    .eq('plataforma', 'instagram')
    .eq('activa', true)
    .filter('configuracion->>ig_user_id', 'eq', igUserId)
    .limit(1)
    .maybeSingle();
  return toConnection(data as Row | null);
}

export async function getInstagramConnectionByOrg(
  supabase: SupabaseClient,
  organizacionId: string
): Promise<InstagramConnection | null> {
  const { data } = await supabase
    .from('configuracion_mensajeria_usuario')
    .select(SELECT)
    .eq('plataforma', 'instagram')
    .eq('activa', true)
    .eq('organizacion_id', organizacionId)
    .order('fecha_actualizacion', { ascending: false })
    .limit(1)
    .maybeSingle();
  return toConnection(data as Row | null);
}

export async function saveInstagramConnection(
  supabase: SupabaseClient,
  input: {
    usuarioId: string;
    organizacionId: string;
    igUserId: string;
    username: string;
    name: string | null;
    profilePictureUrl: string | null;
    accessToken: string;
    tokenExpiresAt: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const configuracion = {
    ig_user_id: input.igUserId,
    username: input.username,
    name: input.name,
    profile_picture_url: input.profilePictureUrl,
    access_token: input.accessToken,
    token_expires_at: input.tokenExpiresAt,
    token_refreshed_at: now,
    tipo_conexion: 'instagram',
  };

  await supabase
    .from('configuracion_mensajeria_usuario')
    .update({ activa: false, fecha_actualizacion: now })
    .eq('plataforma', 'instagram')
    .filter('configuracion->>ig_user_id', 'eq', input.igUserId)
    .neq('organizacion_id', input.organizacionId);

  const { data: existing } = await supabase
    .from('configuracion_mensajeria_usuario')
    .select('id')
    .eq('plataforma', 'instagram')
    .eq('organizacion_id', input.organizacionId)
    .limit(1)
    .maybeSingle();

  const row = {
    usuario_id: input.usuarioId,
    organizacion_id: input.organizacionId,
    plataforma: 'instagram',
    nombre_configuracion: `Instagram @${input.username}`,
    descripcion: 'Instagram DM',
    activa: true,
    configuracion,
    fecha_actualizacion: now,
  };

  const { error } = existing?.id
    ? await supabase.from('configuracion_mensajeria_usuario').update(row).eq('id', existing.id)
    : await supabase.from('configuracion_mensajeria_usuario').insert({ ...row, fecha_creacion: now });
  if (error) throw error;
}

export async function disconnectInstagram(supabase: SupabaseClient, organizacionId: string): Promise<void> {
  const { error } = await supabase
    .from('configuracion_mensajeria_usuario')
    .delete()
    .eq('plataforma', 'instagram')
    .eq('organizacion_id', organizacionId);
  if (error) throw error;
}

export function needsInstagramTokenRefresh(conn: InstagramConnection, now: number = Date.now()): boolean {
  if (!conn.tokenExpiresAt) return false;
  const expires = new Date(conn.tokenExpiresAt).getTime();
  const refreshed = conn.tokenRefreshedAt ? new Date(conn.tokenRefreshedAt).getTime() : 0;
  return expires - now < REFRESH_BEFORE_MS && now - refreshed > MIN_TOKEN_AGE_MS;
}

/** Devuelve un token vigente; si está por vencer lo renueva y lo guarda. */
export async function ensureFreshInstagramToken(
  supabase: SupabaseClient,
  conn: InstagramConnection
): Promise<string> {
  if (!needsInstagramTokenRefresh(conn)) return conn.accessToken;
  try {
    const fresh = await refreshInstagramToken(conn.accessToken);
    const { data } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('configuracion')
      .eq('id', conn.id)
      .maybeSingle();
    await supabase
      .from('configuracion_mensajeria_usuario')
      .update({
        configuracion: {
          ...((data?.configuracion as Record<string, unknown>) || {}),
          access_token: fresh.accessToken,
          token_expires_at: fresh.expiresAt,
          token_refreshed_at: new Date().toISOString(),
        },
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', conn.id);
    return fresh.accessToken;
  } catch (error) {
    console.warn('⚠️ No se pudo renovar el token de Instagram:', error);
    return conn.accessToken;
  }
}
