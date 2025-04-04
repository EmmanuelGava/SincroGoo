import { slides_v1 } from 'googleapis';
import { 
  ElementoDiapositiva, 
  ContenidoElemento,
  ContenidoTextoBase,
  ContenidoImagenBase,
  ContenidoVideoBase,
  ContenidoTablaBase,
  FormatoTexto,
  TablaElemento,
  TipoElemento,
  Posicion,
  Tamaño,
  OpcionesElemento,
  OpcionesActualizacionElemento,
  GoogleSlidesVideoProperties
} from '../types';

// Valores por defecto
const POSICION_DEFAULT: Required<Posicion> = {
  x: 0,
  y: 0,
  unidad: 'PT'
};

const TAMAÑO_DEFAULT: Required<Tamaño> = {
  ancho: 100,
  alto: 100,
  unidad: 'PT'
};

export function extraerTitulo(slide: slides_v1.Schema$Page): string | undefined {
  const titleElement = slide.pageElements?.find(element => 
    element.shape?.shapeType === 'TEXT_BOX' && 
    element.title
  );
  
  return titleElement?.shape?.text?.textElements?.[0]?.textRun?.content?.trim();
}

export function extraerElementos(slide: slides_v1.Schema$Page): ElementoDiapositiva[] {
  if (!slide.pageElements) return [];

  return slide.pageElements.map((element, index) => {
    const base = {
      id: element.objectId || `element-${index}`,
      tipo: mapearTipoElemento(element),
      posicion: extraerPosicion(element),
      tamaño: extraerTamaño(element),
      rotacion: element.transform?.scaleX || 1
    };

    const contenido = extraerContenido(element);
    if (contenido) {
      return { ...base, contenido };
    }

    return base;
  }) as ElementoDiapositiva[];
}

export function crearRequestElemento(
  diapositivaId: string,
  elemento: ElementoDiapositiva
): slides_v1.Schema$Request {
  const elementProperties: slides_v1.Schema$PageElementProperties = {
    pageObjectId: diapositivaId
  };

  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);

  elementProperties.size = crearSize(tamaño);
  elementProperties.transform = crearTransform(posicion);

  switch (elemento.tipo.toUpperCase()) {
    case 'TEXTO':
      return {
        createShape: {
          objectId: elemento.id,
          shapeType: 'TEXT_BOX',
          elementProperties
        }
      };

    case 'IMAGEN':
      if (typeof elemento.contenido === 'object' && 'url' in elemento.contenido) {
        return {
          createImage: {
            objectId: elemento.id,
            elementProperties,
            url: elemento.contenido.url
          }
        };
      }
      throw new Error('Contenido de imagen no válido');

    case 'VIDEO':
      if (typeof elemento.contenido === 'object' && 'url' in elemento.contenido) {
        return {
          createVideo: {
            objectId: elemento.id,
            elementProperties,
            source: 'YOUTUBE',
            id: elemento.contenido.url
          }
        };
      }
      throw new Error('Contenido de video no válido');

    case 'TABLA':
      if (typeof elemento.contenido === 'object' && 'tabla' in elemento.contenido) {
        return {
          createTable: {
            objectId: elemento.id,
            elementProperties,
            rows: elemento.contenido.tabla.filas,
            columns: elemento.contenido.tabla.columnas
          }
        };
      }
      throw new Error('Contenido de tabla no válido');

    case 'FORMA':
      return {
        createShape: {
          objectId: elemento.id,
          shapeType: 'RECTANGLE',
          elementProperties
        }
      };

    default:
      throw new Error(`Tipo de elemento no soportado: ${elemento.tipo}`);
  }
}

export function crearRequestsActualizarElemento(
  diapositivaId: string,
  elementoId: string,
  elemento: Partial<ElementoDiapositiva>
): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];

  if (!elemento.tipo || !elemento.contenido) return requests;

  switch (elemento.tipo) {
    case 'TEXTO': {
      if (elemento.contenido.tipo === 'TEXTO' && elemento.contenido.texto) {
        // Primero borramos el texto existente
        requests.push({
          deleteText: {
            objectId: elementoId,
            textRange: { type: 'ALL' }
          }
        });

        // Luego insertamos el nuevo texto
        requests.push({
          insertText: {
            objectId: elementoId,
            text: elemento.contenido.texto,
            insertionIndex: 0
          }
        });
      }
      break;
    }
    case 'IMAGEN': {
      if (elemento.contenido.tipo === 'IMAGEN') {
        requests.push({
          replaceImage: {
            imageObjectId: elementoId,
            url: elemento.contenido.url,
            imageReplaceMethod: 'CENTER_INSIDE'
          }
        });
      }
      break;
    }
    case 'TABLA': {
      if (elemento.contenido.tipo === 'TABLA') {
        const { tabla } = elemento.contenido;
        tabla.datos.forEach((fila: string[], i: number) => {
          fila.forEach((celda: string, j: number) => {
            if (celda && celda.trim()) {
              requests.push({
                insertText: {
                  objectId: elementoId,
                  cellLocation: {
                    rowIndex: i,
                    columnIndex: j
                  },
                  text: celda,
                  insertionIndex: 0
                }
              });
            }
          });
        });
      }
      break;
    }
  }

  return requests;
}

