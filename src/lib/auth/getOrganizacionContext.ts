import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';

export type OrganizacionRol = 'admin' | 'agente';

export type OrganizacionContext = {
  usuarioId: string;
  organizacionId: string;
  rol: OrganizacionRol;
};

type MiembroRow = {
  organizacion_id: string;
  rol: OrganizacionRol;
};

/** Crea org "Mi negocio" + membresía admin para un usuario sin organización. */
export async function ensureOrganizacionForUsuario(
  usuarioId: string,
  nombreUsuario?: string | null
): Promise<OrganizacionContext> {
  const supabase = getSupabaseAdmin();

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nombre, organizacion_id')
    .eq('id', usuarioId)
    .maybeSingle();

  if (usuario?.organizacion_id) {
    const { data: miembro } = await supabase
      .from('organizacion_miembros')
      .select('organizacion_id, rol')
      .eq('usuario_id', usuarioId)
      .eq('organizacion_id', usuario.organizacion_id)
      .maybeSingle();

    if (miembro) {
      return {
        usuarioId,
        organizacionId: miembro.organizacion_id,
        rol: (miembro.rol as OrganizacionRol) || 'admin',
      };
    }
  }

  const orgNombre = nombreUsuario?.trim() ? `Negocio de ${nombreUsuario.trim()}` : 'Mi negocio';

  const { data: org, error: orgError } = await supabase
    .from('organizaciones')
    .insert({ nombre: orgNombre })
    .select('id')
    .single();

  if (orgError || !org?.id) {
    throw orgError || new Error('No se pudo crear la organización');
  }

  const { error: miembroError } = await supabase.from('organizacion_miembros').insert({
    organizacion_id: org.id,
    usuario_id: usuarioId,
    rol: 'admin',
  });

  if (miembroError) throw miembroError;

  await supabase.from('usuarios').update({ organizacion_id: org.id }).eq('id', usuarioId);

  return { usuarioId, organizacionId: org.id, rol: 'admin' };
}

/**
 * Contexto de organización para rutas API: usuario, org y rol.
 * Si el usuario no tiene org, la crea automáticamente (v1).
 */
export async function getOrganizacionContext(
  session?: Session | null
): Promise<OrganizacionContext | null> {
  const resolvedSession = session ?? (await getServerSession(authOptions));
  if (!resolvedSession?.user?.id) return null;

  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;

  const supabase = getSupabaseAdmin();

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacion_id')
    .eq('id', usuarioId)
    .maybeSingle();

  if (usuario?.organizacion_id) {
    const { data: miembroPreferido } = await supabase
      .from('organizacion_miembros')
      .select('organizacion_id, rol')
      .eq('usuario_id', usuarioId)
      .eq('organizacion_id', usuario.organizacion_id)
      .maybeSingle();

    if (miembroPreferido) {
      return {
        usuarioId,
        organizacionId: miembroPreferido.organizacion_id,
        rol: (miembroPreferido.rol as OrganizacionRol) || 'agente',
      };
    }
  }

  const { data: miembro, error } = await supabase
    .from('organizacion_miembros')
    .select('organizacion_id, rol')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getOrganizacionContext] error:', error.message);
    return null;
  }

  if (miembro?.organizacion_id) {
    return {
      usuarioId,
      organizacionId: miembro.organizacion_id,
      rol: (miembro.rol as OrganizacionRol) || 'agente',
    };
  }

  try {
    return await ensureOrganizacionForUsuario(
      usuarioId,
      resolvedSession.user.name || resolvedSession.user.email
    );
  } catch (e) {
    console.error('[getOrganizacionContext] ensureOrganizacionForUsuario:', e);
    return null;
  }
}

/** Verifica que un usuario pertenece a la misma organización. */
export async function isMiembroOrganizacion(
  organizacionId: string,
  targetUsuarioId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('organizacion_miembros')
    .select('usuario_id')
    .eq('organizacion_id', organizacionId)
    .eq('usuario_id', targetUsuarioId)
    .maybeSingle();
  return Boolean(data?.usuario_id);
}

export async function listMiembrosOrganizacion(organizacionId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('organizacion_miembros')
    .select(
      `
      usuario_id,
      rol,
      created_at,
      usuarios (
        id,
        nombre,
        email,
        avatar_url
      )
    `
    )
    .eq('organizacion_id', organizacionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => {
    const usuario = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
    return {
      usuario_id: row.usuario_id,
      rol: row.rol as OrganizacionRol,
      created_at: row.created_at,
      nombre: usuario?.nombre || 'Usuario',
      email: usuario?.email || '',
      avatar_url: usuario?.avatar_url || null,
    };
  });
}
