export interface ValorCelda {
  columnaId: string
  valor: string
  tipo?: string
}

// Interfaz para valores como objeto
export interface ValoresFila {
  [columnaId: string]: string
}

export interface FilaHoja {
  id: string
  numeroFila?: number
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

export interface ColumnaHoja {
  id: string
  titulo: string
}

// Interfaces para la respuesta de la API
export interface RespuestaHojaCalculo {
  exito: boolean
  error?: string
  datos?: DatosHojaCalculo
}

export interface DatosHojaCalculo {
  filas: {
    indice: number
    valores: ValorCelda[]
  }[]
  encabezados: string[]
  rango?: string
}

