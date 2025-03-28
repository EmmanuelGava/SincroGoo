interface ConfiguracionFilas {
  inicio: number;
  fin?: number;
  filaEncabezados: number; // Fila donde están los encabezados (1-indexed)
}

export type TipoContenido = 'titulo' | 'subtitulo' | 'texto' | 'imagen' | 'tabla' | 'grafico' | 'lista';

export type ElementoDiapositiva = 
  | 'titulo_principal'
  | 'subtitulo_principal'
  | 'contenido_principal'
  | 'contenido_secundario'
  | 'pie_pagina'
  | 'notas';

export interface MapeoColumna {
  columna: string;
  elementoDiapositiva: ElementoDiapositiva;
  encabezado: string; // Contenido del encabezado
  formato?: {
    negrita?: boolean;
    tamano?: number;
    color?: string;
  };
}

interface ConfiguracionFiltrado {
  filaInicio?: number;
  filaFin?: number;
  incluirEncabezados: boolean;
  filtros?: {
    columna: string;
    valor: string | number;
    condicion: 'igual' | 'contiene' | 'mayor' | 'menor';
  }[];
}

export interface Diapositiva {
  id: string;
  tipo: TipoContenido;
  hoja: string;
  nombre?: string; // Nombre personalizado de la diapositiva
  filas: ConfiguracionFilas;
  titulo?: string;
  subtitulo?: string;
  tipoGrafico?: 'barras' | 'lineas' | 'circular';
  filasPorDiapositiva?: number;
  mapeoColumnas?: MapeoColumna[];
  configuracionFiltrado?: ConfiguracionFiltrado;
  plantilla?: 'titulo' | 'contenido' | 'dos_columnas' | 'comparacion';
} 