// Exportar todos los servicios actualizados
export { CeldasAPI } from './celdas-service';
export { SheetsAPI } from './sheets-service';
export { DiapositivasAPI } from '../slides/diapositivas-service';
export { SlidesAPI } from '../slides/slides-service';
export { ElementosAPI } from '../slides/elementos-service';
export { ProyectosAPI } from '../proyectos/proyectos-service';
export { SincronizacionAPI } from './sincronizacion-service';
export { getSupabaseClient } from '../globales/conexion';

// Exportar tipos
export * from '../globales/tipos';