function mapearTipoElemento(element: slides_v1.Schema$PageElement): TipoElemento {
  if (element.shape?.shapeType === 'TEXT_BOX') return 'TEXTO';
  if (element.image) return 'IMAGEN';
  if (element.video) return 'VIDEO';
  if (element.table) return 'TABLA';
  if (element.shape) return 'FORMA';
  return 'FORMA'; // Por defecto retornamos FORMA
}

function extraerPosicion(element: slides_v1.Schema$PageElement): Posicion {
  const transform = element.transform || {};
  return {
    x: transform.translateX || 0,
    y: transform.translateY || 0,
    unidad: 'PT' // Valor por defecto para Google Slides
  };
}

function extraerTamaño(element: slides_v1.Schema$PageElement): Tamaño {
  const size = element.size || {};
  return {
    ancho: size.width?.magnitude || 0,
    alto: size.height?.magnitude || 0,
    unidad: 'PT' // Valor por defecto para Google Slides
  };
}

function extraerContenido(element: slides_v1.Schema$PageElement): ContenidoElemento | undefined {
  if (element.shape?.shapeType === 'TEXT_BOX' && element.shape.text) {
    return {
      tipo: 'TEXTO',
      texto: element.shape.text.textElements?.map(t => t.textRun?.content || '').join('') || ''
    } as ContenidoTextoBase;
  }

  if (element.image?.contentUrl) {
    return {
      tipo: 'IMAGEN',
      url: element.image.contentUrl
    } as ContenidoImagenBase;
  }

  if (element.video?.url) {
    return {
      tipo: 'VIDEO',
      url: element.video.url
    } as ContenidoVideoBase;
  }

  if (element.table) {
    return {
      tipo: 'TABLA',
      tabla: {
        filas: element.table.rows || 0,
        columnas: element.table.columns || 0,
        datos: []
      }
    } as ContenidoTablaBase;
  }

  return undefined;
}

export function crearRequestInsertarElemento(opciones: OpcionesElemento): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];
  const { elemento } = opciones;

  switch (elemento.tipo) {
    case 'TEXTO':
      requests.push(crearRequestTexto(opciones));
      break;
    case 'IMAGEN':
      requests.push(crearRequestImagen(opciones));
      break;
    case 'FORMA':
      requests.push(crearRequestForma(opciones));
      break;
    case 'VIDEO':
      requests.push(crearRequestVideo(opciones));
      break;
    case 'TABLA':
      requests.push(...crearRequestTabla(opciones));
      break;
    case 'LINEA':
      requests.push(crearRequestLinea(opciones));
      break;
  }

  if (elemento.contenido?.formato) {
    requests.push(crearRequestFormato({
      ...opciones,
      formato: elemento.contenido.formato,
      elementoId: elemento.id
    }));
  }

  return requests;
}

