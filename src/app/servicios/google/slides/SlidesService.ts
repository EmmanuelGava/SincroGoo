import { slides_v1 } from 'googleapis';
import { BaseGoogleService } from '../core/BaseGoogleService';
import { ResultadoAPI } from '../core/types';
import { APICache } from '../utils/cache';
import { rateLimiter } from '../utils/rate-limiting';
import { handleError } from '../utils/error-handling';
import { 
  Presentacion, 
  Diapositiva,
  OpcionesCreacion, 
  OpcionesActualizacion,
  VistaPreviaDiapositiva,
  ElementoDiapositiva,
  TipoLayout,
  GoogleSlideResponse
} from './types';
import { obtenerMiniaturas } from './operations/thumbnails';
import { 
  crearRequestInsertarDiapositiva,
  crearRequestActualizarDiapositiva,
  crearRequestEliminarDiapositiva,
  crearRequestDuplicarDiapositiva,
  crearRequestMoverDiapositiva
} from './operations/slides';
import {
  crearRequestElemento,
  crearRequestsActualizarElemento,
  extraerElementos,
  extraerTitulo
} from './operations/elements';
import { google } from 'googleapis';

export class SlidesService extends BaseGoogleService {
  protected serviceName = 'SlidesService';
  protected requiredScopes = ['https://www.googleapis.com/auth/presentations'];
  private static instance: SlidesService | null = null;
  protected cache: APICache;

  private constructor(accessToken: string) {
    super(accessToken);
    this.cache = APICache.getInstance();
  }

