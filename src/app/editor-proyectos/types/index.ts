export * from './slides'
export * from './sheets'

export interface VistaPreviaDiapositiva {
  id: string
  indice: number
  titulo: string | { texto: string }
  thumbnailUrl?: string
  elementos: ElementoDiapositiva[]
}

export interface ElementoDiapositiva {
  id: string
  tipo: 'texto' | 'forma' | 'tabla' | 'imagen' | 'titulo' | 'subtitulo' | 'lista'
  contenido: string | { texto: string } | any
  columnaAsociada?: string
  modificado?: boolean
}

export interface ValorCelda {
  columnaId: string
  valor: string
}

export interface FilaHoja {
  id: string
  numeroFila: number
  valores: ValorCelda[]
  ultimaActualizacion?: Date
}

export interface FilaSeleccionada {
  id: string
  indice: number
  valores: ValorCelda[]
  numeroFila?: number
  ultimaActualizacion?: Date
}

export interface Columna {
  id: string
  titulo: string
  tipo: string
}

export interface DatosHojaCalculo {
  filas: FilaHoja[]
  columnas: Columna[]
}

export interface RespuestaHojaCalculo {
  datos: DatosHojaCalculo
}

export interface CambioPrevio {
  idElemento: string
  idDiapositiva: string
  contenidoAnterior: string
  contenidoNuevo: string
  variables: string[]
}

export interface EditorContextType {
  // Estados de diapositivas
  diapositivaSeleccionada: ElementoDiapositiva | null
  elementosActuales: ElementoDiapositiva[]
  elementosModificados: ElementoDiapositiva[]
  hayElementosModificados: boolean
  elementosPrevia: ElementoDiapositiva[]
  elementoSeleccionadoPopup: ElementoDiapositiva | null
  cargandoElementos: boolean
  idProyecto: string
  
  // Setters
  setElementosModificados: (elementos: ElementoDiapositiva[]) => void
  setHayElementosModificados: (hay: boolean) => void
  setElementoSeleccionadoPopup: (elemento: ElementoDiapositiva | null) => void
  setCambiosPendientes: (pendientes: boolean) => void
  
  // Métodos
  previsualizarCambios: (elementos: ElementoDiapositiva[], mostrarPrevia: boolean) => void
  actualizarElementos: (elementos: ElementoDiapositiva[]) => Promise<boolean>
}

export interface BotonGuardarElementosProps {
  elementos: ElementoDiapositiva[]
  elementosOriginales: ElementoDiapositiva[]
  hayElementosModificados: boolean
  alGuardar: (elementos: ElementoDiapositiva[]) => Promise<boolean>
  onReset: () => void
  idPresentacion?: string
  idHoja?: string
  idDiapositiva: string
  filaSeleccionada: FilaSeleccionada | null
}

export interface BotonCancelarElementosProps {
  elementos: ElementoDiapositiva[]
  elementosOriginales: ElementoDiapositiva[]
  hayElementosModificados: boolean
  onRestaurar: () => void
  setAsociacionesCambiadas: () => void
}

export interface EditorElementoPopupProps {
  elemento: ElementoDiapositiva
  abierto: boolean
  alCerrar: () => void
  alGuardar: (elementoActualizado: ElementoDiapositiva) => void
  filaSeleccionada: FilaSeleccionada | null
} 