export function crearRequestActualizarElemento(opciones: OpcionesActualizacionElemento): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];
  const { elemento } = opciones;

  if (opciones.actualizarContenido && elemento.contenido) {
    switch (elemento.tipo) {
      case 'TEXTO': {
        if (isTextoContenido(elemento.contenido)) {
          requests.push({
            deleteText: {
              objectId: elemento.id,
              textRange: { type: 'ALL' }
            }
          });
          
          requests.push({
            insertText: {
              objectId: elemento.id,
              insertionIndex: 0,
              text: elemento.contenido.texto
            }
          });

          if (elemento.contenido.formato) {
            requests.push(crearRequestFormato({
              elementoId: elemento.id,
              formato: elemento.contenido.formato
            }));
          }
        }
        break;
      }
      case 'IMAGEN': {
        if (isImagenContenido(elemento.contenido)) {
          requests.push({
            replaceImage: {
              imageObjectId: elemento.id,
              url: elemento.contenido.url,
              imageReplaceMethod: 'CENTER_INSIDE'
            }
          });
        }
        break;
      }
      case 'VIDEO': {
        if (isVideoContenido(elemento.contenido)) {
          const videoProperties: GoogleSlidesVideoProperties = {
            id: elemento.contenido.url // Usamos la URL como ID para YouTube
          };
          
          requests.push({
            updateVideoProperties: {
              objectId: elemento.id,
              fields: 'id',
              videoProperties
            }
          });
        }
        break;
      }
      case 'TABLA': {
        if (isTablaContenido(elemento.contenido)) {
          requests.push(...crearRequestActualizarTabla({
            ...opciones,
            tabla: elemento.contenido.tabla
          }));
        }
        break;
      }
    }
  }

  if (opciones.actualizarPosicion) {
    const posicion = obtenerPosicion(elemento);
    requests.push({
      updatePageElementTransform: {
        objectId: elemento.id,
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: posicion.x,
          translateY: posicion.y,
          unit: posicion.unidad
        },
        applyMode: 'ABSOLUTE'
      }
    });
  }

  if (opciones.actualizarEstilo && elemento.contenido?.formato) {
    requests.push(crearRequestFormato({
      elementoId: elemento.id,
      formato: elemento.contenido.formato
    }));
  }

  return requests;
}

function obtenerPosicion(elemento: ElementoDiapositiva): Required<Posicion> {
  if (!elemento.posicion) {
    return POSICION_DEFAULT;
  }
  
  return {
    x: elemento.posicion.x ?? POSICION_DEFAULT.x,
    y: elemento.posicion.y ?? POSICION_DEFAULT.y,
    unidad: 'PT' // Siempre usamos PT como unidad por defecto
  };
}

function obtenerTamaño(elemento: ElementoDiapositiva): Required<Tamaño> {
  if (!elemento.tamaño) {
    return TAMAÑO_DEFAULT;
  }
  
  return {
    ancho: elemento.tamaño.ancho ?? TAMAÑO_DEFAULT.ancho,
    alto: elemento.tamaño.alto ?? TAMAÑO_DEFAULT.alto,
    unidad: 'PT' // Siempre usamos PT como unidad por defecto
  };
}

function crearRequestTexto(opciones: OpcionesElemento): slides_v1.Schema$Request {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);

  return {
    createShape: {
      objectId: elemento.id,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  };
}

function crearRequestImagen(opciones: OpcionesElemento): slides_v1.Schema$Request {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);
  
  if (!elemento.contenido || !isImagenContenido(elemento.contenido)) {
    throw new Error('Contenido de imagen no válido');
  }

  return {
    createImage: {
      objectId: elemento.id,
      url: elemento.contenido.url,
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  };
}

function crearRequestForma(opciones: OpcionesElemento): slides_v1.Schema$Request {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);

  return {
    createShape: {
      objectId: elemento.id,
      shapeType: 'RECTANGLE',
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  };
}

function crearRequestVideo(opciones: OpcionesElemento): slides_v1.Schema$Request {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);

  if (!elemento.contenido || !isVideoContenido(elemento.contenido)) {
    throw new Error('Contenido de video no válido');
  }

  return {
    createVideo: {
      objectId: elemento.id,
      id: elemento.contenido.url,
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  };
}

function crearRequestTabla(opciones: OpcionesElemento): slides_v1.Schema$Request[] {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);
  
  if (!elemento.contenido || elemento.contenido.tipo !== 'TABLA') {
    throw new Error('No se proporcionaron datos de tabla');
  }

  const { tabla } = elemento.contenido;
  const requests: slides_v1.Schema$Request[] = [{
    createTable: {
      objectId: elemento.id,
      rows: tabla.filas,
      columns: tabla.columnas,
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  }];

  // Agregar datos a la tabla con tipos explícitos
  tabla.datos.forEach((fila: string[], i: number) => {
    fila.forEach((celda: string, j: number) => {
      requests.push({
        insertText: {
          objectId: elemento.id,
          cellLocation: {
            rowIndex: i,
            columnIndex: j
          },
          text: celda
        }
      });
    });
  });

  if (tabla.estilos) {
    if (tabla.estilos.colorBorde || tabla.estilos.anchoBorde) {
      requests.push({
        updateTableBorderProperties: {
          objectId: elemento.id,
          borderPosition: 'ALL',
          tableBorderProperties: {
            dashStyle: 'SOLID',
            weight: tabla.estilos.anchoBorde ? 
              { magnitude: tabla.estilos.anchoBorde, unit: 'PT' } : undefined
          },
          fields: 'dashStyle,weight'
        }
      });
    }

    if (tabla.estilos.colorFondo) {
      requests.push({
        updateTableCellProperties: {
          objectId: elemento.id,
          tableRange: { location: { rowIndex: 0, columnIndex: 0 } },
          tableCellProperties: {
            tableCellBackgroundFill: {
              solidFill: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } }
            }
          },
          fields: '*'
        }
      });
    }
  }

  return requests;
}

