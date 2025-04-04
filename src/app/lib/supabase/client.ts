import { createClient } from '@supabase/supabase-js';

// Crear el cliente de Supabase para operaciones del lado del cliente
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Exportar la configuración básica para mantener compatibilidad
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}; 