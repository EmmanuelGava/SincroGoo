// Exportaciones de autenticación
import { AuthService } from '@/app/lib/supabase/auth-service';

const authService = AuthService.getInstance();
export const syncSupabaseSession = () => authService.syncSupabaseSession();
export const hasSupabaseSession = () => authService.hasSupabaseSession();

// Exportaciones de tipos
export type { SheetCell as Sheet } from '@/lib/supabase/types/sheets';
export type { Celda } from '@/types/celdas';
export type { AsociacionElementoSupabase as Asociacion } from '@/types/asociaciones'; 