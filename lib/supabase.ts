import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlznkmbkeikgbiwisrnx.supabase.co';
// Usamos NEXT_PUBLIC_SUPABASE_ANON_KEY que ya está en .env.local
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions para proyectos
export async function getProyectosByUserId(userId: string) {
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('userId', userId)
    .order('ultimaModificacion', { ascending: false });

  if (error) {
    console.error('Error al obtener proyectos:', error);
    throw error;
  }

  return data;
}

export async function createProyecto(proyecto: any) {
  const { data, error } = await supabase
    .from('proyectos')
    .insert([proyecto])
    .select()
    .single();

  if (error) {
    console.error('Error al crear proyecto:', error);
    throw error;
  }

  return data;
}

export async function updateProyecto(id: string, updates: any) {
  const { data, error } = await supabase
    .from('proyectos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar proyecto:', error);
    throw error;
  }

  return data;
}

export async function deleteProyecto(id: string) {
  const { error } = await supabase
    .from('proyectos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error al eliminar proyecto:', error);
    throw error;
  }
} 