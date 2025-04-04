import { Lugar as LugarGoogle } from '@/app/servicios/google/types';

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

// Este tipo se usa específicamente para exportar a hojas de cálculo
export interface LugarExportable {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  sitioWeb?: string;
  rating?: number;
  totalRatings?: number;
  horarios?: string[];
}

export interface LugarExplorer {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  sitioWeb?: string;
  rating?: number;
  totalRatings?: number;
  horarios?: string[];
  completitud: number;
} 