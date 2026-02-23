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
