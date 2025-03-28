"use client"

/**
 * Servicio para interactuar con la API de Google Slides
 */

import { getSession } from "next-auth/react";
import { getCacheKey, getCacheItem, setCacheItem, shouldRefreshCache } from "@/lib/cache-service";
import { canMakeRequest, recordRequest, waitForRateLimit } from "@/lib/rate-limiter";
import { VistaPreviaDiapositiva, ElementoDiapositiva, ActualizacionDiapositiva, Presentacion } from "@/tipos/diapositivas";
import { ServicioApi, ResultadoAPI } from './api';
import { ResultadoServicio } from '@/tipos/servicios';

export interface ElementoSlide {
  tipo: 'TITLE' | 'SUBTITLE' | 'TABLE' | 'CHART' | 'FOOTER' | 'NOTES';
  texto?: string;
  datos?: any[][];
  tipoGrafico?: 'barras' | 'lineas' | 'circular';
}

export interface Diapositiva {
  id: string;
  titulo: string;
  elementos: ElementoDiapositiva[];
  indice?: number;
}

interface TableCellProperties {
  tableCellBackgroundFill: {
    solidFill: {
      color: {
        rgbColor: {
          red: number;
          green: number;
          blue: number;
        }
      }
    }
  }
}

interface TableRange {
  location: {
    rowIndex: number;
    columnIndex: number;
  };
  rowSpan: number;
  columnSpan: number;
}

interface UpdateTableCellPropertiesRequest {
  objectId: string;
  tableRange: TableRange;
  tableCellProperties: TableCellProperties;
  fields: string;
}

interface InsertTextRequest {
  objectId: string;
  text: string;
}

interface UpdateTextStyleRequest {
  objectId: string;
  style: {
    fontSize?: {
      magnitude: number;
      unit: string;
    };
    bold?: boolean;
    fontFamily?: string;
  };
  textRange: {
    type: string;
  };
  fields: string;
}

type SlideRequest = 
  | { insertText: InsertTextRequest }
  | { updateTableCellProperties: UpdateTableCellPropertiesRequest }
  | { updateTextStyle: UpdateTextStyleRequest }
  | { createShape: any }
  | { createTable: any }
  | { createChart: any };

interface ElementoLayout {
  size: { width: number; height: number };
  position: { x: number; y: number };
  style?: { fontSize: number; bold: boolean };
}

// Configuración de posiciones y tamaños predeterminados para cada tipo de elemento
const ELEMENTO_LAYOUT: Record<ElementoSlide['tipo'], ElementoLayout> = {
  TITLE: {
    size: { width: 600, height: 50 },
    position: { x: 50, y: 30 },
    style: { fontSize: 24, bold: true }
  },
  SUBTITLE: {
    size: { width: 600, height: 40 },
    position: { x: 50, y: 90 },
    style: { fontSize: 18, bold: false }
  },
  TABLE: {
    size: { width: 600, height: 300 },
    position: { x: 50, y: 150 }
  },
  CHART: {
    size: { width: 600, height: 300 },
    position: { x: 50, y: 150 }
  },
  FOOTER: {
    size: { width: 600, height: 30 },
    position: { x: 50, y: 500 },
    style: { fontSize: 12, bold: false }
  },
  NOTES: {
    size: { width: 600, height: 40 },
    position: { x: 50, y: 450 },
    style: { fontSize: 12, bold: false }
  }
};

async function obtenerTokenGoogle(): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      console.error('❌ [Debug] No hay token de acceso en la sesión');
      return null;
    }
    return session.accessToken as string;
  } catch (error) {
    console.error('❌ [Debug] Error al obtener token de Google:', error);
    return null;
  }
}

export class ServicioGoogleSlides extends ServicioApi {
  private static instancia: ServicioGoogleSlides;
  private readonly urlBase = 'https://slides.googleapis.com/v1/presentations';
  protected token: string | null = null;
  
  // Caché para almacenar las vistas previas de las diapositivas
  private cacheVistasPrevias: { [key: string]: { datos: VistaPreviaDiapositiva[], timestamp: number } } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  // Caché para almacenar los elementos de las diapositivas
  private cacheElementos: { [key: string]: { datos: ElementoDiapositiva[], timestamp: number } } = {};

