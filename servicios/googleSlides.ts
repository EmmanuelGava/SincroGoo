"use client"

/**
 * Servicio para interactuar con la API de Google Slides
 */

import { getSession } from "next-auth/react";
import { getCacheKey, getCacheItem, setCacheItem, shouldRefreshCache } from "@/lib/cache-service";
import { canMakeRequest, recordRequest, waitForRateLimit } from "@/lib/rate-limiter";
import { VistaPreviaDiapositiva, ElementoDiapositiva, ActualizacionDiapositiva } from "@/tipos/diapositivas";
import { ServicioApi } from './api';
import { ResultadoServicio } from '@/tipos/servicios';

export interface ResultadoAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export interface Presentacion {
  id: string;
  titulo: string;
  diapositivas: VistaPreviaDiapositiva[];
}

export interface ActualizacionElemento {
  idDiapositiva: string;
  idElemento: string;
  contenidoNuevo: string;
}

export class ServicioGoogleSlides extends ServicioApi {
  protected urlBase = 'https://slides.googleapis.com/v1/presentations';
  private static instancia: ServicioGoogleSlides;

  static async obtenerInstancia(): Promise<ServicioGoogleSlides | null> {
    if (!this.instancia) {
      const session = await getSession();
      if (!session?.accessToken) return null;
      this.instancia = new ServicioGoogleSlides(session.accessToken as string);
    }
    return this.instancia;
  }

  // Caché para almacenar las vistas previas de las diapositivas
  private cacheVistasPrevias: { [key: string]: { datos: VistaPreviaDiapositiva[], timestamp: number } } = {};
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Caché para almacenar los elementos de las diapositivas
  private cacheElementos: { [key: string]: { datos: ElementoDiapositiva[], timestamp: number } } = {};

