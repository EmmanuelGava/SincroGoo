import { slides_v1 } from 'googleapis';
import { 
  Diapositiva,
  TipoLayout,
  ElementoDiapositiva,
  OpcionesActualizacion
} from '../types';

export interface OpcionesDiapositiva {
  presentacionId: string;
  diapositiva: Diapositiva;
  indice?: number;
}

export interface OpcionesActualizacionDiapositiva extends OpcionesDiapositiva {
  actualizarElementos?: boolean;
  actualizarLayout?: boolean;
  actualizarNotas?: boolean;
}

interface OpcionesActualizacionDiapo {
  titulo?: string;
  layout?: string;
  notas?: string;
  elementos?: {
    id: string;
    tipo: string;
    contenido: string;
    posicion?: {
      x: number;
      y: number;
    };
    tamaño?: {
      ancho: number;
      alto: number;
    };
  }[];
}

export function crearRequestInsertarDiapositiva(
  indice: number,
  layout: TipoLayout,
  presentacionId: string
): slides_v1.Schema$Request {
  return {
    createSlide: {
      insertionIndex: indice,
      slideLayoutReference: {
        predefinedLayout: mapearLayout(layout)
      }
    }
  };
}

export function crearRequestActualizarDiapositiva(
  diapositivaId: string,
  opciones: OpcionesActualizacionDiapo,
  presentacionId: string
): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];

  if (opciones.layout) {
    requests.push({
      updatePageProperties: {
        objectId: diapositivaId,
        pageProperties: {
          pageBackgroundFill: {
            stretchedPictureFill: {
              contentUrl: ''
            }
          }
        },
        fields: 'pageBackgroundFill'
      }
    });
  }

  if (opciones.notas) {
    requests.push({
      replaceAllText: {
        containsText: {
          text: '*'
        },
        replaceText: opciones.notas,
        pageObjectIds: [diapositivaId]
      }
    });
  }

  return requests;
}

export function crearRequestEliminarDiapositiva(
  diapositivaId: string,
  presentacionId: string
): slides_v1.Schema$Request {
  return {
    deleteObject: {
      objectId: diapositivaId
    }
  };
}

export function crearRequestDuplicarDiapositiva(
  diapositivaId: string,
  indiceDestino: number | undefined,
  presentacionId: string
): slides_v1.Schema$Request {
  return {
    duplicateObject: {
      objectId: diapositivaId,
      ...(indiceDestino !== undefined && { insertionIndex: indiceDestino })
    }
  };
}

export function crearRequestMoverDiapositiva(
  diapositivaId: string,
  nuevoIndice: number,
  presentacionId: string
): slides_v1.Schema$Request {
  return {
    updateSlidesPosition: {
      slideObjectIds: [diapositivaId],
      insertionIndex: nuevoIndice
    }
  };
}

function mapearLayout(tipo: TipoLayout): string {
  const layouts: Record<TipoLayout, string> = {
    'TITULO': 'TITLE',
    'TITULO_Y_CUERPO': 'TITLE_AND_BODY',
    'TITULO_Y_DOS_COLUMNAS': 'TITLE_AND_TWO_COLUMNS',
    'SOLO_TITULO': 'TITLE_ONLY',
    'SECCION': 'SECTION_HEADER',
    'DOS_COLUMNAS': 'TWO_COLUMNS',
    'EN_BLANCO': 'BLANK'
  };

  return layouts[tipo] || 'BLANK';
} 