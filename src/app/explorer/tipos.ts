export interface Rubro {
  id: string;
  nombre: string;
}

export interface Establecimiento {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
  sitioWeb?: string;
  horarios?: {
    [key: string]: string;
  };
  puntuacionCompletitud: number;
}

export interface FiltrosBusqueda {
  texto: string;
  rubro: string;
  radio: number;
  latitud: number;
  longitud: number;
  ratingMinimo?: number;
  abiertoAhora: boolean;
} 