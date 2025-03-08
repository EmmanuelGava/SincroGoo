export interface FilaBase {
  id: string;
  [key: string]: any;
}

export interface FilaSeleccionada extends FilaBase {
  valores: { [clave: string]: any };
  ultimaActualizacion?: Date;
  ubicacionDiapositiva?: string;
  vistaPreviaDiapositiva?: string;
  elementoDiapositiva?: string;
  numeroFila?: number;
  actualizacionesDiapositiva?: ActualizacionElemento[];
}

export interface FilaHoja extends FilaBase {
  valores: { [clave: string]: any };
  ultimaActualizacion: Date;
  numeroFila: number;
}

export interface ConfiguracionHoja {
  idHoja: string;
  rango: string;
  filaEncabezado: number;
  columnas: ConfiguracionColumna[];
}

export interface ConfiguracionColumna {
  clave: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'booleano' | 'precio' | 'formula' | 'seleccion';
  indice: number;
  formato?: FormatoColumna;
}

export interface FormatoColumna {
  tipo: 'moneda' | 'porcentaje' | 'numero' | 'fecha' | 'texto';
  prefijo?: string;
  sufijo?: string;
  decimales?: number;
  locale?: string;
  patron?: string;
}

export interface DatosHoja {
  filas: FilaHoja[];
  columnas: string[];
}

export interface ActualizacionElemento {
  idDiapositiva: string;
  idElemento: string;
  contenidoNuevo: string;
} 