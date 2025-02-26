import { ServiceResult, SlidePreview, SlideUpdate, SlideReplacement } from '../lib/types';
import { ApiService } from './api-service';
import { fetchWithAuth } from "./api-service"

export class SlidesService extends ApiService {
  protected baseUrl = 'https://slides.googleapis.com/v1';

  constructor(token: string) {
    super(token);
  }

  private getThumbnailUrl(presentationId: string, slideNumber: number): string {
    // Usar la API de exportación de Google Slides en lugar de Drive
    return `https://docs.google.com/presentation/d/${presentationId}/export/png?pageid=${slideNumber}&access_token=${this.token}`;
  }

  async verifyDocument(presentationId: string) {
    try {
      const response = await fetchWithAuth(
        `${this.baseUrl}/presentations/${presentationId}?fields=presentationId,title`,
        {
          method: "GET",
        }
      )

      if (!response.ok) {
        console.error("Error verificando presentación:", await response.text())
        return { success: false }
      }

      const data = await response.json()
      return { 
        success: true, 
        data: {
          id: data.presentationId,
          name: data.title
        }
      }
    } catch (error) {
      console.error("Error en verifyDocument:", error)
      return { success: false }
    }
  }

  async fetchSlidePreviews(presentationId: string): Promise<ServiceResult<SlidePreview[]>> {
    try {
      if (!this.token) {
        return this.createErrorResult('No hay token de autenticación disponible');
      }

      console.log('Iniciando obtención de slides:', {
        presentationId,
        tokenPresente: !!this.token
      });
      
      // Obtener información de la presentación
      const presentation = await this.fetchWithAuth<{
        presentationId: string,
        title: string,
        slides: Array<{
          objectId: string,
          pageElements?: Array<{
            objectId: string,
            shape?: {
              shapeType: string,
              text?: {
                textElements?: Array<{
                  textRun?: {
                    content: string
                  }
                }>
              }
            }
          }>,
          slideProperties?: {
            layoutProperties?: {
              displayName?: string
            },
            notesPage?: {
              notesProperties?: {
                speakerNotesObjectId?: string
              }
            }
          }
        }>
      }>(`${this.baseUrl}/presentations/${presentationId}`);

      console.log('Información de presentación obtenida:', {
        tieneSlides: !!presentation.slides,
        cantidadSlides: presentation.slides?.length || 0
      });
      
      if (!presentation.slides || presentation.slides.length === 0) {
        console.warn('No se encontraron slides en la presentación');
        return this.createSuccessResult([]);
      }

      // Procesar cada slide para obtener su título y contenido
      const previews: SlidePreview[] = await Promise.all(
        presentation.slides.map(async (slide, index) => {
          // Intentar obtener el título del slide de varias fuentes
          let title = `Slide ${index + 1}`;
          let content = '';

          // 1. Buscar en las propiedades del layout
          if (slide.slideProperties?.layoutProperties?.displayName) {
            title = slide.slideProperties.layoutProperties.displayName;
          }

          // 2. Buscar en los elementos de texto
          if (slide.pageElements) {
            const textElements = slide.pageElements
              .filter(element => element.shape?.text?.textElements)
              .flatMap(element => 
                element.shape!.text!.textElements!
                  .map(textElement => textElement.textRun?.content || '')
                  .filter(text => text.trim() !== '')
              );

            if (textElements.length > 0) {
              // Usar el primer elemento de texto como título si no tenemos uno
              if (title === `Slide ${index + 1}`) {
                title = textElements[0].substring(0, 50); // Limitar longitud
              }
              content = textElements.join(' ').substring(0, 200); // Limitar longitud
            }
          }

          // Esperar un poco entre solicitudes para evitar rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          return {
            id: slide.objectId,
            title,
            content,
            index: index + 1,
            imageUrl: this.getThumbnailUrl(presentationId, index + 1)
          };
        })
      );

      return this.createSuccessResult(previews);
    } catch (error) {
      console.error('Error detallado en obtención de slides:', {
        error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof Error) {
        if (error.message.includes('403')) {
          return this.createErrorResult('No tiene permisos suficientes para acceder a la presentación. Verifique que su cuenta tenga acceso.');
        }
        if (error.message.includes('401')) {
          return this.createErrorResult('La sesión ha expirado. Por favor, vuelva a iniciar sesión.');
        }
        if (error.message.includes('404')) {
          return this.createErrorResult('La presentación no existe o no tiene permisos de acceso. Por favor, verifique el ID.');
        }
        if (error.message.includes('429')) {
          return this.createErrorResult('Se han realizado demasiadas solicitudes. Por favor, espere un momento y vuelva a intentarlo.');
        }
        return this.createErrorResult(error.message);
      }
      return this.createErrorResult('Error desconocido al obtener vistas previas');
    }
  }

  async getSlideElements(presentationId: string, slideId: string) {
    try {
      // Obtener la presentación completa para encontrar el slide específico
      const presentation = await this.fetchWithAuth<{
        slides: Array<{
          objectId: string,
          pageElements?: Array<{
            objectId: string,
            shape?: {
              shapeType: string,
              text?: {
                textElements?: Array<{
                  textRun?: {
                    content: string
                  }
                }>
              }
            }
          }>
        }>
      }>(`${this.baseUrl}/presentations/${presentationId}`);

      const slide = presentation.slides.find(s => s.objectId === slideId);
      if (!slide || !slide.pageElements) {
        console.error("No se encontró el slide o no tiene elementos");
        return [];
      }

      // Filtrar y mapear solo los elementos que tienen texto
      return slide.pageElements
        .filter(element => element.shape?.text?.textElements)
        .map(element => ({
          id: element.objectId,
          type: element.shape?.shapeType || 'SHAPE',
          content: element.shape?.text?.textElements
            ?.map(t => t.textRun?.content || '')
            .join('') || ''
        }))
        .filter(element => element.content.trim() !== '');
    } catch (error) {
      console.error("Error en getSlideElements:", error)
      return []
    }
  }

  async updateSlideContent(presentationId: string, updates: SlideUpdate[]): Promise<ServiceResult<void>> {
    try {
      console.log('Actualizando contenido de slides:', updates);
      
      // Preparar las solicitudes de reemplazo
      const requests = updates.flatMap(update => 
        update.replacements.map((replacement: SlideReplacement) => ({
          replaceAllText: {
            containsText: {
              text: replacement.searchText,
              matchCase: true
            },
            replaceText: replacement.replaceText,
            pageObjectIds: [update.slideId]
          }
        }))
      );

      // Realizar la actualización
      await this.fetchWithAuth(`${this.baseUrl}/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests
        })
      });

      return this.createSuccessResult(undefined);
    } catch (error) {
      console.error('Error actualizando slides:', error);
      return this.createErrorResult(error instanceof Error ? error : 'Error desconocido al actualizar slides');
    }
  }
} 