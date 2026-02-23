import { slides_v1 } from 'googleapis';
import { SlidesService } from './SlidesService';
import { PLANTILLAS } from '@/app/editor-proyectos/plantilla/templates';
import { hexToRgb, LAYOUTS } from './plantilla-layouts';

export { hexToRgb, LAYOUTS };
export type { LayoutElement } from './plantilla-layouts';

const SLIDE_ID = 'slide_plantilla_0';

export class PlantillaTemplateService {
  constructor(private slidesService: SlidesService) {}

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

    // Para flujo generate: NO crear slide plantilla con formas. Dejar la slide por defecto en blanco.
    // El process creará N slides con datos y al final eliminará esa slide vacía.
    // Así la diapositiva 1 tendrá datos (no quedará en blanco).
    // No llamar actualizarPresentacion con requests vacíos: Google exige al menos 1 request.
    return { presentationId, slideId: firstSlideId || SLIDE_ID };
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
