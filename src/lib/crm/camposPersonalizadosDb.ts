import type { SupabaseClient } from '@supabase/supabase-js';
import {
  aplicarValoresCampos,
  type CampoDefinicion,
  type CampoEntidad,
  type CamposValores,
} from './camposPersonalizados';

export const CAMPO_SELECT = 'id, entidad, clave, etiqueta, tipo, opciones, orden, mostrar_en_tarjeta';

const TABLA_POR_ENTIDAD: Record<CampoEntidad, 'leads' | 'contactos'> = {
  lead: 'leads',
  contacto: 'contactos',
};

export async function listarCamposPersonalizados(
  supabase: SupabaseClient,
  organizacionId: string,
  entidad?: CampoEntidad
): Promise<CampoDefinicion[]> {
  let query = supabase
    .from('campos_personalizados')
    .select(CAMPO_SELECT)
    .eq('organizacion_id', organizacionId)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });
  if (entidad) query = query.eq('entidad', entidad);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as CampoDefinicion[];
}

export async function leerValoresCampos(
  supabase: SupabaseClient,
  entidad: CampoEntidad,
  id: string,
  organizacionId: string
): Promise<CamposValores | null> {
  const { data, error } = await supabase
    .from(TABLA_POR_ENTIDAD[entidad])
    .select('id, campos')
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (data.campos && typeof data.campos === 'object' ? data.campos : {}) as CamposValores;
}

export type GuardarValoresResult =
  | { ok: true; campos: CamposValores }
  | { ok: false; status: number; error: string };

export async function guardarValoresCampos(
  supabase: SupabaseClient,
  entidad: CampoEntidad,
  id: string,
  organizacionId: string,
  input: unknown
): Promise<GuardarValoresResult> {
  const actuales = await leerValoresCampos(supabase, entidad, id, organizacionId);
  if (actuales === null) {
    return { ok: false, status: 404, error: entidad === 'lead' ? 'Lead no encontrado' : 'Contacto no encontrado' };
  }
  const definiciones = await listarCamposPersonalizados(supabase, organizacionId, entidad);
  const parsed = aplicarValoresCampos(definiciones, actuales, input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };

  const { error } = await supabase
    .from(TABLA_POR_ENTIDAD[entidad])
    .update({ campos: parsed.value })
    .eq('id', id)
    .eq('organizacion_id', organizacionId);
  if (error) throw error;
  return { ok: true, campos: parsed.value };
}
