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
  crearRequestMoverDiapositiva,
  crearRequestReplaceAllText
} from './operations/slides';
import {
  crearRequestElemento,
  crearRequestsActualizarElemento,
  extraerElementos,
  extraerTitulo
} from './operations/elements';
import { google } from 'googleapis';
import { LAYOUTS, hexToRgb } from './plantilla-layouts';
import { PLANTILLAS } from '@/app/editor-proyectos/plantilla/templates';

export class SlidesService extends BaseGoogleService {
  protected serviceName = 'SlidesService';
  protected requiredScopes = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file'
  ];
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

  /**
   * Obtiene solo la URL de miniatura de la primera diapositiva (para listados).
   * Solo 1 llamada a getThumbnail en lugar de N. Evita rate limit.
   */
  async obtenerPrimeraMiniatura(presentationId: string): Promise<ResultadoAPI<string>> {
    try {
      const slides = this.apiClient.slides('v1');
      const response = await slides.presentations.get({
        presentationId,
        auth: this.oauth2Client
      });
      const rawSlides = response.data.slides || [];
      const firstSlideId = rawSlides[0]?.objectId;
      if (!firstSlideId) {
        return { exito: true, datos: '' };
      }
      const thumbRes = await slides.presentations.pages.getThumbnail({
        presentationId,
        pageObjectId: firstSlideId,
        auth: this.oauth2Client
      });
      return {
        exito: true,
        datos: thumbRes.data.contentUrl || ''
      };
    } catch (error) {
      this.logError('Error en obtenerPrimeraMiniatura:', error);
      return handleError(error);
    }
  }

  async obtenerPresentacion(presentationId: string, incluirThumbnails: boolean = true): Promise<ResultadoAPI<Presentacion>> {
    this.logInfo('Obteniendo presentación:', presentationId);
    
    try {
      const slides = this.apiClient.slides('v1');
      const response = await slides.presentations.get({
        presentationId,
        auth: this.oauth2Client
      });

      const rawSlides = response.data.slides || [];
      this.logInfo('Diapositivas encontradas:', rawSlides.length);
      
      let thumbnailMap = new Map<string, string>();
      if (incluirThumbnails && rawSlides.length > 0) {
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
        thumbnailMap = new Map(thumbnails.map(t => [t.slideId, t.url || '']));
      }
      
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

  async batchUpdateConRespuesta(
    presentationId: string,
    updates: slides_v1.Schema$Request[]
  ): Promise<ResultadoAPI<slides_v1.Schema$BatchUpdatePresentationResponse>> {
    try {
      await rateLimiter.checkLimit('slides_update');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');
      
      const response = await slidesApi.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: updates
        },
        auth: this.oauth2Client
      });

      return {
        exito: true,
        datos: response.data
      };
    } catch (error) {
      return handleError(error);
    }
  }

  reemplazarPlaceholders(
    presentationId: string,
    replacements: Record<string, string>,
    pageObjectIds?: string[]
  ): Promise<ResultadoAPI<void>> {
    const requests = Object.entries(replacements).map(([buscar, reemplazar]) =>
      crearRequestReplaceAllText(buscar, String(reemplazar ?? ''), pageObjectIds)
    );
    return this.actualizarPresentacion(presentationId, requests);
  }

  /**
   * Reemplaza placeholders de forma segura usando deleteText + insertText.
   * Evita el fallo "This request cannot be applied" cuando el texto está en
   * múltiples runs fragmentados ({{, Nombre, }}).
   * @param pageObjectIds - Si se indica, solo procesa esas diapositivas
   */
  async reemplazarPlaceholdersSeguro(
    presentationId: string,
    replacements: Record<string, string>,
    pageObjectIds?: string[]
  ): Promise<ResultadoAPI<{ shapesModificados: number }>> {
    try {
      await rateLimiter.checkLimit('slides_update');
      const api = await this.getGoogleAPI();
      const slidesApi = api.slides('v1');

      const presentacion = await slidesApi.presentations.get({
        presentationId,
        auth: this.oauth2Client
      });

      const slides = presentacion.data.slides || [];
      const requests: slides_v1.Schema$Request[] = [];
      let shapesConPlaceholders = 0;

      for (const slide of slides) {
        const slideId = slide.objectId || '';
        if (pageObjectIds && pageObjectIds.length > 0 && !pageObjectIds.includes(slideId)) {
          continue;
        }

        const elements = slide.pageElements || [];
        for (const element of elements) {
          const objectId = element.objectId;
          const shape = element.shape;
          if (!objectId || !shape?.text?.textElements) continue;

          const textoCompleto = (shape.text.textElements || [])
            .map((te) => (te as { textRun?: { content?: string } }).textRun?.content || '')
            .join('');

          if (!textoCompleto.trim()) continue;

          let textoModificado = textoCompleto;
          let hayReemplazos = false;

          for (const [placeholder, valor] of Object.entries(replacements)) {
            if (textoModificado.includes(placeholder)) {
              textoModificado = textoModificado.replaceAll(placeholder, String(valor ?? ''));
              hayReemplazos = true;
            }
          }

          if (hayReemplazos) {
            this.logInfo(
              `[reemplazarPlaceholdersSeguro] Shape ${objectId}: "${textoCompleto.trim().slice(0, 50)}..." -> "${textoModificado.trim().slice(0, 80)}..."`
            );
            shapesConPlaceholders++;
            requests.push({
              deleteText: {
                objectId,
                textRange: { type: 'ALL' }
              }
            });
            requests.push({
              insertText: {
                objectId,
                insertionIndex: 0,
                text: textoModificado.trim()
              }
            });
          }
        }
      }

      this.logInfo(
        `[reemplazarPlaceholdersSeguro] Shapes con placeholders: ${shapesConPlaceholders}, requests: ${requests.length}`
      );

      if (requests.length > 0) {
        await slidesApi.presentations.batchUpdate({
          presentationId,
          requestBody: { requests },
          auth: this.oauth2Client
        });
      }

      return {
        exito: true,
        datos: { shapesModificados: shapesConPlaceholders }
      };
    } catch (error) {
      this.logError('Error en reemplazarPlaceholdersSeguro:', error);
      return handleError(error);
    }
  }

  /**
   * Reemplaza placeholders uno por uno; si alguno falla (ej. texto no existe),
   * continúa con los demás en vez de fallar todo el batch.
   * @deprecated Usar reemplazarPlaceholdersSeguro para evitar runs fragmentados.
   */
  async reemplazarPlaceholdersResiliente(
    presentationId: string,
    replacements: Record<string, string>,
    pageObjectIds?: string[]
  ): Promise<ResultadoAPI<{ ok: number; fallidos: string[] }>> {
    const fallidos: string[] = [];
    let ok = 0;
    for (const [buscar, reemplazar] of Object.entries(replacements)) {
      const request = crearRequestReplaceAllText(buscar, String(reemplazar ?? ''), pageObjectIds);
      const res = await this.actualizarPresentacion(presentationId, [request]);
      if (res.exito) ok++;
      else fallidos.push(buscar);
    }
    return { exito: true, datos: { ok, fallidos } };
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

  async copiarPresentacion(
    presentationId: string,
    nuevoTitulo: string
  ): Promise<ResultadoAPI<string>> {
    try {
      await rateLimiter.checkLimit('drive_copy');
      const api = await this.getGoogleAPI();
      const driveApi = api.drive('v3');
      
      const response = await driveApi.files.copy({
        fileId: presentationId,
        requestBody: {
          name: nuevoTitulo,
          mimeType: 'application/vnd.google-apps.presentation'
        },
        auth: this.oauth2Client
      });

      const newId = response.data.id;
      if (!newId) {
        return { exito: false, error: 'No se obtuvo el ID de la copia' };
      }
      return {
        exito: true,
        datos: newId
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Comparte un archivo de Drive para que sea visible en embeds (iframe).
   * Añade permiso "anyone with link can view" para que el embed de Google Slides funcione.
   */
  async compartirParaEmbed(fileId: string): Promise<ResultadoAPI<void>> {
    try {
      const api = await this.getGoogleAPI();
      const driveApi = api.drive('v3');
      await driveApi.permissions.create({
        fileId,
        requestBody: {
          type: 'anyone',
          role: 'reader'
        },
        auth: this.oauth2Client
      });
      return { exito: true };
    } catch (error) {
      this.logError('Error al compartir para embed:', error);
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

  async insertarDiapositiva(presentacionId: string, indice: number, layout: TipoLayout, objectId?: string): Promise<ResultadoAPI<void>> {
    try {
      const request = crearRequestInsertarDiapositiva(indice, layout, presentacionId, objectId);
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

      const ejecutarBatch = (omitirDeleteText = false) => {
        return elementos.flatMap(elemento => {
          const requestsElemento = crearRequestsActualizarElemento(diapositivaId, elemento.id, elemento, { omitirDeleteText });
          this.logInfo(`📝 [SlidesService] Requests para elemento ${elemento.id}:`, requestsElemento);
          return requestsElemento;
        });
      };

      let requests = ejecutarBatch();

      this.logInfo('📤 [SlidesService] Enviando requests a Google Slides:', {
        presentacionId,
        cantidadRequests: requests.length,
        requests
      });

      let response;
      try {
        response = await slides.presentations.batchUpdate({
          presentationId: presentacionId,
          requestBody: { requests },
          auth: this.oauth2Client
        });
      } catch (batchError: any) {
        // deleteText falla cuando el cuadro de texto está vacío (startIndex 0 = endIndex 0)
        const mensaje = batchError?.message || batchError?.errors?.[0]?.message || '';
        if (requests.length > 0 && /startIndex.*must be less than.*endIndex/i.test(mensaje)) {
          this.logInfo('🔄 [SlidesService] Cuadro vacío detectado, reintentando sin deleteText');
          requests = ejecutarBatch(true);
          response = await slides.presentations.batchUpdate({
            presentationId: presentacionId,
            requestBody: { requests },
            auth: this.oauth2Client
          });
        } else {
          throw batchError;
        }
      }

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

  async duplicarDiapositivaYObtenerId(
    presentacionId: string,
    diapositivaId: string,
    indiceDestino?: number
  ): Promise<ResultadoAPI<string>> {
    try {
      const request = crearRequestDuplicarDiapositiva(diapositivaId, indiceDestino, presentacionId);
      const resultado = await this.batchUpdateConRespuesta(presentacionId, [request]);
      if (!resultado.exito || !resultado.datos?.replies?.[0]?.duplicateObject?.objectId) {
        return { exito: false, error: 'No se obtuvo el ID de la diapositiva duplicada' };
      }
      return {
        exito: true,
        datos: resultado.datos.replies[0].duplicateObject!.objectId!
      };
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

  /**
   * Construye una slide desde cero con los datos ya insertados.
   * Crea la slide, aplica fondo, y genera cada shape con texto y estilos.
   * @returns El slideId de la slide creada
   */
  async crearSlideConDatos(
    presentacionId: string,
    templateType: string,
    datos: Record<string, string>,
    filaIndex: number,
    layoutOverride?: import('./plantilla-layouts').LayoutElement[]
  ): Promise<ResultadoAPI<string>> {
    try {
      const layout = layoutOverride ?? LAYOUTS[templateType];
      if (!layout || layout.length === 0) {
        return { exito: false, error: `Layout no encontrado para plantilla: ${templateType}` };
      }

      const plantilla = PLANTILLAS.find(p => p.id === templateType);
      if (!plantilla) {
        return { exito: false, error: `Plantilla no encontrada: ${templateType}` };
      }

      const ts = Date.now();
      const slideId = `sg_${filaIndex}_${ts}`;
      const requests: slides_v1.Schema$Request[] = [];

      requests.push({
        createSlide: {
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: 'BLANK' }
        }
      });

      const bgRgb = hexToRgb(plantilla.bgColor);
      requests.push({
        updatePageProperties: {
          objectId: slideId,
          pageProperties: {
            pageBackgroundFill: {
              solidFill: {
                color: {
                  rgbColor: { red: bgRgb.red, green: bgRgb.green, blue: bgRgb.blue }
                }
              }
            }
          },
          fields: 'pageBackgroundFill.solidFill.color'
        }
      });

      const textRgb = hexToRgb(plantilla.textColor);
      /** 1 PT = 12700 EMU (Slides API usa EMU para createImage) */
      const ptToEmu = (pt: number) => Math.round(pt * 12700);

      for (let i = 0; i < layout.length; i++) {
        const el = layout[i];
        const valor = (datos[el.placeholder] ?? '').trim();
        const esImagen = el.tipo === 'imagen';

        if (esImagen && valor) {
          const esUrlValida = valor.startsWith('http://') || valor.startsWith('https://');
          if (esUrlValida) {
            const imageId = `img_${filaIndex}_${i}_${ts}`;
            requests.push({
              createImage: {
                objectId: imageId,
                url: valor,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: ptToEmu(el.w), unit: 'EMU' as const },
                    height: { magnitude: ptToEmu(el.h), unit: 'EMU' as const }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: ptToEmu(el.x),
                    translateY: ptToEmu(el.y),
                    unit: 'EMU' as const
                  }
                }
              }
            });
          }
          continue;
        }

        const shapeId = `sh_${filaIndex}_${i}_${ts}`;
        const textoFinal = datos[el.placeholder] ?? '';

        requests.push({
          createShape: {
            objectId: shapeId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: el.w, unit: 'PT' },
                height: { magnitude: el.h, unit: 'PT' }
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: el.x,
                translateY: el.y,
                unit: 'PT'
              }
            }
          }
        });

        if (textoFinal) {
          requests.push({
            insertText: {
              objectId: shapeId,
              text: textoFinal,
              insertionIndex: 0
            }
          });
        }

        const hasTextStyle = el.fontSize !== undefined || el.fontFamily;
        if (hasTextStyle) {
          const style: slides_v1.Schema$TextStyle = {
            foregroundColor: {
              opaqueColor: {
                rgbColor: { red: textRgb.red, green: textRgb.green, blue: textRgb.blue }
              }
            },
            bold: el.bold ?? false
          };
          if (el.fontSize !== undefined) {
            style.fontSize = { magnitude: el.fontSize, unit: 'PT' };
          }
          if (el.fontFamily) {
            style.fontFamily = el.fontFamily;
          }
          const fields = ['foregroundColor', 'bold'];
          if (el.fontSize !== undefined) fields.push('fontSize');
          if (el.fontFamily) fields.push('fontFamily');
          requests.push({
            updateTextStyle: {
              objectId: shapeId,
              style,
              textRange: { type: 'ALL' },
              fields: fields.join(',')
            }
          });
        }

        if (el.alignment) {
          const alignmentApi =
            el.alignment === 'CENTER'
              ? 'CENTER'
              : el.alignment === 'RIGHT'
                ? 'END'
                : 'START';
          requests.push({
            updateParagraphStyle: {
              objectId: shapeId,
              style: { alignment: alignmentApi },
              textRange: { type: 'ALL' },
              fields: 'alignment'
            }
          });
        }
      }

      this.logInfo(`[crearSlideConDatos] Fila ${filaIndex}: slideId=${slideId}, shapes=${layout.length}, requests=${requests.length}`);

      await rateLimiter.checkLimit('slides_update');
      let resultado = await this.actualizarPresentacion(presentacionId, requests);

      const tieneCreateImage = requests.some((r) => (r as { createImage?: unknown }).createImage != null);
      const pareceErrorImagen =
        !resultado.exito &&
        (resultado.codigo === 400 ||
          /400|Bad Request|invalid|invalid.*url/i.test(String(resultado.error ?? '')));

      if (!resultado.exito && tieneCreateImage && pareceErrorImagen) {
        const requestsSinImagen = requests.filter((r) => (r as { createImage?: unknown }).createImage == null);
        this.logError(
          `[crearSlideConDatos] createImage falló (URL no pública o inválida), continuando sin imagen: ${resultado.error}`
        );
        resultado = await this.actualizarPresentacion(presentacionId, requestsSinImagen);
      }

      if (!resultado.exito) {
        return { exito: false, error: resultado.error || 'Error al crear slide con datos' };
      }

      return { exito: true, datos: slideId };
    } catch (error) {
      this.logError(`[crearSlideConDatos] Error en fila ${filaIndex}:`, error);
      return handleError(error);
    }
  }
} 