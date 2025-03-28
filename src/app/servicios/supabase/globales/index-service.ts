// Exportar servicios de Supabase
import { SupabaseService } from './supabase-service';

// Exportar servicios de tablas
export { CeldasAPI } from '../tablas/celdas-service';
export { SheetsAPI } from '../tablas/sheets-service';
export { ElementosAPI } from '../slides/elementos-service';
export { ProyectosService } from '../tablas/proyectos-service';
export { SincronizacionAPI } from '../tablas/sincronizacion-service';
export { SlidesAPI } from '../slides/slides-service';

// Exportar tipos
export * from './tipos';

// Re-exportar SupabaseService
export { SupabaseService };
