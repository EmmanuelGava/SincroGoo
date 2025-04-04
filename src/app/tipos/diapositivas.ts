export interface ElementoSlide {
  id: string;
  tipo: string;
  texto?: string;
  indice?: number;
}

export interface ActualizacionSlide {
  slideId: string;
  elementos: ElementoSlide[];
}

export interface CacheVistaPrevia {
  base64Image: string;
  timestamp: number;
} 