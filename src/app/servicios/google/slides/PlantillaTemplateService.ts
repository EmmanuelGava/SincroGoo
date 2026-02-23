import { slides_v1 } from 'googleapis';
import { SlidesService } from './SlidesService';
import { PLANTILLAS } from '@/app/editor-proyectos/plantilla/templates';

/** Convierte hex (#RRGGBB) a rgb normalizado 0-1 para Slides API */
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return { red: r, green: g, blue: b };
}

interface LayoutElement {
  placeholder: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  bold?: boolean;
}

/** Posiciones (pt) por plantilla. Slide ≈ 720x405 pt */
const LAYOUTS: Record<string, LayoutElement[]> = {
  catalogo_productos: [
    { placeholder: 'Imagen', x: 40, y: 30, w: 400, h: 200, fontSize: 12 },
    { placeholder: 'Nombre', x: 40, y: 240, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Precio', x: 40, y: 300, w: 200, h: 40, fontSize: 24 },
    { placeholder: 'Descripción', x: 40, y: 350, w: 620, h: 50, fontSize: 14 }
  ],
  ficha_cliente: [
    { placeholder: 'Nombre', x: 40, y: 30, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Teléfono', x: 40, y: 100, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Email', x: 40, y: 140, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Dirección', x: 40, y: 180, w: 300, h: 50, fontSize: 14 },
    { placeholder: 'Notas', x: 380, y: 100, w: 300, h: 200, fontSize: 14 }
  ],
  ficha_local: [
    { placeholder: 'Nombre', x: 40, y: 30, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Dirección', x: 40, y: 100, w: 620, h: 35, fontSize: 16 },
    { placeholder: 'Teléfono', x: 40, y: 145, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Sitio Web', x: 40, y: 185, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Calificación', x: 40, y: 225, w: 200, h: 35, fontSize: 18 }
  ],
  propuesta_comercial: [
    { placeholder: 'Empresa', x: 40, y: 30, w: 620, h: 50, fontSize: 26, bold: true },
    { placeholder: 'Servicio', x: 40, y: 100, w: 620, h: 120, fontSize: 16 },
    { placeholder: 'Precio', x: 40, y: 240, w: 300, h: 45, fontSize: 22 },
    { placeholder: 'Condiciones', x: 40, y: 300, w: 620, h: 80, fontSize: 14 }
  ],
  reporte_simple: [
    { placeholder: 'Título', x: 40, y: 30, w: 620, h: 45, fontSize: 24, bold: true },
    { placeholder: 'Dato1', x: 40, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Dato2', x: 380, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Observaciones', x: 40, y: 195, w: 620, h: 160, fontSize: 14 }
  ],
  blanco: []
};

const SLIDE_ID = 'slide_plantilla_0';

export class PlantillaTemplateService {
  constructor(private slidesService: SlidesService) {}

  /**
   * Crea una presentación en Google Slides a partir de una plantilla predefinida.
   * @param templateId ID de la plantilla (catalogo_productos, ficha_cliente, etc.)
   * @param titulo Título de la presentación
   */
  async crearPresentacionDesdePlantilla(
    templateId: string,
    titulo: string
  ): Promise<{ presentationId: string; slideId: string } | null> {
    const plantilla = PLANTILLAS.find(p => p.id === templateId);
    if (!plantilla) return null;

    const resultado = await this.slidesService.crearPresentacion({ titulo });
    if (!resultado.exito || !resultado.datos) return null;

    const presentationId = (resultado.datos as { presentationId?: string }).presentationId;
    if (!presentationId) return null;

    const slides = (resultado.datos as { slides?: { objectId?: string }[] }).slides;
    const firstSlideId = slides?.[0]?.objectId;

    const requests: slides_v1.Schema$Request[] = [];

    if (templateId === 'blanco') {
      if (firstSlideId) {
        requests.push(this.crearRequestFondo(firstSlideId, plantilla.bgColor));
      }
      await this.slidesService.actualizarPresentacion(presentationId, requests);
      return {
        presentationId,
        slideId: firstSlideId || SLIDE_ID
      };
    }

    // Insertar slide en blanco en índice 1 y eliminar el primero
    await this.slidesService.insertarDiapositiva(presentationId, 1, 'EN_BLANCO', SLIDE_ID);
    if (firstSlideId) {
      requests.push({ deleteObject: { objectId: firstSlideId } });
    }

    requests.push(this.crearRequestFondo(SLIDE_ID, plantilla.bgColor));

    const layout = LAYOUTS[templateId];
    if (layout) {
      for (const el of layout) {
        const shapeId = `shape_${el.placeholder.replace(/\s/g, '_')}`;
        requests.push(
          this.crearRequestCreateShape(SLIDE_ID, shapeId, el.x, el.y, el.w, el.h)
        );
        const texto = `{{${el.placeholder}}}`;
        requests.push(this.crearRequestInsertText(shapeId, texto));
        if (el.fontSize !== undefined) {
          requests.push(
            this.crearRequestUpdateTextStyle(shapeId, plantilla.textColor, el.fontSize, el.bold)
          );
        }
      }
    }

    await this.slidesService.actualizarPresentacion(presentationId, requests);

    return { presentationId, slideId: SLIDE_ID };
  }

  private crearRequestFondo(
    slideId: string,
    hexColor: string
  ): slides_v1.Schema$Request {
    const rgb = hexToRgb(hexColor);
    return {
      updatePageProperties: {
        objectId: slideId,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: {
              color: {
                rgbColor: { red: rgb.red, green: rgb.green, blue: rgb.blue }
              }
            }
          }
        },
        fields: 'pageBackgroundFill.solidFill.color'
      }
    };
  }

  private crearRequestCreateShape(
    slideId: string,
    objectId: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): slides_v1.Schema$Request {
    return {
      createShape: {
        objectId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: w, unit: 'PT' },
            height: { magnitude: h, unit: 'PT' }
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: 'PT'
          }
        }
      }
    };
  }

  private crearRequestInsertText(objectId: string, text: string): slides_v1.Schema$Request {
    return {
      insertText: {
        objectId,
        text,
        insertionIndex: 0
      }
    };
  }

  private crearRequestUpdateTextStyle(
    objectId: string,
    hexColor: string,
    fontSize: number,
    bold?: boolean
  ): slides_v1.Schema$Request {
    const rgb = hexToRgb(hexColor);
    return {
      updateTextStyle: {
        objectId,
        style: {
          foregroundColor: {
            opaqueColor: {
              rgbColor: { red: rgb.red, green: rgb.green, blue: rgb.blue }
            }
          },
          fontSize: { magnitude: fontSize, unit: 'PT' },
          bold: bold ?? false
        },
        textRange: { type: 'ALL' },
        fields: 'foregroundColor,fontSize,bold'
      }
    };
  }
}
