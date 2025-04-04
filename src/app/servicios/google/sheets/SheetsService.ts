import { sheets_v4 } from 'googleapis';
import { BaseGoogleService } from '../core/BaseGoogleService';
import { GOOGLE_API_CONFIG } from '../core/config/google-config';
import {
  HojaCalculo,
  Hoja,
  DatosHoja,
  OpcionesLectura,
  OpcionesEscritura,
  ResultadoHojaCalculo,
  ResultadoHoja,
  ResultadoDatosHoja,
  ResultadoActualizacion,
  GoogleSpreadsheet,
  GoogleSheet,
  FormatoCelda
} from './types';
import { 
  OpcionesFormato, 
  OpcionesFormatoCondicional,
  crearRequestFormato,
  crearRequestFormatoCondicional
} from './operations/format';
import {
  OpcionesFiltro,
  crearRequestFiltro
} from './operations/filter';
import {
  OpcionesOrdenamiento,
  crearRequestOrdenamiento
} from './operations/sort';
import { ResultadoAPI } from '../core/types';

export class SheetsService extends BaseGoogleService {
  protected serviceName = 'SheetsService';
  protected requiredScopes = ['https://www.googleapis.com/auth/spreadsheets'];
  private static instance: SheetsService | null = null;
  private sheets: sheets_v4.Sheets;

  private constructor(accessToken: string) {
    super(accessToken);
    this.sheets = this.apiClient.sheets('v4');
  }

  public static getInstance(accessToken: string): SheetsService {
    if (!this.instance) {
      this.instance = new SheetsService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  async obtenerHojaCalculo(spreadsheetId: string): Promise<ResultadoHojaCalculo> {
    const cacheKey = `spreadsheet_${spreadsheetId}`;
    const cachedData = this.getCachedData<HojaCalculo>(cacheKey);
    
    if (cachedData) {
      this.logInfo('Datos recuperados de caché', { spreadsheetId });
      return { exito: true, datos: cachedData };
    }

    const resultado = await this.executeWithRateLimit('obtenerHojaCalculo', async () => {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      });

      const spreadsheet = response.data;
      return this.mapearHojaCalculo(spreadsheet);
    });

    if (resultado.exito && resultado.datos) {
      this.setCachedData(cacheKey, resultado.datos, 60000); // Cache por 1 minuto
    }

    return resultado;
  }

  async obtenerHoja(spreadsheetId: string, sheetId: number): Promise<ResultadoHoja> {
    const cacheKey = `sheet_${spreadsheetId}_${sheetId}`;
    const cachedData = this.getCachedData<Hoja>(cacheKey);
    
    if (cachedData) {
      this.logInfo('Datos de hoja recuperados de caché', { spreadsheetId, sheetId });
      return { 
        exito: true, 
        datos: cachedData,
        advertencia: 'Datos recuperados de caché'
      };
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [],
        includeGridData: false
      });

      const sheet = response.data.sheets?.find(
        (s: GoogleSheet) => s.properties?.sheetId === sheetId
      );

      if (!sheet) {
        return {
          exito: false,
          error: `Hoja con ID ${sheetId} no encontrada`
        };
      }

      const hoja = this.mapearHoja(sheet);
      this.setCachedData(cacheKey, hoja, 60000); // Cache por 1 minuto

