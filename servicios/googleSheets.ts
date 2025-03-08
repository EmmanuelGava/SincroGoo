/**
 * Servicio para interactuar con la API de Google Sheets
 */

import { getSession } from "next-auth/react";
import { getCacheKey, getCacheItem, setCacheItem, shouldRefreshCache } from "@/lib/cache-service";
import { canMakeRequest, recordRequest, waitForRateLimit } from "@/lib/rate-limiter";

export interface HojaCalculo {
  id: string;
  titulo: string;
  hojas: Hoja[];
}

export interface Hoja {
  id: string;
  titulo: string;
  indice: number;
  columnas: string[];
  filas: any[];
}

export interface ResultadoAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  codigo?: number;
}

export class ServicioGoogleSheets {
  private token: string;
  private baseUrl = 'https://sheets.googleapis.com/v4';

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Obtiene información básica de una hoja de cálculo
   */
  async obtenerHojaCalculo(id: string): Promise<ResultadoAPI<HojaCalculo>> {
    try {
      // Verificar caché
      const cacheKey = getCacheKey('sheet-info', id);
      const cachedData = getCacheItem<HojaCalculo>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando datos en caché para hoja de cálculo:', id);
        return { exito: true, datos: cachedData };
      }
      
      // Verificar límite de peticiones
      if (!canMakeRequest()) {
        await waitForRateLimit();
      }
      
      // Registrar petición
      recordRequest();
      
      const response = await fetch(`${this.baseUrl}/spreadsheets/${id}?includeGridData=false`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          exito: false,
          error: errorData.error?.message || 'Error al obtener la hoja de cálculo',
          codigo: response.status
        };
      }
      
      const data = await response.json();
      
      // Transformar datos
      const hojaCalculo: HojaCalculo = {
        id: data.spreadsheetId,
        titulo: data.properties.title,
        hojas: data.sheets.map((sheet: any) => ({
          id: sheet.properties.sheetId,
          titulo: sheet.properties.title,
          indice: sheet.properties.index,
          columnas: [],
          filas: []
        }))
      };
      
      // Guardar en caché
      setCacheItem(cacheKey, hojaCalculo);
      
      return { exito: true, datos: hojaCalculo };
    } catch (error) {
      console.error('Error al obtener hoja de cálculo:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Obtiene los datos de una hoja específica
   */
  async obtenerDatosHoja(idHojaCalculo: string, indiceHoja: number): Promise<ResultadoAPI<Hoja>> {
    try {
      console.log(`Obteniendo datos de la hoja con índice ${indiceHoja} del documento ${idHojaCalculo}`);
      
      // Verificar caché
      const cacheKey = getCacheKey('sheet-data', `${idHojaCalculo}-${indiceHoja}`);
      const cachedData = getCacheItem<Hoja>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando datos en caché para hoja:', indiceHoja);
        return { exito: true, datos: cachedData };
      }
      
      // Verificar límite de peticiones
      if (!canMakeRequest()) {
        await waitForRateLimit();
      }
      
      // Registrar petición
      recordRequest();
      
      // Primero, obtener información de la hoja para conseguir el nombre de la hoja
      const infoHojaResponse = await this.obtenerHojaCalculo(idHojaCalculo);
      if (!infoHojaResponse.exito || !infoHojaResponse.datos) {
        return {
          exito: false,
          error: infoHojaResponse.error || 'Error al obtener información de la hoja',
          codigo: infoHojaResponse.codigo
        };
      }
      
      // Buscar la hoja por su índice
      const hoja = infoHojaResponse.datos.hojas.find(h => h.indice === indiceHoja);
      if (!hoja) {
        return {
          exito: false,
          error: `No se encontró la hoja con índice ${indiceHoja}`,
          codigo: 404
        };
      }
      
      // Usar el título de la hoja en lugar del índice para la petición
      const response = await fetch(`${this.baseUrl}/spreadsheets/${idHojaCalculo}/values/${encodeURIComponent(hoja.titulo)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          exito: false,
          error: errorData.error?.message || 'Error al obtener datos de la hoja',
          codigo: response.status
        };
      }
      
      const data = await response.json();
      
      // Procesar los datos
      const valores = data.values || [];
      const columnas = valores.length > 0 ? valores[0] : [];
      const filas = [];
      
      // Convertir los datos en un array de objetos
      for (let i = 1; i < valores.length; i++) {
        const fila: {[key: string]: string | number} = {};
        for (let j = 0; j < columnas.length; j++) {
          const valor = valores[i][j] || '';
          fila[columnas[j]] = valor;
        }
        filas.push(fila);
      }
      
      const resultado: Hoja = {
        id: hoja.id,
        titulo: hoja.titulo,
        indice: hoja.indice,
        columnas: columnas,
        filas: filas
      };
      
      // Guardar en caché
      setCacheItem(cacheKey, resultado);
      
      return { exito: true, datos: resultado };
    } catch (error) {
      console.error('Error al obtener datos de la hoja:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Busca datos en una hoja de cálculo
   */
  async buscarDatos(idHojaCalculo: string, indiceHoja: number, consulta: string): Promise<ResultadoAPI<any[]>> {
    try {
      // Obtener datos de la hoja
      const respuesta = await this.obtenerDatosHoja(idHojaCalculo, indiceHoja);
      
      if (!respuesta.exito || !respuesta.datos) {
        return {
          exito: false,
          error: respuesta.error || 'Error al obtener datos para búsqueda',
          codigo: respuesta.codigo
        };
      }
      
      const { filas } = respuesta.datos;
      
      // Realizar búsqueda
      const consultaLower = consulta.toLowerCase();
      const resultados = filas.filter(fila => {
        return Object.values(fila).some(valor => 
          String(valor).toLowerCase().includes(consultaLower)
        );
      });
      
      return { exito: true, datos: resultados };
    } catch (error) {
      console.error('Error al buscar datos:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Obtiene una lista de hojas de cálculo del usuario
   */
  async listarHojasCalculo(): Promise<ResultadoAPI<{ id: string, nombre: string }[]>> {
    try {
      // Verificar caché
      const cacheKey = getCacheKey('sheets-list', 'user');
      const cachedData = getCacheItem<{ id: string, nombre: string }[]>(cacheKey);
      
      if (cachedData && !shouldRefreshCache(cacheKey)) {
        console.log('Usando lista de hojas en caché');
        return { exito: true, datos: cachedData };
      }
      
      // Verificar límite de peticiones
      if (!canMakeRequest()) {
        await waitForRateLimit();
      }
      
      // Registrar petición
      recordRequest();
      
      // Usar Drive API para listar archivos de tipo spreadsheet
      const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name)', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          exito: false,
          error: errorData.error?.message || 'Error al listar hojas de cálculo',
          codigo: response.status
        };
      }
      
      const data = await response.json();
      
      // Transformar datos
      const hojas = data.files.map((file: any) => ({
        id: file.id,
        nombre: file.name
      }));
      
      // Guardar en caché
      setCacheItem(cacheKey, hojas);
      
      return { exito: true, datos: hojas };
    } catch (error) {
      console.error('Error al listar hojas de cálculo:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  /**
   * Método estático para obtener una instancia del servicio con el token de la sesión actual
   */
  static async obtenerInstancia(): Promise<ServicioGoogleSheets | null> {
    try {
      const session = await getSession();
      
      if (!session || !session.accessToken) {
        console.error('No hay sesión activa o token de acceso');
        return null;
      }
      
      return new ServicioGoogleSheets(session.accessToken);
    } catch (error) {
      console.error('Error al obtener instancia de ServicioGoogleSheets:', error);
      return null;
    }
  }
} 