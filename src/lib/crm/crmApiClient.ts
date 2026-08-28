import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  getOrganizacionContext,
  type OrganizacionRol,
} from '@/lib/auth/getOrganizacionContext';

/**
 * CRM server routes: auth vía NextAuth + scope por organizacion_id.
 * Service role evita RLS vacío cuando hay supabaseToken en sesión.
 */
export async function getCrmApiClient(): Promise<{
  supabase: SupabaseClient;
  userId: string;
  organizacionId: string;
  rol: OrganizacionRol;
} | null> {
  const ctx = await getOrganizacionContext();
  if (!ctx) return null;
  return {
    supabase: getSupabaseAdmin(),
    userId: ctx.usuarioId,
    organizacionId: ctx.organizacionId,
    rol: ctx.rol,
  };
}
