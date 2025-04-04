// Tipos comunes para todos los servicios de Google
export interface ResultadoAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export interface ResultadoServicio<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  timestamp: Date;
}

// Tipos para Google Places
export interface Lugar {
  id: string;
  nombre: string;
  direccion: string;
  ubicacion: {
    lat: number;
    lng: number;
  };
  rating?: number;
  totalRatings?: number;
  tipos: string[];
  telefono?: string;
  website?: string;
  horarios?: string[];
  fotos?: FotoLugar[];
}

export interface FotoLugar {
  referencia: string;
  altura: number;
  ancho: number;
  atribucion: string[];
}

export interface BusquedaLugaresParams {
  query: string;
  ubicacion?: {
    lat: number;
    lng: number;
  };
  radio?: number;
  tipo?: string;
  pageToken?: string;
}

// Tipos para Google Sheets
export interface HojaCalculo {
  id: string;
  titulo: string;
  hojas: Hoja[];
}

export interface Hoja {
  id: string;
  titulo: string;
  indice: number;
}

// Tipos para Google Slides
export interface Presentacion {
  presentationId: string;
  titulo: string;
  diapositivas: Diapositiva[];
}

export interface Diapositiva {
  id: string;
  titulo: string;
  elementos: ElementoDiapositiva[];
  indice: number;
}

export interface ElementoDiapositiva {
  id: string;
  tipo: string;
  contenido: string;
  posicion?: {
    x: number;
    y: number;
    ancho: number;
    alto: number;
  };
}

// Tipos para caché
export interface CacheItem<T> {
  datos: T;
  timestamp: number;
}

export interface ElementoCache {
  [key: string]: CacheItem<any>;
} 