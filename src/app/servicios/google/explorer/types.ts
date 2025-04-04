export interface Lugar {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  sitioWeb?: string;
  horarios?: string[];
  puntuacion?: number;
  totalPuntuaciones?: number;
  nivelPrecio?: number;
  fotos?: string[];
  completitud?: number;
  // Propiedades alternativas que pueden venir de la API
  rating?: number;
  totalRatings?: number;
}

export interface HistorialBusqueda {
  fecha: string;
  busqueda: string;
  filtros: string;
  resultados: number;
}
