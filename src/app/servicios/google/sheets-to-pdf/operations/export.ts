import { 
  OpcionesExportacion, 
  FormatoExportacion, 
  ConfiguracionExportacion,
  OrientacionPagina,
  Margenes
} from '../types';

const MIME_TYPES: Record<FormatoExportacion, string> = {
  'PDF': 'application/pdf',
  'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'CSV': 'text/csv',
  'TSV': 'text/tab-separated-values',
  'ODS': 'application/vnd.oasis.opendocument.spreadsheet'
};

const EXPORT_FORMATS: Record<FormatoExportacion, string> = {
  'PDF': 'pdf',
  'XLSX': 'xlsx',
  'CSV': 'csv',
  'TSV': 'tsv',
  'ODS': 'ods'
};

export function obtenerConfiguracionExportacion(opciones: OpcionesExportacion): ConfiguracionExportacion {
  const config: ConfiguracionExportacion = {
    mimeType: MIME_TYPES[opciones.formato],
    exportFormat: EXPORT_FORMATS[opciones.formato]
  };

  if (opciones.formato === 'PDF') {
    config.parameters = construirParametrosPDF(opciones);
  }

  return config;
}

function construirParametrosPDF(opciones: OpcionesExportacion): Record<string, string> {
  const params: Record<string, string> = {
    format: 'pdf',
    size: 'A4'
  };

  if (opciones.orientacion) {
    params.orientation = opciones.orientacion.toLowerCase();
  }

  if (opciones.escala) {
    params.scale = opciones.escala.toString();
  }

  if (opciones.ajustarAncho) {
    params.fitToPage = 'true';
    params.fitToWidth = 'true';
  }

  if (opciones.margenes) {
    Object.assign(params, construirParametrosMargenes(opciones.margenes));
  }

  if (opciones.encabezadoPie) {
    Object.assign(params, construirParametrosEncabezadoPie(opciones.encabezadoPie));
  }

  if (opciones.rangos?.length) {
    params.ranges = opciones.rangos.join(',');
  }

  return params;
}

function construirParametrosMargenes(margenes: Margenes): Record<string, string> {
  const params: Record<string, string> = {};
  const unidad = margenes.unidad.toLowerCase();

  if (margenes.superior) params[`marginTop.${unidad}`] = margenes.superior.toString();
  if (margenes.inferior) params[`marginBottom.${unidad}`] = margenes.inferior.toString();
  if (margenes.izquierdo) params[`marginLeft.${unidad}`] = margenes.izquierdo.toString();
  if (margenes.derecho) params[`marginRight.${unidad}`] = margenes.derecho.toString();

  return params;
}

function construirParametrosEncabezadoPie(opciones: OpcionesExportacion['encabezadoPie']): Record<string, string> {
  const params: Record<string, string> = {};

  if (!opciones) return params;

  if (opciones.encabezado) {
    params.headerTemplate = opciones.encabezado;
  }

  if (opciones.piePagina) {
    params.footerTemplate = opciones.piePagina;
  }

  if (opciones.numeroPagina) {
    params.pageNumbers = 'true';
  }

  if (opciones.fechaHora) {
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();
    params.headerTemplate = `${params.headerTemplate || ''} ${fecha} ${hora}`;
  }

  return params;
} 