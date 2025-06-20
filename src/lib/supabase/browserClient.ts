import { createClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';

// Solo crea el cliente si estamos en el navegador
export const supabase = isBrowser
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null;

// Para facilitar la depuración en el navegador, exponemos el cliente a la ventana global
if (isBrowser && process.env.NODE_ENV === 'development' && window) {
  (window as any).supabase = supabase;
} 