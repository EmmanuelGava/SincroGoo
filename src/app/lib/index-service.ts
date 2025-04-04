// Exportar el servicio centralizado
export { supabase } from '@/lib/supabase';

// Exportar funciones de autenticación
export { syncSupabaseSession, hasSupabaseSession } from '@/app/lib/import-redirector';

// Exportar tipos comunes
export type { Sheet, Celda, Asociacion } from '@/app/lib/import-redirector'; 