  public static getInstance(accessToken: string): SlidesService {
    if (!this.instance) {
      this.instance = new SlidesService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  protected async getGoogleAPI() {
    return google;
  }

  async obtenerPresentacion(presentationId: string): Promise<ResultadoAPI<Presentacion>> {
    this.logInfo('Obteniendo presentación:', presentationId);
    
    try {
      const slides = this.apiClient.slides('v1');
      const response = await slides.presentations.get({
        presentationId,
        auth: this.oauth2Client
      });

      const rawSlides = response.data.slides || [];
      this.logInfo('Diapositivas encontradas:', rawSlides.length);
      
      // Obtener miniaturas para todas las diapositivas
      const thumbnailPromises = rawSlides.map(async (slide) => {
        const slideId = slide.objectId || '';
        try {
          const thumbnailResponse = await slides.presentations.pages.getThumbnail({
            presentationId,
            pageObjectId: slideId,
            auth: this.oauth2Client
          });
          return { slideId, url: thumbnailResponse.data.contentUrl };
        } catch (error) {
          this.logError(`Error al obtener miniatura para diapositiva ${slideId}:`, error);
          return { slideId, url: null };
        }
      });

      const thumbnails = await Promise.all(thumbnailPromises);
      const thumbnailMap = new Map(thumbnails.map(t => [t.slideId, t.url]));
      
      const diapositivas: Diapositiva[] = rawSlides.map((slide, index) => {
        const slideId = slide.objectId || '';
        const urlImagen = thumbnailMap.get(slideId) || '';
        
        this.logInfo(`Construyendo datos para diapositiva ${slideId}:`, { urlImagen });
        
        return {
          id: slideId,
          indice: index,
          titulo: extraerTitulo(slide) || '',
          elementos: extraerElementos(slide),
          layout: this.determinarTipoLayout(slide),
          urlImagen,
          notas: slide.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId || ''
        };
      });

      const presentacion: Presentacion = {
        id: response.data.presentationId || '',
        nombre: response.data.title || '',
        slides: rawSlides,
        diapositivas,
        propietarios: [],
        fechaCreacion: new Date(),
        fechaModificacion: new Date().toISOString(),
        urlEdicion: '',
        urlVisualizacion: '',
        urlMiniaturas: []
      };

      this.logInfo('Datos procesados:', {
        nombre: presentacion.nombre,
        numSlides: presentacion.diapositivas.length,
        elementosTotales: presentacion.diapositivas.reduce((total, slide) => total + slide.elementos.length, 0),
        urlsMiniaturas: presentacion.diapositivas.map(d => d.urlImagen)
      });

      return {
        exito: true,
        datos: presentacion
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private determinarTipoLayout(slide: slides_v1.Schema$Page): TipoLayout {
    // Por ahora retornamos EN_BLANCO como valor por defecto
    // TODO: Implementar la lógica para determinar el tipo de layout basado en las propiedades de la diapositiva
    return 'EN_BLANCO';
  }

  async crearPresentacion(opciones: OpcionesCreacion): Promise<ResultadoAPI<GoogleSlideResponse>> {
    try {
      await rateLimiter.checkLimit('slides_create');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      const response = await slidesApi.presentations.create({
        requestBody: {
          title: opciones.titulo
        },
        auth: this.oauth2Client
      });

      return {
        exito: true,
        datos: response.data as GoogleSlideResponse
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async actualizarPresentacion(presentationId: string, updates: any[]): Promise<ResultadoAPI<void>> {
    try {
      await rateLimiter.checkLimit('slides_update');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      await slidesApi.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: updates
        },
        auth: this.oauth2Client
      });

      return {
        exito: true
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async obtenerMiniaturaSlide(presentationId: string, slideId: string): Promise<ResultadoAPI<string>> {
    try {
      const cacheKey = `thumbnail_${presentationId}_${slideId}`;
      const cachedThumbnail = this.cache.get<string>(cacheKey);
      
      if (cachedThumbnail) {
        return {
          exito: true,
          datos: cachedThumbnail
        };
      }

      await rateLimiter.checkLimit('slides_thumbnail');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      const response = await slidesApi.presentations.pages.getThumbnail({
        presentationId,
        pageObjectId: slideId,
        auth: this.oauth2Client
      });

      const thumbnail = response.data.contentUrl || '';
      
      // Guardar en caché por 24 horas
      this.cache.set(cacheKey, thumbnail, 24 * 60 * 60 * 1000);

      return {
        exito: true,
        datos: thumbnail
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async sincronizarCambios(presentationId: string, updates: any[]): Promise<ResultadoAPI<void>> {
    try {
      await rateLimiter.checkLimit('slides_sync');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      await slidesApi.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: updates
        },
        auth: this.oauth2Client
      });

      return {
        exito: true
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async eliminarPresentacion(presentationId: string): Promise<ResultadoAPI<void>> {
    try {
      await rateLimiter.checkLimit('slides_delete');
      const api = await this.getGoogleAPI();
      const driveApi = api.drive('v3');
      
      await driveApi.files.delete({
        fileId: presentationId,
        auth: this.oauth2Client
      });

      return {
        exito: true
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async obtenerVistasPrevias(presentacionId: string): Promise<ResultadoAPI<VistaPreviaDiapositiva[]>> {
    try {
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      const miniaturas = await obtenerMiniaturas(slidesApi, {
        presentacionId,
        tamaño: {
          ancho: 1600,
          alto: 900
        }
      });

      return {
        exito: true,
        datos: miniaturas
      };
    } catch (error) {
      return handleError(error);
    }
  }

  async insertarDiapositiva(presentacionId: string, indice: number, layout: TipoLayout): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestInsertarDiapositiva(indice, layout, presentacionId);
      return await this.actualizarPresentacion(presentacionId, [request]);
    } catch (error) {
      return handleError(error);
    }
  }

  async actualizarDiapositiva(
    presentacionId: string,
    diapositivaId: string,
    elementos: ElementoDiapositiva[]
  ): Promise<ResultadoAPI<slides_v1.Schema$BatchUpdatePresentationResponse>> {
    this.logInfo('🔄 [SlidesService] Iniciando actualización:', {
      presentacionId,
      diapositivaId,
      numElementos: elementos.length,
      elementos: elementos.map(e => ({
        id: e.id,
        tipo: e.tipo,
        contenido: e.contenido
      }))
    });

    try {
      const slides = this.apiClient.slides('v1');
      
      // Crear los requests para cada elemento usando las funciones auxiliares
      const requests = elementos.flatMap(elemento => {
        const requestsElemento = crearRequestsActualizarElemento(diapositivaId, elemento.id, elemento);
        this.logInfo(`📝 [SlidesService] Requests para elemento ${elemento.id}:`, requestsElemento);
        return requestsElemento;
      });

      this.logInfo('📤 [SlidesService] Enviando requests a Google Slides:', {
        presentacionId,
        cantidadRequests: requests.length,
        requests
      });

      const response = await slides.presentations.batchUpdate({
        presentationId: presentacionId,
        requestBody: {
          requests
        },
        auth: this.oauth2Client
      });

      this.logSuccess('✅ [SlidesService] Actualización completada:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return {
        exito: true,
        datos: response.data
      };
    } catch (error) {
      this.logError('❌ [SlidesService] Error al actualizar diapositiva:', error);
      return handleError(error);
    }
  }

  async eliminarDiapositiva(presentacionId: string, diapositivaId: string): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestEliminarDiapositiva(diapositivaId, presentacionId);
      return await this.actualizarPresentacion(presentacionId, [request]);
    } catch (error) {
      return handleError(error);
    }
  }

  async duplicarDiapositiva(
    presentacionId: string, 
    diapositivaId: string, 
    indiceDestino?: number
  ): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestDuplicarDiapositiva(diapositivaId, indiceDestino, presentacionId);
      return await this.actualizarPresentacion(presentacionId, [request]);
    } catch (error) {
      return handleError(error);
    }
  }

  async moverDiapositiva(
    presentacionId: string, 
    diapositivaId: string, 
    nuevoIndice: number
  ): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestMoverDiapositiva(diapositivaId, nuevoIndice, presentacionId);
      return await this.actualizarPresentacion(presentacionId, [request]);
    } catch (error) {
      return handleError(error);
    }
  }

  async insertarElemento(
    presentacionId: string,
    diapositivaId: string,
    elemento: ElementoDiapositiva
  ): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestElemento(diapositivaId, elemento);
      return await this.actualizarPresentacion(presentacionId, [request]);
    } catch (error) {
      return handleError(error);
    }
  }

  async actualizarElemento(
    presentacionId: string,
    diapositivaId: string,
    elementoId: string,
    elemento: Partial<ElementoDiapositiva>
  ): Promise<ResultadoAPI<void>> {
    try {
      const requests = crearRequestsActualizarElemento(diapositivaId, elementoId, elemento);
      return await this.actualizarPresentacion(presentacionId, requests);
    } catch (error) {
      return handleError(error);
    }
  }
} 