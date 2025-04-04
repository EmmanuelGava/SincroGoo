export interface ElementoDiapositiva {
  id: string;
  tipo: 'texto' | 'forma' | 'tabla' | 'imagen' | 'titulo' | 'subtitulo' | 'lista';
  contenido?: string;
  columnaAsociada?: string;
  tipoAsociacion?: string;
  modificado?: boolean;
  _filaId?: string;
}

export interface VistaPreviaDiapositiva {
  id: string;
  titulo: string;
  urlImagen?: string;
  indice: number;
  elementos: ElementoDiapositiva[];
}

export interface CambioPrevio {
  idElemento: string;
  idDiapositiva: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
  variables: string[];
} 