function crearRequestLinea(opciones: OpcionesElemento): slides_v1.Schema$Request {
  const { elemento } = opciones;
  const tamaño = obtenerTamaño(elemento);
  const posicion = obtenerPosicion(elemento);

  return {
    createLine: {
      objectId: elemento.id,
      lineCategory: 'STRAIGHT',
      elementProperties: {
        pageObjectId: opciones.diapositivaId,
        size: crearSize(tamaño),
        transform: crearTransform(posicion)
      }
    }
  };
}

interface OpcionesFormato {
  elementoId: string;
  formato: FormatoTexto;
}

function crearRequestFormato(opciones: OpcionesFormato): slides_v1.Schema$Request {
  const { elementoId, formato } = opciones;
  
  return {
    updateTextStyle: {
      objectId: elementoId,
      style: {
        fontFamily: formato.fuente,
        fontSize: formato.tamaño ? { magnitude: formato.tamaño, unit: 'PT' } : undefined,
        foregroundColor: formato.color ? { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } } : undefined,
        backgroundColor: formato.colorFondo ? { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } } : undefined,
        bold: formato.negrita,
        italic: formato.cursiva,
        underline: formato.subrayado
      },
      textRange: { type: 'ALL' },
      fields: '*'
    }
  };
}

function crearRequestActualizarTabla(opciones: OpcionesActualizacionElemento & { tabla: TablaElemento }): slides_v1.Schema$Request[] {
  const requests: slides_v1.Schema$Request[] = [];
  const { elemento, tabla } = opciones;

  // Actualizar contenido de celdas
  tabla.datos.forEach((fila, i) => {
    fila.forEach((celda, j) => {
      requests.push({
        insertText: {
          objectId: elemento.id,
          cellLocation: {
            rowIndex: i,
            columnIndex: j
          },
          text: celda,
          insertionIndex: 0
        }
      });
    });
  });

  // Aplicar estilos si están definidos
  if (tabla.estilos) {
    if (tabla.estilos.colorBorde || tabla.estilos.anchoBorde) {
      requests.push({
        updateTableBorderProperties: {
          objectId: elemento.id,
          borderPosition: 'ALL',
          tableBorderProperties: {
            dashStyle: 'SOLID',
            weight: tabla.estilos.anchoBorde ? { magnitude: tabla.estilos.anchoBorde, unit: 'PT' } : undefined
          },
          fields: 'dashStyle,weight'
        }
      });
    }

    if (tabla.estilos.colorFondo) {
      requests.push({
        updateTableCellProperties: {
          objectId: elemento.id,
          tableRange: { location: { rowIndex: 0, columnIndex: 0 } },
          tableCellProperties: {
            tableCellBackgroundFill: {
              solidFill: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } }
            }
          },
          fields: '*'
        }
      });
    }
  }

  return requests;
}

// Type guards
function isTextoContenido(contenido: ContenidoElemento): contenido is ContenidoTextoBase {
  return contenido.tipo === 'TEXTO';
}

function isImagenContenido(contenido: ContenidoElemento): contenido is ContenidoImagenBase {
  return contenido.tipo === 'IMAGEN';
}

function isVideoContenido(contenido: ContenidoElemento): contenido is ContenidoVideoBase {
  return contenido.tipo === 'VIDEO';
}

function isTablaContenido(contenido: ContenidoElemento): contenido is ContenidoTablaBase {
  return contenido.tipo === 'TABLA';
}

function crearTransform(posicion: Required<Posicion>): slides_v1.Schema$AffineTransform {
  return {
    scaleX: 1,
    scaleY: 1,
    translateX: posicion.x,
    translateY: posicion.y,
    unit: posicion.unidad
  };
}

function crearSize(tamaño: Required<Tamaño>): slides_v1.Schema$Size {
  return {
    width: { magnitude: tamaño.ancho, unit: tamaño.unidad },
    height: { magnitude: tamaño.alto, unit: tamaño.unidad }
  };
} 