      return {
        exito: true,
        datos: hoja
      };
    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async obtenerDatosHoja(spreadsheetId: string): Promise<ResultadoAPI<DatosHoja>> {
    this.logInfo('Obteniendo datos de hoja:', spreadsheetId);
    
    return this.executeWithRateLimit('obtenerDatosHoja', async () => {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'A1:Z1000', // Rango amplio para obtener todos los datos
        auth: this.oauth2Client
      });

      const valores = response.data.values || [];
      if (valores.length === 0) {
        return {
          encabezados: [],
          filas: [],
          rango: response.data.range || ''
        };
      }

      // Los encabezados son la primera fila
      const encabezados = valores[0].map((titulo: string) => titulo || '');

      // Las filas son el resto de los datos
      const filas = valores.slice(1).map((fila: any[], index: number) => ({
        indice: index + 1,
        valores: fila.map((valor, colIndex) => ({
          valor: valor,
          tipo: this.determinarTipoCelda(valor)
        }))
      }));

      this.logInfo('Datos procesados:', {
        numFilas: filas.length,
        numEncabezados: encabezados.length
      });

      return {
        encabezados,
        filas,
        rango: response.data.range || ''
      };
    });
  }

  async actualizarRango(
    spreadsheetId: string,
    range: string,
    valores: any[][]
  ): Promise<ResultadoAPI<sheets_v4.Schema$UpdateValuesResponse>> {
    this.logInfo('Actualizando rango:', {
      spreadsheetId,
      range,
      numFilas: valores.length,
      numColumnas: valores[0]?.length || 0
    });

    return this.executeWithRateLimit('actualizarRango', async () => {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: valores
        },
        auth: this.oauth2Client
      });

      this.logSuccess('Actualización completada');
      return response.data;
    });
  }

  async actualizarDatos(
    spreadsheetId: string,
    sheetId: number,
    datos: any[][],
    opciones: OpcionesEscritura = {}
  ): Promise<ResultadoActualizacion> {
    return this.executeWithRateLimit('actualizarDatos', async () => {
      const sheet = await this.obtenerHoja(spreadsheetId, sheetId);
      if (!sheet.exito || !sheet.datos) {
        throw new Error('No se pudo obtener la información de la hoja');
      }

      const rango = opciones.rangoPersonalizado || `${sheet.datos.titulo}!A1`;
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: rango,
        valueInputOption: opciones.incluirFormulas ? 'USER_ENTERED' : 'RAW',
        requestBody: {
          values: datos
        }
      });

      // Invalidar caché
      this.cache.delete(`sheet_data_${spreadsheetId}_${sheetId}`);

      return {
        celdasActualizadas: response.data.updatedCells || 0,
        filasActualizadas: response.data.updatedRows || 0
      };
    });
  }

  async aplicarFormato(
    spreadsheetId: string,
    opciones: OpcionesFormato
  ): Promise<ResultadoActualizacion> {
    return this.executeWithRateLimit('aplicarFormato', async () => {
      const request = crearRequestFormato(opciones);
      
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [request]
        }
      });

      return {
        celdasActualizadas: response.data.replies?.length || 0,
        filasActualizadas: 0
      };
    });
  }

  async aplicarFormatoCondicional(
    spreadsheetId: string,
    opciones: OpcionesFormatoCondicional
  ): Promise<ResultadoActualizacion> {
    return this.executeWithRateLimit('aplicarFormatoCondicional', async () => {
      const requests = crearRequestFormatoCondicional(opciones);
      
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });

      return {
        celdasActualizadas: response.data.replies?.length || 0,
        filasActualizadas: 0
      };
    });
  }

  async aplicarFiltro(
    spreadsheetId: string,
    opciones: OpcionesFiltro
  ): Promise<ResultadoActualizacion> {
    return this.executeWithRateLimit('aplicarFiltro', async () => {
      const request = crearRequestFiltro(opciones);
      
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [request]
        }
      });

      return {
        celdasActualizadas: response.data.replies?.length || 0,
        filasActualizadas: 0
      };
    });
  }

  async aplicarOrdenamiento(
    spreadsheetId: string,
    opciones: OpcionesOrdenamiento
  ): Promise<ResultadoActualizacion> {
    return this.executeWithRateLimit('aplicarOrdenamiento', async () => {
      const request = crearRequestOrdenamiento(opciones);
      
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [request]
        }
      });

      return {
        celdasActualizadas: response.data.replies?.length || 0,
        filasActualizadas: 0
      };
    });
  }

  /**
   * Verifica si tenemos acceso a una hoja de cálculo
   * @param spreadsheetId ID de la hoja de cálculo
   * @returns Promise que resuelve si tenemos acceso, rechaza si no
   */
  async verificarAcceso(spreadsheetId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'No se pudo acceder al documento');
      }
    } catch (error) {
      throw new Error(`Error al verificar acceso: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private mapearHojaCalculo(spreadsheet: GoogleSpreadsheet): HojaCalculo {
    if (!spreadsheet.spreadsheetId || !spreadsheet.properties) {
      throw new Error('Datos de hoja de cálculo inválidos');
    }

    return {
      id: spreadsheet.spreadsheetId,
      titulo: spreadsheet.properties.title || 'Sin título',
      hojas: spreadsheet.sheets?.map(sheet => this.mapearHoja(sheet)) || [],
      propietarios: [], // Se debe implementar con DriveAPI
      fechaCreacion: new Date(),
      fechaModificacion: new Date(),
      urlEdicion: `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}/edit`,
      urlVisualizacion: `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}/view`
    };
  }

  private mapearHoja(sheet: GoogleSheet): Hoja {
    if (!sheet.properties) {
      throw new Error('La hoja no tiene propiedades definidas');
    }

    return {
      id: sheet.properties.sheetId || 0,
      titulo: sheet.properties.title || '',
      indice: sheet.properties.index || 0,
      filas: sheet.properties.gridProperties?.rowCount || 0,
      columnas: sheet.properties.gridProperties?.columnCount || 0
    };
  }

  private mapearDatosHoja(valores: any[][], rango: string): DatosHoja {
    if (!valores.length) {
      return {
        encabezados: [],
        filas: [],
        rango
      };
    }

    const [encabezados, ...filas] = valores;

    return {
      encabezados: encabezados.map(String),
      filas: filas.map((fila, indice) => ({
        indice: indice + 1,
        valores: fila.map(valor => ({
          valor,
          tipo: this.determinarTipoCelda(valor)
        }))
      })),
      rango
    };
  }

  private determinarTipoCelda(valor: any): 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'FORMULA' | 'ERROR' | 'EMPTY' {
    if (valor === null || valor === undefined || valor === '') return 'EMPTY';
    if (typeof valor === 'number') return 'NUMBER';
    if (typeof valor === 'boolean') return 'BOOLEAN';
    if (valor instanceof Date) return 'DATE';
    if (typeof valor === 'string') {
      if (valor.startsWith('=')) return 'FORMULA';
      if (valor.startsWith('#')) return 'ERROR';
      return 'TEXT';
    }
    return 'TEXT';
  }
}
