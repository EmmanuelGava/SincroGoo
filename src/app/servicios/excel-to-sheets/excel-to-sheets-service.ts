import * as XLSX from 'xlsx';
import { GoogleSheetsService } from '../google/googleSheets';

export interface HojaExcel {
  nombre: string;
  nombreDestino: string;
  seleccionada: boolean;
  datos?: any[][];
}

export class ExcelToSheetsService {
  private static instancia: ExcelToSheetsService | null = null;
  private servicioSheets: GoogleSheetsService | null = null;

  private constructor() {}

  static getInstance(): ExcelToSheetsService {
    if (!ExcelToSheetsService.instancia) {
      ExcelToSheetsService.instancia = new ExcelToSheetsService();
    }
    return ExcelToSheetsService.instancia;
  }

  async leerHojasExcel(archivo: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook.SheetNames);
        } catch (error) {
          console.error('❌ Error al leer hojas de Excel:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('❌ Error al leer archivo:', error);
        reject(error);
      };

      reader.readAsArrayBuffer(archivo);
    });
  }

  async leerDatosHoja(archivo: File, nombreHoja: string, rango?: string): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[nombreHoja];
          
          if (rango) {
            const datos = XLSX.utils.sheet_to_json(worksheet, { 
              range: rango,
              header: 1,
              defval: ''
            }) as any[][];
            resolve(datos);
          } else {
            const datos = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: ''
            }) as any[][];
            resolve(datos);
          }
        } catch (error) {
          console.error('❌ Error al leer datos de hoja:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('❌ Error al leer archivo:', error);
        reject(error);
      };

      reader.readAsArrayBuffer(archivo);
    });
  }

  async sincronizarConGoogleSheets(
    hojas: HojaExcel[],
    archivo: File,
    opciones: { nombreDocumento: string; documentoExistenteId?: string }
  ): Promise<string> {
    try {
      console.log('📊 Sincronizando con Google Sheets...');
      
      // Inicializar servicio de Google Sheets
      this.servicioSheets = GoogleSheetsService.getInstance();

      // Crear o actualizar el documento
      const spreadsheetId = opciones.documentoExistenteId || 
        await this.servicioSheets.crearDocumento(opciones.nombreDocumento);

      // Procesar cada hoja seleccionada
      for (const hoja of hojas.filter(h => h.seleccionada)) {
        const datos = await this.leerDatosHoja(archivo, hoja.nombre);
        await this.servicioSheets.actualizarHoja(spreadsheetId, hoja.nombreDestino, datos);
      }

      console.log('✅ Sincronización completada');
      return spreadsheetId;
    } catch (error) {
      console.error('❌ Error al sincronizar con Google Sheets:', error);
      throw error;
    }
  }
} 