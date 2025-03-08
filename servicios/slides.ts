import { ElementoDiapositiva, VistaPreviaDiapositiva, ResultadoServicio } from '@/tipos/diapositivas';
import { ServicioApi } from './api';

export class ServicioSlides extends ServicioApi {
  protected urlBase = 'https://slides.googleapis.com/v1';

  constructor(token: string) {
    super(token);
  }

  async obtenerVistasPrevias(idPresentacion: string): Promise<ResultadoServicio<VistaPreviaDiapositiva[]>> {
    try {
      console.log('Obteniendo vistas previas para presentación:', idPresentacion);
      
      const datos = await this.fetchConAuth<any>(
        `${this.urlBase}/presentations/${idPresentacion}?fields=slides(objectId,slideProperties)`
      );
      
      if (!datos.slides) {
        console.warn('No se encontraron diapositivas en la presentación');
        return { 
          exito: false, 
          error: 'No se encontraron diapositivas',
          timestamp: new Date()
        };
      }

      console.log('Diapositivas encontradas:', datos.slides.length);

      const diapositivas = datos.slides.map((diapositiva: any) => ({
        id: diapositiva.objectId,
        titulo: diapositiva.slideProperties?.title || 'Sin título',
        urlImagen: `https://docs.google.com/presentation/d/${idPresentacion}/export/thumbnail?id=${idPresentacion}&pageid=${diapositiva.objectId}&access_token=${this.token}`
      }));

      return { 
        exito: true, 
        datos: diapositivas,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error en obtenerVistasPrevias:', error);
      return { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  async obtenerElementos(idPresentacion: string, idDiapositiva: string): Promise<ResultadoServicio<ElementoDiapositiva[]>> {
    try {
      const respuesta = await fetch(
        `${this.urlBase}/presentations/${idPresentacion}/pages/${idDiapositiva}?fields=pageElements`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!respuesta.ok) {
        throw new Error(`Error al obtener elementos: ${respuesta.status}`);
      }

      const datos = await respuesta.json();
      
      if (!datos.pageElements) {
        return { 
          exito: true, 
          datos: [],
          timestamp: new Date()
        };
      }

      const elementos = datos.pageElements
        .filter((elemento: any) => elemento.shape?.text?.textElements)
        .map((elemento: any) => ({
          id: elemento.objectId,
          idDiapositiva,
          contenido: elemento.shape.text.textElements
            .map((elementoTexto: any) => elementoTexto.textRun?.content || '')
            .join(''),
          tipo: this.determinarTipoElemento(elemento)
        }))
        .filter((elemento: ElementoDiapositiva) => elemento.contenido.trim() !== '');

      return { 
        exito: true, 
        datos: elementos,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error en obtenerElementos:', error);
      return { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  private determinarTipoElemento(elemento: any): ElementoDiapositiva['tipo'] {
    // Lógica para determinar el tipo basado en el estilo, posición o contenido
    if (elemento.shape?.text?.textElements[0]?.paragraphStyle?.level === 0) {
      return 'titulo';
    } else if (elemento.shape?.text?.textElements[0]?.paragraphStyle?.level === 1) {
      return 'subtitulo';
    } else if (elemento.shape?.text?.textElements[0]?.paragraphStyle?.bulletPreset) {
      return 'lista';
    } else if (elemento.table) {
      return 'tabla';
    }
    return 'texto';
  }

  async actualizarElementos(idPresentacion: string, idDiapositiva: string, elementos: ElementoDiapositiva[]): Promise<ResultadoServicio<void>> {
    try {
      const solicitudes = elementos.map(elemento => ({
        replaceAllText: {
          containsText: {
            text: '{{' + elemento.id + '}}',
            matchCase: true
          },
          replaceText: elemento.contenido,
          pageObjectIds: [idDiapositiva]
        }
      }));

      const respuesta = await fetch(
        `${this.urlBase}/presentations/${idPresentacion}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: solicitudes })
        }
      );

      if (!respuesta.ok) {
        throw new Error(`Error al actualizar elementos: ${respuesta.status}`);
      }

      return { 
        exito: true,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error en actualizarElementos:', error);
      return { 
        exito: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }
} 