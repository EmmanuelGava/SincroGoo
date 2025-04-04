export interface FilaBase {
  id: string;
  [key: string]: any;
}

export interface FilaSeleccionada {
  id: string;
  datos: Record<string, any>;
  indice: number;
}

export interface FilaHoja {
  id: string;
  datos: Record<string, any>;
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

export interface Columna {
  id: string;
  nombre: string;
  tipo: string;
} 