export interface FilaSeleccionada {
  id: string;
  numeroFila: number;
  valores: Array<{
    columnaId: string;
    valor: string;
  }>;
  ultimaActualizacion?: Date;
}

export interface Columna {
  id: string;
  titulo: string;
  tipo?: string;
}

export interface FilaHoja {
  id: string;
  numeroFila: number;
  valores: Array<{
    columnaId: string;
    valor: string;
  }>;
  ultimaActualizacion?: Date;
} 