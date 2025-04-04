import { sheets_v4 } from 'googleapis';
import { BaseGoogleService } from '../core/BaseGoogleService';
import { ResultadoAPI } from '@/types/servicios';
import { APICache } from '../utils/cache';
import { rateLimiter } from '../utils/rate-limiting';
import { handleError } from '../utils/error-handling';
import { 
  OpcionesExportacion,
  FormatoExportacion,
  ConfiguracionExportacion,
  ResultadoExportacion
} from './types';
import { obtenerConfiguracionExportacion } from './operations/export';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { cacheManager } from '../utils/cache-manager';
import type { CacheManager } from '../utils/cache-manager';

export class SheetsToPdfService extends BaseGoogleService {
  protected serviceName = 'Google Sheets to PDF';
  private static instance: SheetsToPdfService;
  protected requiredScopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  private sheets: any;
  private cacheService: APICache;

  constructor(auth: string) {
    super(auth);
    this.sheets = google.sheets({ version: 'v4', auth });
    this.cacheService = APICache.getInstance();
  }

  static getInstance(accessToken?: string): SheetsToPdfService {
    if (!accessToken && !this.instance) {
      throw new Error('Se requiere un token de acceso para inicializar el servicio');
    }
    
    if (accessToken && (!this.instance || this.instance.hasTokenChanged(accessToken))) {
      this.instance = new SheetsToPdfService(accessToken);
    }
    
    return this.instance;
  }

  private hasTokenChanged(newToken: string): boolean {
    return this.accessToken !== newToken;
  }

  protected async getGoogleAPI() {
    return this.sheets;
  }

  async exportarHoja(opciones: OpcionesExportacion): Promise<ResultadoExportacion> {
    try {
      await rateLimiter.checkLimit('sheets_export');
      const api = await this.getGoogleAPI();
      const sheetsApi = api.sheets('v4');
      const driveApi = api.drive('v3');

      // Verificar si existe en caché
      const cacheKey = `export_${opciones.hojaId}_${opciones.formato}`;
      const cachedResult = this.cacheService.get<ResultadoExportacion>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Obtener información de la hoja
      const hoja = await sheetsApi.spreadsheets.get({
        spreadsheetId: opciones.hojaId,
        ranges: opciones.rangos,
        includeGridData: true,
        auth: this.oauth2Client
      });

      if (!hoja.data) {
        throw new Error('No se pudo obtener la información de la hoja');
      }

      // Obtener configuración de exportación
      const config = obtenerConfiguracionExportacion(opciones);

      // Exportar archivo
      const response = await driveApi.files.export({
        fileId: opciones.hojaId,
        mimeType: config.mimeType,
        ...config.parameters && { 
          requestBody: config.parameters 
        },
        auth: this.oauth2Client
      });

      if (!response.data) {
        throw new Error('No se pudo exportar el archivo');
      }

      // Obtener metadatos
      const metadatos = {
        paginas: this.calcularPaginas(hoja.data, opciones),
        hojas: hoja.data.sheets?.length || 0,
        filas: this.contarFilas(hoja.data),
        columnas: this.contarColumnas(hoja.data)
      };

      // Construir resultado
      const resultado: ResultadoExportacion = {
        exito: true,
        datos: {
          url: response.data as string,
          nombreArchivo: `${hoja.data.properties?.title || 'documento'}.${config.exportFormat.toLowerCase()}`,
          formato: opciones.formato,
          tamaño: Buffer.from(response.data as string).length
        },
        metadatos
      };

      // Guardar en caché por 1 hora
      this.cacheService.set(cacheKey, resultado, 60 * 60 * 1000);

      return resultado;
    } catch (error) {
      return handleError(error);
    }
  }

  private calcularPaginas(hoja: sheets_v4.Schema$Spreadsheet, opciones: OpcionesExportacion): number {
    if (!hoja.sheets?.[0]?.data?.[0]?.rowData) return 0;

    const filasPorPagina = opciones.orientacion === 'LANDSCAPE' ? 50 : 35;
    const totalFilas = this.contarFilas(hoja);

    return Math.ceil(totalFilas / filasPorPagina);
  }

  private contarFilas(hoja: sheets_v4.Schema$Spreadsheet): number {
    return hoja.sheets?.reduce((total: number, sheet: sheets_v4.Schema$Sheet) => {
      return total + (sheet.data?.[0]?.rowData?.length || 0);
    }, 0) || 0;
  }

  private contarColumnas(hoja: sheets_v4.Schema$Spreadsheet): number {
    if (!hoja.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values) return 0;

    return Math.max(...hoja.sheets.map((sheet: sheets_v4.Schema$Sheet) => 
      sheet.data?.[0]?.rowData?.[0]?.values?.length || 0
    ));
  }
} 