  // Caché para almacenar las asociaciones de elementos
  private cacheAsociaciones: { [key: string]: { [elementoId: string]: { columna: string, tipo: string } } } = {};

  // Mapeo de IDs
  private mapeoIds: { [key: string]: { [idSimple: string]: string } } = {};
  private mapeoIdsInverso: { [key: string]: { [idOriginal: string]: string } } = {};

  private constructor() {
    super();
  }

  public static async obtenerInstancia(): Promise<ServicioGoogleSlides | null> {
    if (!ServicioGoogleSlides.instancia) {
      ServicioGoogleSlides.instancia = new ServicioGoogleSlides();
      ServicioGoogleSlides.instancia.token = await obtenerTokenGoogle();
      
      if (!ServicioGoogleSlides.instancia.token) {
        console.error('No se pudo obtener el token para el servicio');
        return null;
      }
    }
    return ServicioGoogleSlides.instancia;
  }

  // Método para guardar el mapeo bidireccional entre ID simple y ID original
  private guardarMapeoIdBidireccional(idPresentacion: string, idOriginal: string, idSimple: string): void {
    // Inicializar los objetos de mapeo si no existen
    if (!this.mapeoIds[idPresentacion]) {
      this.mapeoIds[idPresentacion] = {};
    }
    
    if (!this.mapeoIdsInverso[idPresentacion]) {
      this.mapeoIdsInverso[idPresentacion] = {};
    }
    
    // Guardar el mapeo en ambas direcciones
    this.mapeoIds[idPresentacion][idSimple] = idOriginal;
    this.mapeoIdsInverso[idPresentacion][idOriginal] = idSimple;
    
    console.log(`Mapeo bidireccional guardado: ${idSimple} <-> ${idOriginal}`);
  }
  
  // Método para verificar si ya existe un mapeo de IDs para una presentación
  verificarMapeoExistente(idPresentacion: string): boolean {
    return !!this.mapeoIds[idPresentacion] && Object.keys(this.mapeoIds[idPresentacion]).length > 0;
  }
  
  // Método para obtener el ID original a partir del ID simple
  obtenerIdOriginal(idPresentacion: string, idSimple: string): string | undefined {
    if (this.mapeoIds[idPresentacion] && this.mapeoIds[idPresentacion][idSimple]) {
      return this.mapeoIds[idPresentacion][idSimple];
    }
    
    return undefined;
  }
  
  // Método para obtener el ID simple a partir del ID original
  obtenerIdSimple(idPresentacion: string, idOriginal: string): string | undefined {
    if (this.mapeoIdsInverso[idPresentacion] && this.mapeoIdsInverso[idPresentacion][idOriginal]) {
      return this.mapeoIdsInverso[idPresentacion][idOriginal];
    }
    
    return undefined;
  }
  
  // Método para convertir un elemento con ID original a ID simple
  convertirAIdSimple(idPresentacion: string, elemento: ElementoDiapositiva): ElementoDiapositiva {
    // Si el elemento ya tiene un ID simple, devolverlo tal cual
    if (elemento.id && elemento.id.match(/^slide\d+_elem\d+$/)) {
      return elemento;
    }
    
    // Obtener el ID simple para este elemento
    const idSimple = this.obtenerIdSimple(idPresentacion, elemento.id);
    
    if (idSimple) {
      return {
        ...elemento,
        idOriginal: elemento.id,
        id: idSimple
      };
    }
    
    // Si no se encuentra un ID simple, devolver el elemento original
    return elemento;
  }
  
