/**
 * Tipo que representa una celda en una hoja de cálculo
 */
export interface Celda {
  id?: string;
  sheet_id: string;
  fila: number;
  columna: string;
  referencia_celda: string;
  contenido: string;
  tipo: 'texto' | 'numero' | 'formula' | 'fecha' | 'imagen';
  formato?: Record<string, any>;
  metadata?: Record<string, any>;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
