import { BaseConversionService } from '../BaseConversionService';
import { ResultadoAPI } from '../../core/types';
import * as XLSX from 'xlsx';
import { 
  OpcionesConversion,
  ResultadoConversion,
  HojaExcel 
} from './types';

export class ExcelToSheetsService extends BaseConversionService {
  protected serviceName = 'ExcelToSheetsService';
  protected requiredScopes = ['https://www.googleapis.com/auth/spreadsheets'];
  private static instance: ExcelToSheetsService | null = null;

  private constructor(accessToken: string) {
    super(accessToken);
  }

  public static getInstance(accessToken: string): ExcelToSheetsService {
    if (!this.instance) {
      this.instance = new ExcelToSheetsService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  /**
   * Lee las hojas disponibles en un archivo Excel
   * @param file Archivo Excel a procesar
   * @returns Lista de nombres de hojas
   */
  async leerHojasExcel(file: File): Promise<string[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      return workbook.SheetNames;
    } catch (error) {
      this.logError('Error al leer hojas de Excel:', error);
      throw new Error('No se pudo leer el archivo Excel');
    }
  }

  /**
   * Lee los datos de una hoja específica del Excel
   * @param file Archivo Excel
   * @param nombreHoja Nombre de la hoja a leer
   * @returns Matriz con los datos de la hoja
   */
  async leerDatosHoja(file: File, nombreHoja: string): Promise<any[][]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[nombreHoja];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } catch (error) {
      this.logError('Error al leer datos de hoja:', error);
      throw new Error(`No se pudo leer la hoja "${nombreHoja}"`);
    }
  }

  /**
   * Sincroniza un archivo Excel con Google Sheets
   * @param hojas Lista de hojas a sincronizar
   * @param archivo Archivo Excel
   * @param opciones Opciones de conversión
   * @returns Resultado de la sincronización
   */
  async sincronizarConGoogleSheets(
    hojas: HojaExcel[],
    archivo: File,
    opciones: OpcionesConversion
  ): Promise<ResultadoConversion> {
    try {
      // 1. Verificar archivo
      if (!this.verificarArchivo(archivo, [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
        'text/plain',
        '.xlsx',
        '.xls',
        '.csv'
      ])) {
        throw new Error('Formato de archivo no válido. Use Excel (.xlsx, .xls) o CSV.');
      }

      // 2. Si hay ID existente, verificar acceso
      if (opciones.documentoExistenteId) {
        await this.verificarAcceso(opciones.documentoExistenteId, 'sheets');
      }

      // 3. Crear o usar documento existente
      const spreadsheetId = opciones.documentoExistenteId || 
        await this.crearDocumento(opciones.nombreDocumento, 'sheets');

      // 4. Procesar cada hoja seleccionada
      const hojasActualizadas = [];
      for (const hoja of hojas.filter(h => h.seleccionada)) {
        const datos = await this.leerDatosHoja(archivo, hoja.nombre);
        
        // Actualizar hoja
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${hoja.nombreDestino}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: hoja.nombreDestino,
              values: datos
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || `Error al actualizar la hoja ${hoja.nombre}`);
        }

        const resultado = await response.json();
        hojasActualizadas.push({
          nombre: hoja.nombreDestino,
          id: resultado.updatedRange,
          filas: datos.length,
          columnas: datos[0]?.length || 0
        });
      }

      return {
        exito: true,
        datos: {
          spreadsheetId,
          url: this.obtenerUrlEdicion(spreadsheetId, 'spreadsheets'),
          hojas: hojasActualizadas
        }
      } as ResultadoConversion;

    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }

  protected async procesarArchivo(file: File, opciones: OpcionesConversion): Promise<ResultadoAPI<ResultadoConversion>> {
    try {
      const hojas = await this.leerHojasExcel(file);
      const resultado = await this.sincronizarConGoogleSheets(
        hojas.map(nombre => ({
          nombre,
          nombreDestino: nombre,
          seleccionada: true
        })),
        file,
        opciones
      );

      return {
        exito: resultado.exito,
        error: resultado.error,
        datos: resultado.datos && {
          ...resultado.datos,
          exito: resultado.exito
        },
        codigo: resultado.codigo
      };
    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }
} 