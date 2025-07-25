import { DataRow, SheetConfig, ServiceResult, ColumnFormat } from './types'
import { ApiService } from './api-service'

// Rate limiting
const REQUEST_WINDOW = 60000 // 1 minuto
const MAX_REQUESTS = 50 // Máximo de solicitudes por minuto
const requests: number[] = []

interface SheetData {
  rows: any[];
  columns: string[];
}

export class SheetsService extends ApiService {
  constructor(token: string) {
    super(token)
  }

  private canMakeRequest(): boolean {
    const now = Date.now()
    // Limpiar solicitudes antiguas
    while (requests.length > 0 && requests[0] < now - REQUEST_WINDOW) {
      requests.shift()
    }
    return requests.length < MAX_REQUESTS
  }

  private async waitForRateLimit(): Promise<void> {
    if (this.canMakeRequest()) {
      requests.push(Date.now())
      return
    }

    // Esperar hasta que podamos hacer la siguiente solicitud
    const oldestRequest = requests[0]
    const waitTime = REQUEST_WINDOW - (Date.now() - oldestRequest)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    requests.shift() // Eliminar la solicitud más antigua
    requests.push(Date.now()) // Añadir la nueva solicitud
  }

  protected override baseUrl = 'https://sheets.googleapis.com/v4'

  private formatValue(value: any, format?: ColumnFormat): any {
    if (!format || value == null) return value;

    switch (format.type) {
      case 'currency':
        if (typeof value === 'number') {
          let formatted = value.toFixed(format.decimals || 2);
          if (format.prefix) formatted = format.prefix + formatted;
          if (format.suffix) formatted = formatted + format.suffix;
          return formatted;
        }
        break;

      case 'percentage':
        if (typeof value === 'number') {
          return `${(value * 100).toFixed(format.decimals || 0)}%`;
        }
        break;

      case 'number':
        if (typeof value === 'number') {
          return value.toFixed(format.decimals || 0);
        }
        break;

      case 'date':
        if (value instanceof Date) {
          if (format.pattern) {
            return value.toLocaleDateString(format.locale || undefined);
          }
          return value.toISOString();
        }
        break;

      case 'text':
        if (format.pattern) {
          const regex = new RegExp(format.pattern);
          if (!regex.test(String(value))) {
            console.warn(`El valor "${value}" no coincide con el patrón ${format.pattern}`);
          }
        }
        return String(value);
    }

    return value;
  }

  private getColumnLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  async fetchData(config: SheetConfig): Promise<ServiceResult<DataRow[]>> {
    try {
      await this.waitForRateLimit()

      console.log('Obteniendo datos de la hoja:', config.spreadsheetId);
      const url = `${this.baseUrl}/spreadsheets/${config.spreadsheetId}/values/${config.range}`;
      const response = await this.fetchWithAuth<{values?: any[][]}>(url);

      if (!response.values) {
        console.warn('No se encontraron valores en la hoja');
        return this.createSuccessResult([]);
      }

      console.log('Datos obtenidos:', response.values);
      
      // Determinar qué filas procesar
      let dataRows: any[][];
      if (config.headerRow > 0) {
        // Si hay headers configurados, intentar usarlos
        const headers = response.values[config.headerRow - 1];
        if (headers && headers.length > 0) {
          console.log('Headers encontrados:', headers);
          dataRows = response.values.slice(config.headerRow);
        } else {
          console.log('No se encontraron headers, usando todas las filas');
          dataRows = response.values;
        }
      } else {
        // Si no hay headers configurados, usar todas las filas
        dataRows = response.values;
      }

      // Filtrar filas vacías y mapear los datos a objetos
      const data: DataRow[] = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row: any[], index: number) => {
          const values: { [key: string]: any } = {};
          const rowNumber = config.headerRow > 0 ? config.headerRow + index + 1 : index + 1;
          
          config.columns.forEach((column, colIndex) => {
            const value = row[colIndex];
            let processedValue: any = null;

            // Solo procesar si el valor no es nulo/vacío
            if (value !== null && value !== undefined && value !== '') {
              switch (column.type) {
                case 'number': {
                  const num = parseFloat(value);
                  processedValue = isNaN(num) ? null : num;
                  break;
                }
                case 'date': {
                  const date = value ? new Date(value) : null;
                  processedValue = date && !isNaN(date.getTime()) ? date : null;
                  break;
                }
                default:
                  processedValue = value;
              }
            }

            // Aplicar formato si existe y el valor no es nulo
            values[column.key] = processedValue !== null ? 
              this.formatValue(processedValue, column.format) : 
              null;
          });

          // Verificar si todos los valores son nulos
          const hasValues = Object.values(values).some(v => v !== null);
          if (!hasValues) {
            return null;
          }

          // Añadir referencia de celda a cada valor
          Object.keys(values).forEach(key => {
            const column = config.columns.find(c => c.key === key);
            if (column) {
              const cellRef = `${this.getColumnLetter(column.index)}${rowNumber}`;
              values[`${key}_cell`] = cellRef;
            }
          });

          return {
            id: `row_${index}`,
            values,
            lastUpdate: new Date(),
            rowNumber // Añadir número de fila para referencia
          };
        })
        .filter((row): row is DataRow => row !== null);

      console.log('Datos procesados:', data);
      return this.createSuccessResult(data);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      return this.createErrorResult(error instanceof Error ? error : 'Error desconocido al obtener datos');
    }
  }

  async updateData(config: SheetConfig, updates: DataRow[], currentData: DataRow[]): Promise<ServiceResult<void>> {
    try {
      await this.waitForRateLimit()

      console.log('Actualizando datos:', updates);
      const url = `${this.baseUrl}/spreadsheets/${config.spreadsheetId}/values:batchUpdate`;
      
      // Preparar las actualizaciones
      const valueRanges = updates.map(update => {
        // Encontrar el índice de la fila en los datos originales
        const rowIndex = currentData.findIndex(row => row.id === update.id);
        if (rowIndex === -1) {
          throw new Error(`No se encontró la fila con ID ${update.id}`);
        }

        // Calcular la fila real (headerRow + índice + 1)
        const actualRowIndex = config.headerRow + rowIndex + 1;
        
        const values = config.columns.map(column => {
          const value = update.values[column.key];
          return this.formatValue(value, column.format);
        });

        return {
          range: `${config.range}${actualRowIndex}`,
          values: [values]
        };
      });

      console.log('Rangos a actualizar:', valueRanges);

      await this.fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: valueRanges
        })
      });

      return this.createSuccessResult(undefined);
    } catch (error) {
      console.error('Error actualizando datos:', error);
      return this.createErrorResult(error instanceof Error ? error : 'Error desconocido al actualizar datos');
    }
  }

  async getSheetData(spreadsheetId: string): Promise<{ success: boolean; data?: SheetData; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/spreadsheets/${spreadsheetId}/values/A1:Z1000`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener datos: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        return { success: false, error: 'No se encontraron datos' };
      }

      const columns = data.values[0];
      const rows = data.values.slice(1).map((row: any[]) => {
        const rowData: any = { id: crypto.randomUUID() };
        columns.forEach((column: string, index: number) => {
          rowData[column] = row[index] || '';
        });
        return rowData;
      });

      return {
        success: true,
        data: {
          columns,
          rows
        }
      };
    } catch (error) {
      console.error('Error en getSheetData:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
} 