  async obtenerVistasPrevias(idPresentacion: string): Promise<ResultadoServicio<VistaPreviaDiapositiva[]>> {
    try {
      console.log('Obteniendo vistas previas para presentación:', idPresentacion);
      
      // Verificar si hay datos en caché y si son válidos
      const ahora = Date.now();
      if (this.cacheVistasPrevias[idPresentacion] && 
          (ahora - this.cacheVistasPrevias[idPresentacion].timestamp) < this.CACHE_DURATION) {
        console.log('Usando vistas previas en caché para presentación:', idPresentacion);
        return {
          exito: true,
          datos: this.cacheVistasPrevias[idPresentacion].datos
        };
      }
      
      const respuesta = await this.fetchConAuth<any>(`${this.urlBase}/${idPresentacion}`);
      
      if (!respuesta.slides) {
        console.error('No se encontraron diapositivas en la respuesta:', respuesta);
        return {
          exito: false,
          error: 'No se encontraron diapositivas en la presentación'
        };
      }

      // Construir las vistas previas usando nuestra API de miniaturas
      const vistasPrevia = respuesta.slides.map((slide: any, index: number) => {
        // Construir URL a nuestra API de miniaturas
        const thumbnailUrl = `/api/thumbnails?presentationId=${idPresentacion}&slideId=${slide.objectId}`;
        
        return {
          id: slide.objectId,
          titulo: slide.pageElements?.find((element: any) => 
            element.shape?.shapeType === 'TEXT_BOX')?.shape?.text?.textElements?.[0]?.textRun?.content 
            || `Diapositiva ${index + 1}`,
          urlImagen: thumbnailUrl,
          indice: index
        };
      });

      // Guardar en caché
      this.cacheVistasPrevias[idPresentacion] = {
        datos: vistasPrevia,
        timestamp: Date.now()
      };

      console.log('Vistas previas obtenidas:', vistasPrevia);
      return {
        exito: true,
        datos: vistasPrevia
      };
    } catch (error) {
      console.error('Error al obtener vistas previas:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async obtenerElementos(idPresentacion: string, idDiapositiva: string): Promise<ResultadoServicio<ElementoDiapositiva[]>> {
    try {
      console.log('Obteniendo elementos para diapositiva:', idDiapositiva);
      
      // Clave de caché única para esta combinación de presentación y diapositiva
      const cacheKey = `${idPresentacion}_${idDiapositiva}`;
      
      // Verificar si hay datos en caché y si son válidos
      const ahora = Date.now();
      if (this.cacheElementos[cacheKey] && 
          (ahora - this.cacheElementos[cacheKey].timestamp) < this.CACHE_DURATION) {
        console.log('Usando elementos en caché para diapositiva:', idDiapositiva);
        return {
          exito: true,
          datos: this.cacheElementos[cacheKey].datos
        };
      }
      
      const respuesta = await this.fetchConAuth<any>(`${this.urlBase}/${idPresentacion}/pages/${idDiapositiva}`);
      
      if (!respuesta.pageElements) {
        console.error('No se encontraron elementos en la respuesta:', respuesta);
        return {
          exito: false,
          error: 'No se encontraron elementos en la diapositiva'
        };
      }

      const elementos = respuesta.pageElements
        .filter((element: any) => element.shape?.shapeType === 'TEXT_BOX')
        .map((element: any) => ({
          id: element.objectId,
          tipo: 'texto',
          contenido: element.shape?.text?.textElements
            ?.map((textElement: any) => textElement.textRun?.content || '')
            .join('') || '',
          idDiapositiva
        }));

      // Guardar en caché
      this.cacheElementos[cacheKey] = {
        datos: elementos,
        timestamp: Date.now()
      };

      console.log('Elementos obtenidos:', elementos);
      return {
        exito: true,
        datos: elementos
      };
    } catch (error) {
      console.error('Error al obtener elementos:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async actualizarElementos(idPresentacion: string, actualizacion: ActualizacionDiapositiva): Promise<ResultadoServicio<void>> {
    try {
      console.log('Actualizando elementos:', actualizacion);
      
      // Crear un array de solicitudes para cada elemento
      const requests = [];
      
      // Para cada elemento, primero eliminamos todo el texto y luego insertamos el nuevo
      for (const elemento of actualizacion.elementos) {
        // Primero añadimos la solicitud para eliminar todo el texto existente
        requests.push({
          deleteText: {
            objectId: elemento.id,
            textRange: {
              type: 'ALL'
            }
          }
        });
        
        // Luego añadimos la solicitud para insertar el nuevo texto
        requests.push({
          insertText: {
            objectId: elemento.id,
            text: elemento.contenido,
            insertionIndex: 0
          }
        });
      }

      console.log('Solicitudes a enviar:', JSON.stringify(requests, null, 2));
      
      // Realizar la solicitud batchUpdate a la API de Google Slides
      const responseData = await this.fetchConAuth(`${this.urlBase}/${idPresentacion}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
      
      console.log('Respuesta de la API:', responseData);
      
      // Si llegamos aquí sin errores, la actualización fue exitosa
      console.log('Elementos actualizados correctamente');
      return {
        exito: true
      };
    } catch (error) {
      console.error('Error al actualizar elementos:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene información básica de una presentación
   */
  async obtenerPresentacion(id: string): Promise<ResultadoAPI<Presentacion>> {
    try {
      console.log(`Iniciando obtenerPresentacion para ID: ${id}`);
      
      // Verificar caché
      const cacheKey = getCacheKey('presentation-info', id);
      const cachedData = getCacheItem<Presentacion>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando datos en caché para presentación:', id);
        return { exito: true, datos: cachedData };
      }
      
      // Verificar límite de peticiones
      if (!canMakeRequest()) {
        await waitForRateLimit();
      }
      
      // Registrar petición
      recordRequest();
      
      console.log(`Obteniendo presentación con ID: ${id}, token: ${this.token ? 'presente' : 'ausente'}`);
      
      // Verificar que el token esté presente
      if (!this.token) {
        console.error('No hay token de acceso disponible');
        return {
          exito: false,
          error: 'No hay token de acceso disponible. Por favor, inicia sesión nuevamente.',
          codigo: 401
        };
      }
      
      const url = `${this.urlBase}/${id}`;
      console.log(`URL de la petición: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Respuesta recibida con status: ${response.status}`);
      
      if (!response.ok) {
        const responseText = await response.text().catch(e => `Error al leer respuesta: ${e.message}`);
        console.error(`Error en respuesta (${response.status}):`, responseText);
        
        let errorMessage = `Error al obtener la presentación (${response.status})`;
        
        // Intentar parsear como JSON por si acaso
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
            console.error('Mensaje de error de la API:', errorMessage);
          }
        } catch (parseError) {
          // Si no es JSON, usar el texto como está
          console.error('La respuesta de error no es JSON:', parseError);
          errorMessage = `${errorMessage}: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`;
        }
        
        return {
          exito: false,
          error: errorMessage,
          codigo: response.status
        };
      }
      
      // Leer la respuesta como texto primero
      const responseText = await response.text().catch(e => {
        console.error('Error al leer el texto de la respuesta:', e);
        return '';
      });
      
      if (!responseText.trim()) {
        console.error('Respuesta vacía de la API');
        return {
          exito: false,
          error: 'La API devolvió una respuesta vacía',
          codigo: 500
        };
      }
      
      // Intentar parsear el JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Datos de presentación obtenidos correctamente');
      } catch (error) {
        console.error('Error al parsear JSON:', error);
        console.error('Texto recibido:', responseText.substring(0, 200));
        return {
          exito: false,
          error: 'Error al parsear la respuesta JSON',
          codigo: 500
        };
      }
      
      // Verificar que los datos tengan la estructura esperada
      if (!data.presentationId || !data.slides) {
        console.error('Datos de presentación incompletos:', data);
        return {
          exito: false,
          error: 'La respuesta no contiene los datos esperados de la presentación',
          codigo: 500
        };
      }
      
      console.log(`Presentación encontrada: ${data.title} con ${data.slides.length} diapositivas`);
      
      // Transformar datos
      const presentacion: Presentacion = {
        id: data.presentationId,
        titulo: data.title || 'Presentación sin título',
        diapositivas: data.slides.map((slide: any, index: number) => {
          const slideId = slide.objectId;
          const titulo = slide.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId || `Diapositiva ${index + 1}`;
          
          return {
            id: slideId,
            titulo,
            urlImagen: '', // Se llenará después al obtener las miniaturas
            indice: index
          };
        })
      };
      
      // Guardar en caché
      setCacheItem(cacheKey, presentacion);
      
      return { exito: true, datos: presentacion };
    } catch (error) {
      console.error('Error al obtener presentación:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Obtiene las miniaturas de las diapositivas
   */
  async obtenerMiniaturas(idPresentacion: string): Promise<ResultadoAPI<VistaPreviaDiapositiva[]>> {
    try {
      console.log(`Obteniendo miniaturas para la presentación ${idPresentacion}`);
      
      // Verificar caché
      const cacheKey = getCacheKey('presentation-thumbnails', idPresentacion);
      const cachedData = getCacheItem<VistaPreviaDiapositiva[]>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando miniaturas en caché para presentación:', idPresentacion);
        return { exito: true, datos: cachedData };
      }
      
      // Obtener información de la presentación primero
      console.log('Obteniendo información de la presentación...');
      const respuestaPresentacion = await this.obtenerPresentacion(idPresentacion);
      
      if (!respuestaPresentacion.exito || !respuestaPresentacion.datos) {
        console.error("Error al obtener presentación:", respuestaPresentacion.error);
        return {
          exito: false,
          error: respuestaPresentacion.error || 'Error al obtener información de la presentación',
          codigo: respuestaPresentacion.codigo
        };
      }
      
      const presentacion = respuestaPresentacion.datos;
      console.log(`Presentación obtenida: ${presentacion.titulo} con ${presentacion.diapositivas.length} diapositivas`);
      
      // Crear array de miniaturas con la información básica
      const miniaturas: VistaPreviaDiapositiva[] = [];
      
      // Procesar cada diapositiva para obtener su miniatura
      for (let i = 0; i < presentacion.diapositivas.length; i++) {
        const diapositiva = presentacion.diapositivas[i];
        try {
          // Verificar límite de peticiones
          if (!canMakeRequest()) {
            await waitForRateLimit();
          }
          
          // Registrar petición
          recordRequest();
          
          // Construir URL para la miniatura
          const urlMiniatura = `${this.urlBase}/${idPresentacion}/pages/${diapositiva.id}/thumbnail?thumbnailProperties.thumbnailSize=MEDIUM`;
          
          console.log(`Obteniendo miniatura para diapositiva ${i+1}/${presentacion.diapositivas.length}: ${diapositiva.id}`);
          
          const response = await fetch(urlMiniatura, {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            // Si hay error, usar una imagen de placeholder
            console.warn(`Error al obtener miniatura (${response.status}): ${await response.text().catch(() => 'No se pudo leer el texto de respuesta')}`);
            miniaturas.push({
              id: diapositiva.id,
              titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
              urlImagen: '/placeholder-slide.png',
              indice: i
            });
            continue;
          }
          
          // Leer la respuesta como texto primero
          const responseText = await response.text();
          
          // Verificar si el texto está vacío
          if (!responseText.trim()) {
            console.warn('Respuesta vacía al obtener miniatura');
            miniaturas.push({
              id: diapositiva.id,
              titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
              urlImagen: '/placeholder-slide.png',
              indice: i
            });
            continue;
          }
          
          // Intentar parsear el JSON
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Error al parsear JSON de miniatura:', parseError);
            console.error('Texto recibido:', responseText.substring(0, 200));
            miniaturas.push({
              id: diapositiva.id,
              titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
              urlImagen: '/placeholder-slide.png',
              indice: i
            });
            continue;
          }
          
          // Verificar si contentUrl existe
          if (!data.contentUrl) {
            console.warn('No se encontró contentUrl en la respuesta');
            miniaturas.push({
              id: diapositiva.id,
              titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
              urlImagen: '/placeholder-slide.png',
              indice: i
            });
            continue;
          }
          
          // Agregar la miniatura con la URL de la imagen
          miniaturas.push({
            id: diapositiva.id,
            titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
            urlImagen: data.contentUrl,
            indice: i
          });
          
          // Pequeña pausa para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.warn(`Error al procesar miniatura para diapositiva ${diapositiva.id}:`, error);
          // Agregar una entrada con imagen de placeholder
          miniaturas.push({
            id: diapositiva.id,
            titulo: diapositiva.titulo || `Diapositiva ${i+1}`,
            urlImagen: '/placeholder-slide.png',
            indice: i
          });
        }
      }
      
      console.log(`Se obtuvieron ${miniaturas.length} miniaturas de diapositivas`);
      
      // Guardar en caché solo si se obtuvieron miniaturas
      if (miniaturas.length > 0) {
        setCacheItem(cacheKey, miniaturas);
      }
      
      return { exito: true, datos: miniaturas };
    } catch (error) {
      console.error('Error al obtener miniaturas:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Obtiene una lista de presentaciones del usuario
   */
  async listarPresentaciones(): Promise<ResultadoAPI<{ id: string, nombre: string }[]>> {
    try {
      // Verificar caché
      const cacheKey = getCacheKey('presentations-list', 'user');
      const cachedData = getCacheItem<{ id: string, nombre: string }[]>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando lista de presentaciones en caché');
        return { exito: true, datos: cachedData };
      }
      
      // Verificar límite de peticiones
      if (!canMakeRequest()) {
        await waitForRateLimit();
      }
      
      // Registrar petición
      recordRequest();
      
      // Usar Drive API para listar archivos de tipo presentation
      const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.presentation"&fields=files(id,name)', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          exito: false,
          error: errorData.error?.message || 'Error al listar presentaciones',
          codigo: response.status
        };
      }
      
      const data = await response.json();
      
      // Transformar datos
      const presentaciones = data.files.map((file: any) => ({
        id: file.id,
        nombre: file.name
      }));
      
      // Guardar en caché
      setCacheItem(cacheKey, presentaciones);
      
      return { exito: true, datos: presentaciones };
    } catch (error) {
      console.error('Error al listar presentaciones:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async obtenerElementosDiapositiva(idPresentacion: string, idDiapositiva: string): Promise<ResultadoServicio<ElementoDiapositiva[]>> {
    try {
      console.log('Obteniendo elementos para diapositiva:', idDiapositiva);
      const response = await this.fetchConAuth<any>(`${this.urlBase}/${idPresentacion}/pages/${idDiapositiva}`);
      
      if (!response.pageElements) {
        console.error('No se encontraron elementos en la respuesta:', response);
        return {
          exito: false,
          error: 'No se encontraron elementos en la diapositiva',
          timestamp: new Date()
        };
      }

      const elementos = response.pageElements
        .filter((element: any) => element.shape?.shapeType === 'TEXT_BOX')
        .map((element: any) => ({
          id: element.objectId,
          tipo: 'texto',
          contenido: element.shape?.text?.textElements
            ?.map((textElement: any) => textElement.textRun?.content || '')
            .join('') || '',
          idDiapositiva
        }));

      console.log('Elementos obtenidos:', elementos);
      return {
        exito: true,
        datos: elementos,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al obtener elementos:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }
} 