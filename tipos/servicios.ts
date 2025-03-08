export interface ResultadoServicio<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
} 