export interface ResultadoServicio<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  advertencia?: string;
  codigo?: number;
  timestamp?: Date;
} 