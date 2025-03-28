import { ServicioApi, ResultadoAPI } from '../google/api';
import { ElementoDiapositiva } from '@/tipos/diapositivas';

export interface Presentacion {
  presentationId: string;
  title: string;
  slides?: any[];
}

export interface ElementoSlide {
  tipo: 'TITLE' | 'SUBTITLE' | 'TABLE';
  texto?: string;
  datos?: any[][];
}

export class SlidesService extends ServicioApi {
  private static instancia: SlidesService | null = null;
  protected urlBase = 'https://slides.googleapis.com/v1/presentations';

  private constructor() {
    super();
  }

  static async obtenerInstancia(): Promise<SlidesService> {
    if (!SlidesService.instancia) {
      SlidesService.instancia = new SlidesService();
    }
    return SlidesService.instancia;
  }

  async crearPresentacion(nombre: string): Promise<ResultadoAPI<Presentacion>> {
    console.log('📊 Creando presentación:', nombre);
    
    const resultado = await this.fetchConAuth(this.urlBase, {
      method: 'POST',
      body: JSON.stringify({
        title: nombre
      })
    });

    if (!resultado.exito) {
      console.error('❌ Error al crear presentación:', resultado.error);
    } else {
      console.log('✅ Presentación creada con éxito');
    }

    return resultado;
  }

  async crearDiapositiva(
    presentacionId: string,
    layout: string,
    elementos: ElementoSlide[]
  ): Promise<ResultadoAPI<any>> {
    const requests = [];

    // Mapear los layouts personalizados a los predefinidos de la API
    const layoutMap: { [key: string]: string } = {
      'TITLE_AND_SUBTITLE': 'TITLE',
      'TITLE_AND_BODY': 'TITLE_AND_BODY',
      'TITLE_ONLY': 'TITLE_ONLY',
      'BLANK': 'BLANK'
    };

    // Obtener el layout predefinido correcto o usar BLANK como fallback
    const predefinedLayout = layoutMap[layout] || 'BLANK';

    // Crear la diapositiva
    requests.push({
      createSlide: {
        slideLayoutReference: {
          predefinedLayout
        }
      }
    });

    // Agregar elementos
    elementos.forEach((elemento, index) => {
      if (elemento.tipo === 'TITLE' || elemento.tipo === 'SUBTITLE') {
        requests.push({
          insertText: {
            objectId: `elemento_${index}`,
            text: elemento.texto || ''
          }
        });
      } else if (elemento.tipo === 'TABLE' && elemento.datos) {
        requests.push({
          createTable: {
            elementProperties: {
              pageObjectId: `tabla_${index}`
            },
            rows: elemento.datos.length,
            columns: elemento.datos[0]?.length || 0
          }
        });

        // Insertar datos en la tabla
        elemento.datos.forEach((fila, i) => {
          fila.forEach((celda, j) => {
            requests.push({
              insertText: {
                objectId: `celda_${i}_${j}`,
                text: String(celda || '')
              }
            });
          });
        });
      }
    });

    console.log('Petición para crear diapositiva:', JSON.stringify(requests, null, 2));

    const url = `${this.urlBase}/${presentacionId}:batchUpdate`;
    const resultado = await this.fetchConAuth(url, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });

    if (!resultado.exito) {
      console.error('❌ Error al crear diapositiva:', resultado.error);
    } else {
      console.log('✅ Diapositiva creada con éxito');
    }

    return resultado;
  }

  async actualizarDiapositiva(
    presentacionId: string,
    slideId: string,
    elementos: ElementoSlide[]
  ): Promise<ResultadoAPI<any>> {
    const requests = elementos.map((elemento, index) => {
      if (elemento.tipo === 'TITLE' || elemento.tipo === 'SUBTITLE') {
        return {
          insertText: {
            objectId: `elemento_${index}`,
            text: elemento.texto || ''
          }
        };
      }
      return null;
    }).filter(Boolean);

    const url = `${this.urlBase}/${presentacionId}:batchUpdate`;
    const resultado = await this.fetchConAuth(url, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });

    if (!resultado.exito) {
      console.error('❌ Error al actualizar diapositiva:', resultado.error);
    } else {
      console.log('✅ Diapositiva actualizada con éxito');
    }

    return resultado;
  }

  async obtenerPresentacion(presentacionId: string): Promise<ResultadoAPI<Presentacion>> {
    const url = `${this.urlBase}/${presentacionId}`;
    const resultado = await this.fetchConAuth(url);

    if (!resultado.exito) {
      console.error('❌ Error al obtener presentación:', resultado.error);
    } else {
      console.log('✅ Presentación obtenida con éxito');
    }

    return resultado;
  }
} 