  // Método para convertir un elemento con ID simple a ID original
  private convertirAIdOriginal(idPresentacion: string, elemento: ElementoDiapositiva): ElementoDiapositiva {
    // Aquí iría la lógica para convertir IDs temporales a IDs reales
    // Por ahora solo devolvemos el mismo elemento
    return elemento;
  }

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
          datos: this.cacheVistasPrevias[idPresentacion].datos,
          timestamp: new Date()
        };
      }
      
      const respuesta = await this.fetchConAuth(`${this.urlBase}/${idPresentacion}`);
      
      if (!respuesta.exito || !respuesta.datos || !respuesta.datos.slides) {
        console.error('No se encontraron diapositivas en la respuesta:', respuesta);
        return {
          exito: false,
          error: 'No se encontraron diapositivas',
          timestamp: new Date()
        };
      }

      const vistasPrevia = respuesta.datos.slides.map((slide: any, index: number) => ({
        id: slide.objectId,
        titulo: this.extraerTitulo(slide),
        elementos: this.extraerElementos(slide),
        indice: index + 1
      }));

      // Guardar en caché
      this.cacheVistasPrevias[idPresentacion] = {
        datos: vistasPrevia,
        timestamp: ahora
      };

      return {
        exito: true,
        datos: vistasPrevia,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al obtener vistas previas:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  async obtenerElementos(idPresentacion: string, idDiapositiva: string): Promise<ResultadoServicio<ElementoDiapositiva[]>> {
    try {
      console.log('🔍 [googleSlides] Obteniendo elementos para diapositiva:', idDiapositiva);
      
      const resultado = await this.obtenerPresentacion(idPresentacion);

      if (!resultado.exito || !resultado.datos) {
        return {
          exito: false,
          error: resultado.error || 'Error al obtener elementos',
          timestamp: new Date()
        };
      }

      const diapositiva = resultado.datos.diapositivas.find(d => d.id === idDiapositiva);
      
      if (!diapositiva) {
        return {
          exito: false,
          error: 'No se encontró la diapositiva especificada',
          timestamp: new Date()
        };
      }

      return {
        exito: true,
        datos: diapositiva.elementos,
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

  async actualizarElemento(
    idPresentacion: string,
    idDiapositiva: string,
    elemento: ElementoDiapositiva,
    actualizacion: ActualizacionDiapositiva
  ): Promise<ResultadoServicio<any>> {
    try {
      console.log('📝 Actualizando elemento:', elemento.id, 'en diapositiva:', idDiapositiva);

      // Construir la solicitud de actualización
      const requests = [];

      if (actualizacion.elementos) {
        // Actualizar contenido si es necesario
        const elementoActualizado = actualizacion.elementos.find(e => e.id === elemento.id);
        if (elementoActualizado?.contenido) {
          requests.push({
            updateTextStyle: {
              objectId: elemento.id,
              textRange: { type: 'ALL' },
              style: {
                ...actualizacion.estilo,
                fontSize: actualizacion.estilo?.tamanio ? { magnitude: actualizacion.estilo.tamanio, unit: 'PT' } : undefined
              },
              fields: '*'
            }
          });
        }
      }

      if (requests.length === 0) {
        return {
          exito: true,
          datos: { mensaje: 'No hay cambios para aplicar' },
          timestamp: new Date()
        };
      }

      const respuesta = await this.fetchConAuth(`${this.urlBase}/${idPresentacion}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests })
      });

      return {
        exito: respuesta.exito,
        datos: respuesta.datos,
        error: respuesta.error,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al actualizar elemento:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  async obtenerPresentacion(idPresentacion: string): Promise<ResultadoServicio<Presentacion>> {
    try {
      console.log('🔍 [googleSlides] Obteniendo presentación:', idPresentacion);
      
      const respuesta = await this.fetchConAuth(`${this.urlBase}/${idPresentacion}`);
      
      if (!respuesta.exito || !respuesta.datos) {
        return {
          exito: false,
          error: respuesta.error || 'Error al obtener la presentación',
          timestamp: new Date()
        };
      }

      const diapositivas = (respuesta.datos.slides || []).map((slide: any, index: number) => ({
        id: slide.objectId,
        titulo: this.extraerTitulo(slide),
        elementos: this.extraerElementos(slide),
        indice: index + 1
      }));

      return {
        exito: true,
        datos: {
          presentationId: respuesta.datos.presentationId,
          titulo: respuesta.datos.title,
          diapositivas
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al obtener presentación:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  private extraerTitulo(slide: any): string {
    // Extraer el título de la diapositiva si existe
    const titleElement = slide.pageElements?.find((element: any) => 
      element.shape?.shapeType === 'TEXT_BOX' && 
      element.shape?.text?.textElements?.some((text: any) => text.textRun?.content?.trim())
    );

    if (titleElement?.shape?.text?.textElements) {
      return titleElement.shape.text.textElements
        .map((text: any) => text.textRun?.content || '')
        .join('')
        .trim();
    }

    return 'Sin título';
  }

  private extraerElementos(slide: any): ElementoDiapositiva[] {
    const elementos: ElementoDiapositiva[] = [];
    
    if (!slide.pageElements) {
      return elementos;
    }

    slide.pageElements.forEach((element: any, index: number) => {
      if (element.shape?.shapeType === 'TEXT_BOX') {
        const texto = element.shape.text?.textElements
          ?.map((text: any) => text.textRun?.content || '')
          .join('')
          .trim();

        if (texto) {
          elementos.push({
            id: element.objectId || `slide${slide.objectId}_elem${index}`,
            tipo: 'texto',
            contenido: texto,
            idDiapositiva: slide.objectId,
            posicion: {
              x: element.transform?.translateX || 0,
              y: element.transform?.translateY || 0,
              ancho: element.size?.width?.magnitude || 0,
              alto: element.size?.height?.magnitude || 0
            }
          });
        }
      } else if (element.table) {
        elementos.push({
          id: element.objectId || `slide${slide.objectId}_elem${index}`,
          tipo: 'tabla',
          idDiapositiva: slide.objectId,
          posicion: {
            x: element.transform?.translateX || 0,
            y: element.transform?.translateY || 0,
            ancho: element.size?.width?.magnitude || 0,
            alto: element.size?.height?.magnitude || 0
          }
        });
      }
    });

    return elementos;
  }

  async obtenerDiapositivas(idPresentacion: string): Promise<ResultadoServicio<VistaPreviaDiapositiva[]>> {
    try {
      const resultado = await this.obtenerPresentacion(idPresentacion);
      
      if (!resultado.exito || !resultado.datos) {
        return {
          exito: false,
          error: resultado.error || 'Error al obtener diapositivas',
          timestamp: new Date()
        };
      }

      return {
        exito: true,
        datos: resultado.datos.diapositivas,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al obtener diapositivas:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date()
      };
    }
  }

  /**
   * Método privado para gestionar las asociaciones de elementos a columnas
   * Este método es independiente de la API de Google Slides
   */
  private actualizarAsociaciones(idPresentacion: string, elementos: ElementoDiapositiva[]): void {
    elementos.forEach(elemento => {
      if (elemento.columnaAsociada) {
        // Guardar o actualizar la asociación
        this.guardarAsociacionDeElemento(
          idPresentacion, 
          elemento.idDiapositiva, 
          elemento.id, 
          elemento.columnaAsociada, 
          elemento.tipoAsociacion || 'manual'
        );
      } else if (this.obtenerAsociacionDeElemento(idPresentacion, elemento.idDiapositiva, elemento.id)) {
        // Solo eliminar si realmente existía una asociación previa
        this.eliminarAsociacionDeElemento(idPresentacion, elemento.idDiapositiva, elemento.id);
      }
    });
    
    // Persistir las asociaciones en localStorage
    this.persistirAsociaciones();
  }
  
  /**
   * Obtiene las miniaturas de las diapositivas
   */
  async obtenerMiniaturas(idPresentacion: string): Promise<ResultadoAPI<VistaPreviaDiapositiva[]>> {
    try {
      const resultado = await this.fetchConAuth(`${this.urlBase}/${idPresentacion}`);

      if (!resultado.exito || !resultado.datos) {
        return {
          exito: false,
          error: resultado.error || 'Error al obtener miniaturas'
        };
      }

      const presentacion = resultado.datos;
      const miniaturas: VistaPreviaDiapositiva[] = presentacion.slides?.map((slide: any, index: number) => ({
        id: slide.objectId,
        indice: index,
        titulo: this.extraerTitulo(slide) || `Diapositiva ${index + 1}`,
        elementos: this.extraerElementos(slide)
      })) || [];

      return {
        exito: true,
        datos: miniaturas
      };
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

  // Métodos para gestionar asociaciones de elementos a columnas
  
  /**
   * Guarda la asociación de un elemento a una columna
   */
  guardarAsociacionDeElemento(
    idPresentacion: string, 
    idDiapositiva: string, 
    idElemento: string, 
    columna: string, 
    tipo: string = 'manual'
  ): void {
    try {
      // Verificar si el ID es simple y obtener el ID original si es necesario
      let idParaAsociar = idElemento;
      
      // Si no es un ID temporal (i0, i1, etc.), verificar si es un ID simple
      if (!idElemento.match(/^(i\d+|temp_elem\d+)$/)) {
        // Obtener el ID original si existe
        const idOriginal = this.obtenerIdOriginal(idPresentacion, idElemento);
        if (idOriginal) {
          idParaAsociar = idOriginal;
        }
      }
      
      // Crear la clave para la presentación si no existe
      if (!this.cacheAsociaciones[idPresentacion]) {
        this.cacheAsociaciones[idPresentacion] = {};
      }
      
      // Guardar la asociación usando el ID original o el ID proporcionado
      const claveElemento = `${idDiapositiva}_${idParaAsociar}`;
      this.cacheAsociaciones[idPresentacion][claveElemento] = {
        columna,
        tipo
      };
      
      // Persistir las asociaciones en localStorage
      this.persistirAsociaciones();
      
      console.log(`Asociación guardada: Elemento ${idElemento} asociado a columna ${columna}`);
    } catch (error) {
      console.error('Error al guardar asociación:', error);
    }
  }
  
  /**
   * Obtiene la asociación de un elemento
   */
  obtenerAsociacionDeElemento(
    idPresentacion: string, 
    idDiapositiva: string, 
    idElemento: string
  ): { columna: string, tipo: string } | undefined {
    try {
      // Verificar si el ID es simple y obtener el ID original si es necesario
      let idParaBuscar = idElemento;
      
      // Si no es un ID temporal (i0, i1, etc.), verificar si es un ID simple
      if (!idElemento.match(/^(i\d+|temp_elem\d+)$/)) {
        // Obtener el ID original si existe
        const idOriginal = this.obtenerIdOriginal(idPresentacion, idElemento);
        if (idOriginal) {
          idParaBuscar = idOriginal;
        }
      }
      
      // Verificar si existen asociaciones para esta presentación
      if (!this.cacheAsociaciones[idPresentacion]) {
        return undefined;
      }
      
      // Buscar la asociación usando el ID original o el ID proporcionado
      const claveElemento = `${idDiapositiva}_${idParaBuscar}`;
      return this.cacheAsociaciones[idPresentacion][claveElemento];
    } catch (error) {
      console.error('Error al obtener asociación:', error);
      return undefined;
    }
  }
  
  /**
   * Elimina la asociación de un elemento
   */
  eliminarAsociacionDeElemento(
    idPresentacion: string, 
    idDiapositiva: string, 
    idElemento: string
  ): void {
    try {
      // Verificar si el ID es simple y obtener el ID original si es necesario
      let idParaEliminar = idElemento;
      
      // Si no es un ID temporal (i0, i1, etc.), verificar si es un ID simple
      if (!idElemento.match(/^(i\d+|temp_elem\d+)$/)) {
        // Obtener el ID original si existe
        const idOriginal = this.obtenerIdOriginal(idPresentacion, idElemento);
        if (idOriginal) {
          idParaEliminar = idOriginal;
        }
      }
      
      // Verificar si existen asociaciones para esta presentación
      if (!this.cacheAsociaciones[idPresentacion]) {
        return;
      }
      
      // Eliminar la asociación usando el ID original o el ID proporcionado
      const claveElemento = `${idDiapositiva}_${idParaEliminar}`;
      if (this.cacheAsociaciones[idPresentacion][claveElemento]) {
        delete this.cacheAsociaciones[idPresentacion][claveElemento];
        
        // Persistir los cambios
        this.persistirAsociaciones();
        
        console.log(`Asociación eliminada: Elemento ${idElemento}`);
      }
    } catch (error) {
      console.error('Error al eliminar asociación:', error);
    }
  }
  
  /**
   * Obtiene todas las asociaciones para una presentación
   */
  obtenerAsociacionesPresentacion(idPresentacion: string): { [elementoId: string]: { columna: string, tipo: string } } {
    // Verificar si hay asociaciones para esta presentación
    if (!this.cacheAsociaciones[idPresentacion]) {
      this.cargarAsociaciones();
    }
    
    return this.cacheAsociaciones[idPresentacion] || {};
  }
  
  /**
   * Persiste las asociaciones en localStorage
   */
  private persistirAsociaciones(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('elementoAsociaciones', JSON.stringify(this.cacheAsociaciones));
      } catch (error) {
        console.error('Error al persistir asociaciones:', error);
      }
    }
  }
  
  /**
   * Carga las asociaciones desde localStorage
   */
  private cargarAsociaciones(): void {
    if (typeof window !== 'undefined') {
      try {
        const asociaciones = localStorage.getItem('elementoAsociaciones');
        if (asociaciones) {
          this.cacheAsociaciones = JSON.parse(asociaciones);
        }
      } catch (error) {
        console.error('Error al cargar asociaciones:', error);
      }
    }
  }

  // Método para aplicar IDs simples a los elementos obtenidos
  aplicarIdsSimples(idPresentacion: string, elementos: ElementoDiapositiva[]): ElementoDiapositiva[] {
    console.log('Aplicando IDs simples a elementos:', elementos.length);
    
    // Verificar si ya tenemos el mapeo cargado
    if (!this.mapeoIds[idPresentacion] || Object.keys(this.mapeoIds[idPresentacion]).length === 0) {
      console.log('No se encontró mapeo de IDs en memoria, cargando desde localStorage...');
      this.cargarMapeoDesdeLocalStorage(idPresentacion);
    }
    
    return elementos.map((elemento, index) => {
      // Verificar si el elemento tiene un ID temporal (i0, i1, etc.)
      const esTemporal = elemento.id && elemento.id.match(/^i\d+$/);
      
      // Verificar si ya existe un ID simple para este elemento
      let idSimple = this.obtenerIdSimple(idPresentacion, elemento.id);
      
      // Si no existe, crear uno nuevo
      if (!idSimple) {
        if (esTemporal) {
          // Para IDs temporales, usar un formato especial
          const numeroTemporal = parseInt(elemento.id.substring(1));
          idSimple = `temp_elem${numeroTemporal + 1}`;
        } else {
          // Para IDs normales, usar un formato basado en la posición
          idSimple = `slide${index}_elem${index + 1}`;
        }
        
        // Guardar el mapeo bidireccional
        this.guardarMapeoIdBidireccional(idPresentacion, elemento.id, idSimple);
        
        // Persistir el mapeo en localStorage
        this.persistirMapeoEnLocalStorage(idPresentacion);
      }
      
      // Crear una copia del elemento con el ID simple
      return {
        ...elemento,
        idOriginal: elemento.id,
        id: idSimple
      };
    });
  }
  
  // Método para persistir el mapeo en localStorage
  private persistirMapeoEnLocalStorage(idPresentacion: string): void {
    try {
      if (typeof window !== 'undefined') {
        const mapeoKey = `mapeoIds_${idPresentacion}`;
        const mapeoInversoKey = `mapeoIdsInverso_${idPresentacion}`;
        
        localStorage.setItem(mapeoKey, JSON.stringify(this.mapeoIds[idPresentacion] || {}));
        localStorage.setItem(mapeoInversoKey, JSON.stringify(this.mapeoIdsInverso[idPresentacion] || {}));
        
        console.log('Mapeo de IDs persistido en localStorage');
      }
    } catch (error) {
      console.error('Error al persistir mapeo en localStorage:', error);
    }
  }
  
  // Método para cargar el mapeo desde localStorage
  public cargarMapeoDesdeLocalStorage(idPresentacion: string): void {
    try {
      if (typeof window !== 'undefined') {
        const mapeoKey = `mapeoIds_${idPresentacion}`;
        const mapeoInversoKey = `mapeoIdsInverso_${idPresentacion}`;
        
        const mapeoGuardado = localStorage.getItem(mapeoKey);
        const mapeoInversoGuardado = localStorage.getItem(mapeoInversoKey);
        
        if (mapeoGuardado) {
          this.mapeoIds[idPresentacion] = JSON.parse(mapeoGuardado);
          console.log('Mapeo de IDs cargado desde localStorage');
        }
        
        if (mapeoInversoGuardado) {
          this.mapeoIdsInverso[idPresentacion] = JSON.parse(mapeoInversoGuardado);
          console.log('Mapeo inverso de IDs cargado desde localStorage');
        }
      }
    } catch (error) {
      console.error('Error al cargar mapeo desde localStorage:', error);
    }
  }

  // Método para actualizar el token de acceso
  actualizarToken(token: string): void {
    this.token = token;
  }

  private async renovarToken(): Promise<boolean> {
    const nuevoToken = await obtenerTokenGoogle();
    if (nuevoToken) {
      this.token = nuevoToken;
      return true;
    }
    console.error('❌ No se pudo renovar el token');
    return false;
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
    try {
      const slideId = `slide_${Date.now()}`;
      const layoutMap: { [key: string]: string } = {
        'TITLE_AND_SUBTITLE': 'TITLE',
        'TITLE_AND_BODY': 'TITLE_AND_BODY',
        'TITLE_ONLY': 'TITLE_ONLY',
        'BLANK': 'BLANK'
      };
      const predefinedLayout = layoutMap[layout] || 'BLANK';

      // Primero, crear la diapositiva
      const createSlideRequest = {
        requests: [{
          createSlide: {
            objectId: slideId,
            slideLayoutReference: {
              predefinedLayout
            }
          }
        }]
      };

      await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify(createSlideRequest)
      });

      // Esperar un momento para que la diapositiva se cree
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Luego, procesar cada elemento
      for (const elemento of elementos) {
        const elementId = `element_${slideId}_${Date.now()}`;
        const layoutConfig = ELEMENTO_LAYOUT[elemento.tipo];

        if (elemento.tipo === 'TITLE' || elemento.tipo === 'SUBTITLE' || elemento.tipo === 'FOOTER' || elemento.tipo === 'NOTES') {
          const requests: SlideRequest[] = [
            {
              createShape: {
                objectId: elementId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: layoutConfig.size.width, unit: 'PT' },
                    height: { magnitude: layoutConfig.size.height, unit: 'PT' }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: layoutConfig.position.x,
                    translateY: layoutConfig.position.y,
                    unit: 'PT'
                  }
                }
              }
            }
          ];

          // Enviar solicitud para crear el cuadro de texto
          await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests })
          });

          // Esperar un momento para que se cree el cuadro de texto
          await new Promise(resolve => setTimeout(resolve, 500));

          // Insertar el texto
          const textRequests: SlideRequest[] = [
            {
              insertText: {
                objectId: elementId,
                text: elemento.texto || ''
              }
            }
          ];

          if (layoutConfig.style) {
            textRequests.push({
              updateTextStyle: {
                objectId: elementId,
                style: {
                  fontSize: {
                    magnitude: layoutConfig.style.fontSize,
                    unit: 'PT'
                  },
                  bold: layoutConfig.style.bold,
                  fontFamily: 'Arial'
                },
                textRange: {
                  type: 'ALL'
                },
                fields: 'fontSize,bold,fontFamily'
              }
            });
          }

          await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests: textRequests })
          });
        } else if (elemento.tipo === 'TABLE' && elemento.datos) {
          const numRows = elemento.datos.length;
          const numCols = elemento.datos[0]?.length || 0;
          
          const requests: SlideRequest[] = [
            {
              createTable: {
                objectId: elementId,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: layoutConfig.size.width, unit: 'PT' },
                    height: { magnitude: layoutConfig.size.height, unit: 'PT' }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: layoutConfig.position.x,
                    translateY: layoutConfig.position.y,
                    unit: 'PT'
                  }
                },
                rows: numRows,
                columns: numCols
              }
            }
          ];

          // Crear la tabla y esperar a que se complete
          await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify(requests)
          });

          // Esperar a que la tabla se cree completamente
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Ahora insertar el texto en cada celda, fila por fila
          for (let rowIndex = 0; rowIndex < elemento.datos.length; rowIndex++) {
            const fila = elemento.datos[rowIndex];
            const textRequests: SlideRequest[] = [];

            for (let colIndex = 0; colIndex < fila.length; colIndex++) {
              const cellId = `${elementId}.cell_${rowIndex}_${colIndex}`;
              textRequests.push({
                insertText: {
                  objectId: cellId,
                  text: String(fila[colIndex] || '')
                }
              });
            }

            // Enviar las solicitudes para esta fila
            if (textRequests.length > 0) {
              await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
                method: 'POST',
                body: JSON.stringify({ requests: textRequests })
              });

              // Esperar un momento entre filas
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          // Aplicar estilos a la tabla después de insertar todo el texto
          const styleRequests: SlideRequest[] = [
            {
              updateTableCellProperties: {
                objectId: elementId,
                tableRange: {
                  location: { rowIndex: 0, columnIndex: 0 },
                  rowSpan: numRows,
                  columnSpan: numCols
                },
                tableCellProperties: {
                  tableCellBackgroundFill: {
                    solidFill: {
                      color: {
                        rgbColor: { red: 1.0, green: 1.0, blue: 1.0 }
                      }
                    }
                  }
                },
                fields: 'tableCellBackgroundFill'
              }
            },
            {
              updateTableCellProperties: {
                objectId: elementId,
                tableRange: {
                  location: { rowIndex: 0, columnIndex: 0 },
                  rowSpan: 1,
                  columnSpan: numCols
                },
                tableCellProperties: {
                  tableCellBackgroundFill: {
                    solidFill: {
                      color: {
                        rgbColor: { red: 0.9, green: 0.9, blue: 0.9 }
                      }
                    }
                  }
                },
                fields: 'tableCellBackgroundFill'
              }
            }
          ];

          await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests: styleRequests })
          });
        } else if (elemento.tipo === 'CHART' && elemento.datos) {
          // Crear el gráfico
          const chartId = elementId;
          
          // Determinar el tipo de gráfico de Google Slides
          const chartType = {
            'barras': 'BAR',
            'lineas': 'LINE',
            'circular': 'PIE'
          }[elemento.tipoGrafico || 'barras'];

          const requests: SlideRequest[] = [
            {
              createShape: {
                objectId: chartId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: 600, unit: 'PT' },
                    height: { magnitude: 400, unit: 'PT' }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 50,
                    translateY: 150,
                    unit: 'PT'
                  }
                }
              }
            },
            {
              createChart: {
                objectId: `${chartId}_chart`,
                chartType,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: { magnitude: 600, unit: 'PT' },
                    height: { magnitude: 400, unit: 'PT' }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 50,
                    translateY: 150,
                    unit: 'PT'
                  }
                },
                chart: {
                  chartData: {
                    chartSourceRange: {
                      sources: [
                        {
                          startIndex: 0,
                          endIndex: elemento.datos.length,
                          hasHeaders: true,
                          data: elemento.datos
                        }
                      ]
                    }
                  }
                }
              }
            }
          ];

          await this.fetchConAuth(`${this.urlBase}/${presentacionId}:batchUpdate`, {
            method: 'POST',
            body: JSON.stringify({ requests })
          });
        }
      }

      return { exito: true, datos: null };
    } catch (error) {
      console.error('❌ Error al crear diapositiva:', error);
      return { exito: false, error: (error as Error).message };
    }
  }

  async actualizarDiapositiva(
    presentacionId: string,
    slideId: string,
    actualizaciones: ActualizacionDiapositiva[]
  ): Promise<ResultadoAPI<any>> {
    const requests = actualizaciones.map(actualizacion => ({
      updateTextStyle: {
        objectId: actualizacion.idDiapositiva,
        textRange: {
          type: 'ALL'
        },
        style: {
          bold: true,
          fontSize: {
            magnitude: 12,
            unit: 'PT'
          }
        },
        fields: 'bold,fontSize'
      }
    }));

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

  async obtenerVistaPrevia(presentacionId: string): Promise<ResultadoAPI<VistaPreviaDiapositiva[]>> {
    try {
      const resultado = await this.fetchConAuth(`${this.urlBase}/${presentacionId}`);

      if (!resultado.exito || !resultado.datos) {
        return {
          exito: false,
          error: resultado.error || 'Error al obtener vista previa'
        };
      }

      const presentacion = resultado.datos;
      const vistaPrevias: VistaPreviaDiapositiva[] = presentacion.slides?.map((slide: any, index: number) => ({
        id: slide.objectId,
        indice: index,
        titulo: this.extraerTitulo(slide) || `Diapositiva ${index + 1}`,
        elementos: this.extraerElementos(slide)
      })) || [];

      return {
        exito: true,
        datos: vistaPrevias
      };
    } catch (error) {
      console.error('Error al obtener vista previa:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private limpiarCache() {
    const ahora = Date.now();
    const tiempoMaximo = 5 * 60 * 1000; // 5 minutos

    Object.keys(this.cacheElementos).forEach(key => {
      if (ahora - this.cacheElementos[key].timestamp > tiempoMaximo) {
        delete this.cacheElementos[key];
      }
    });
  }
} 