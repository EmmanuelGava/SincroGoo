export interface VistaPreviaDiapositiva {
  id: string
  titulo: string | { texto: string }
  indice: number
  elementos?: ElementoDiapositiva[]
  thumbnailUrl?: string
  /** URL de miniatura desde Google (viene de obtenerPresentacion). Usar cuando exista para evitar llamadas duplicadas a la API */
  urlImagen?: string
}

export interface ElementoDiapositiva {
  id: string
  idDiapositiva?: string
  tipo: 'texto' | 'forma' | 'tabla' | 'imagen' | 'titulo' | 'subtitulo' | 'lista'
  texto?: string
  contenido: string | { texto: string } | any
  posicion?: {
    x: number
    y: number
    ancho: number
    alto: number
  }
  estilo?: {
    color?: string
    tamanoFuente?: number
    alineacion?: 'left' | 'center' | 'right'
    negrita?: boolean
    cursiva?: boolean
    subrayado?: boolean
  }
  columnaAsociada?: string
  tipoAsociacion?: 'manual' | 'automatica'
  modificado?: boolean
  _filaId?: string
}

export interface CambioPrevio {
  idDiapositiva: string
  idElemento: string
  contenidoAnterior: string
  contenidoNuevo: string
} 