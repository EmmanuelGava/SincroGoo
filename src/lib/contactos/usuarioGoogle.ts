import type { SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_ID_SAFE = /^[a-zA-Z0-9_-]+$/;

/**
 * Cruce único conversación.usuario_id (Google ID) → usuarios.id (UUID).
 * Rechaza IDs que no sean [a-zA-Z0-9_-]+ para no inyectar en `.or()`.
 */
export async function usuarioUuidFromGoogleId(
  supabase: SupabaseClient,
  googleId: string | null | undefined
): Promise<string | null> {
  if (!googleId || !GOOGLE_ID_SAFE.test(googleId)) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .or(`google_id.eq.${googleId},auth_id.eq.${googleId}`)
    .maybeSingle();
  return data?.id ?? null;
}
