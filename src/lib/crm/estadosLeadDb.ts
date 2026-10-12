import type { SupabaseClient } from '@supabase/supabase-js';

export type EstadoLeadRow = {
  id: string;
  nombre: string;
  orden: number;
  color: string | null;
  icono: string | null;
  is_default: boolean | null;
  organizacion_id: string | null;
};

export const ETAPAS_POR_DEFECTO = [
  { nombre: 'Nuevo', orden: 0, color: '#4FC3F7', icono: 'RadioButtonUnchecked', is_default: true },
  { nombre: 'Contactado', orden: 1, color: '#FFD54F', icono: 'HourglassEmpty', is_default: false },
  { nombre: 'Calificado', orden: 2, color: '#7986CB', icono: 'TrendingUp', is_default: false },
  { nombre: 'Propuesta', orden: 3, color: '#FF8A65', icono: 'WorkOutline', is_default: false },
  { nombre: 'Ganado', orden: 4, color: '#4ECCA3', icono: 'ThumbUpOffAlt', is_default: false },
  { nombre: 'Perdido', orden: 5, color: '#F06292', icono: 'ThumbDownOffAlt', is_default: false },
] as const;

const ESTADO_SELECT = 'id, nombre, orden, color, icono, is_default, organizacion_id';

/** Etapas de la organización; si no tiene ninguna, siembra las de por defecto. */
export async function listarEstadosOrganizacion(
  supabase: SupabaseClient,
  organizacionId: string,
  usuarioId: string
): Promise<EstadoLeadRow[]> {
  const { data, error } = await supabase
    .from('estados_lead')
    .select(ESTADO_SELECT)
    .eq('organizacion_id', organizacionId)
    .order('orden', { ascending: true });
  if (error) throw error;
  if (data?.length) return data as EstadoLeadRow[];

  const { data: seeded, error: seedError } = await supabase
    .from('estados_lead')
    .insert(
      ETAPAS_POR_DEFECTO.map((etapa) => ({
        ...etapa,
        usuario_id: usuarioId,
        organizacion_id: organizacionId,
      }))
    )
    .select(ESTADO_SELECT)
    .order('orden', { ascending: true });
  if (seedError) throw seedError;
  return (seeded || []) as EstadoLeadRow[];
}

export async function estadoPerteneceAOrganizacion(
  supabase: SupabaseClient,
  organizacionId: string,
  estadoId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('estados_lead')
    .select('id')
    .eq('id', estadoId)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  return Boolean(data?.id);
}

/** Etapa donde entra un lead nuevo: "Nuevo", la marcada por defecto o la primera. */
export function elegirEstadoInicial(
  estados: Array<Pick<EstadoLeadRow, 'id' | 'nombre' | 'is_default'>>
): string | null {
  const porNombre = estados.find((e) => e.nombre?.trim().toLowerCase() === 'nuevo');
  if (porNombre) return porNombre.id;
  const porDefecto = estados.find((e) => e.is_default);
  if (porDefecto) return porDefecto.id;
  return estados[0]?.id || null;
}
