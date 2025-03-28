import { ServiceResult, SlidePreview, SlideUpdate, SlideReplacement, SlideElement } from './types';
import { ApiService } from './api-service';
import { fetchWithAuth } from "./api-service"

export class SlidesService extends ApiService {
  protected baseUrl = 'https://slides.googleapis.com/v1';
  protected token: string;

  constructor(token: string) {
    super(token);
    this.token = token;
    // Guardar el token para que esté disponible al cargar imágenes
    if (typeof window !== 'undefined') {
      localStorage.setItem('googleAccessToken', token);
    }
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

  async getSlideInfo(presentationId: string, slideId: string): Promise<{ success: boolean; data?: SlidePreview; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/presentations/${presentationId}/pages/${slideId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener información del slide: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          id: data.objectId,
          title: data.pageProperties?.title || 'Sin título',
          imageUrl: `${this.baseUrl}/presentations/${presentationId}/pages/${slideId}/thumbnail`
        }
      };
    } catch (error) {
      console.error('Error en getSlideInfo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async getSlideElements(presentationId: string, slideId: string): Promise<{ success: boolean; data?: SlideElement[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/presentations/${presentationId}/pages/${slideId}?fields=pageElements`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener elementos: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.pageElements) {
        return { success: true, data: [] };
      }

      const elements = data.pageElements
        .filter((element: any) => element.shape?.text?.textElements)
        .map((element: any) => ({
          id: element.objectId,
          slideId,
          content: element.shape.text.textElements
            .map((textElement: any) => textElement.textRun?.content || '')
            .join('')
        }))
        .filter((element: any) => element.content.trim() !== '');

      return { success: true, data: elements };
    } catch (error) {
      console.error('Error en getSlideElements:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async updateSlideElements(presentationId: string, slideId: string, elements: SlideElement[]): Promise<{ success: boolean; error?: string }> {
    try {
      const requests = elements.map(element => ({
        replaceAllText: {
          containsText: {
            text: '{{' + element.id + '}}',
            matchCase: true
          },
          replaceText: element.content,
          pageObjectIds: [slideId]
        }
      }));

      const response = await fetch(
        `${this.baseUrl}/presentations/${presentationId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests })
        }
      );

      if (!response.ok) {
        throw new Error(`Error al actualizar elementos: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error en updateSlideElements:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async fetchSlidePreviews(presentationId: string): Promise<{ success: boolean; data?: SlidePreview[]; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/presentations/${presentationId}?fields=slides.objectId,slides.slideProperties.title`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener diapositivas: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.slides) {
        return { success: false, error: 'No se encontraron diapositivas' };
      }

      const slides = data.slides.map((slide: any) => ({
        id: slide.objectId,
        title: slide.slideProperties?.title || 'Sin título',
        imageUrl: `${this.baseUrl}/presentations/${presentationId}/pages/${slide.objectId}/thumbnail`
      }));

      console.log(`Se obtuvieron ${slides.length} miniaturas de diapositivas`);
      return { success: true, data: slides };
    } catch (error) {
      console.error('Error en fetchSlidePreviews:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
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