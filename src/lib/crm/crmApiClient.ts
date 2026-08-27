import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';

/**
 * CRM server routes: auth vía NextAuth + filtro por usuario_id.
 * Service role evita RLS vacío cuando hay supabaseToken en sesión.
 */
export async function getCrmApiClient(): Promise<{
  supabase: SupabaseClient;
  userId: string;
} | null> {
  const userId = await getUsuarioIdFromSession();
  if (!userId) return null;
  return { supabase: getSupabaseAdmin(), userId };
}
