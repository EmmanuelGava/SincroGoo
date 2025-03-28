// Exportar el servicio centralizado
export { SupabaseService } from '@/servicios/supabase/globales/conexion';

// Exportar funciones de autenticación
export { syncSupabaseSession, hasSupabaseSession } from '@/servicios/supabase/globales/auth-service';

// Exportar tipos comunes
export type { Proyecto, Slide, Sheet, Diapositiva, Celda, Elemento, Asociacion } from '@/servicios/supabase/globales/tipos'; 