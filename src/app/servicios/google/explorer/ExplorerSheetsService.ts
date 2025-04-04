import { BaseGoogleService } from '../core/BaseGoogleService';
import { ResultadoAPI } from '../core/types';

export interface HistorialBusqueda {
  fecha: string;
  busqueda: string;
  filtros: string;
  resultados: number;
}

export interface ResultadoGuardado {
  spreadsheetId: string;
  url: string;
}

export class ExplorerSheetsService extends BaseGoogleService {
  protected serviceName = 'ExplorerSheetsService';
  protected requiredScopes = ['https://www.googleapis.com/auth/spreadsheets'];
  private static instance: ExplorerSheetsService | null = null;

  private constructor(accessToken: string) {
    super(accessToken);
  }

  public static getInstance(accessToken: string): ExplorerSheetsService {
    if (!this.instance) {
      this.instance = new ExplorerSheetsService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  public async crearHojaCalculo(titulo: string, datos: any[][]): Promise<ResultadoAPI<ResultadoGuardado>> {
    try {
      // Crear nueva hoja de cálculo
      const response = await this.fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: titulo,
          },
          sheets: [
            {
              properties: {
                title: 'Establecimientos',
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear la hoja de cálculo');
      }

      const data = await response.json();
      const spreadsheetId = data.spreadsheetId;
      
      // Obtener el ID de la hoja
      const sheetResponse = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`
      );

      if (!sheetResponse.ok) {
        throw new Error('Error al obtener información de la hoja');
      }

      const sheetData = await sheetResponse.json();
      const sheetId = sheetData.sheets[0].properties.sheetId;

      // Escribir datos
      await this.escribirDatos(spreadsheetId, 'Establecimientos', datos);

      // Aplicar formato
      await this.aplicarFormato(spreadsheetId, datos.length, sheetId);

      return {
        exito: true,
        datos: {
          spreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        }
      };
    } catch (error) {
      this.logError('Error al crear hoja de cálculo:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  private async escribirDatos(spreadsheetId: string, sheetName: string, datos: any[][]): Promise<void> {
    try {
      const response = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: datos,
            majorDimension: 'ROWS'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al escribir datos: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error al escribir datos:', error);
      throw error;
    }
  }

  private async aplicarFormato(spreadsheetId: string, totalRows: number, sheetId: number): Promise<void> {
    try {
      const response = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              // Formato del encabezado
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: {
                        red: 0.27,
                        green: 0.50,
                        blue: 0.27
                      },
                      textFormat: {
                        foregroundColor: {
                          red: 1,
                          green: 1,
                          blue: 1
                        },
                        bold: true
                      },
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'MIDDLE'
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                }
              },
              // Bordes de la tabla
              {
                updateBorders: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: totalRows,
                    startColumnIndex: 0,
                    endColumnIndex: 9
                  },
                  top: {
                    style: 'SOLID',
                    width: 1
                  },
                  bottom: {
                    style: 'SOLID',
                    width: 1
                  },
                  left: {
                    style: 'SOLID',
                    width: 1
                  },
                  right: {
                    style: 'SOLID',
                    width: 1
                  },
                  innerHorizontal: {
                    style: 'SOLID',
                    width: 1
                  },
                  innerVertical: {
                    style: 'SOLID',
                    width: 1
                  }
                }
              },
              // Ajustar ancho de columnas
              {
                autoResizeDimensions: {
                  dimensions: {
                    sheetId: sheetId,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: 9
                  }
                }
              },
              // Ajustar el texto para que se ajuste
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 1,
                    endRowIndex: totalRows
                  },
                  cell: {
                    userEnteredFormat: {
                      wrapStrategy: 'WRAP',
                      verticalAlignment: 'TOP'
                    }
                  },
                  fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
                }
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al aplicar formato: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error al aplicar formato:', error);
      throw error;
    }
  }

  public async guardarHistorialBusqueda(historial: HistorialBusqueda): Promise<ResultadoAPI<void>> {
    try {
      const spreadsheetId = process.env.NEXT_PUBLIC_HISTORIAL_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new Error('ID de hoja de historial no configurado');
      }

      const datos = [
        [
          historial.fecha,
          historial.busqueda,
          historial.filtros,
          historial.resultados
        ]
      ];

      await this.escribirDatos(spreadsheetId, 'Historial', datos);

      return {
        exito: true
      };
    } catch (error) {
      this.logError('Error al guardar historial:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  public async obtenerHistorialBusquedas(): Promise<ResultadoAPI<HistorialBusqueda[]>> {
    try {
      const spreadsheetId = process.env.NEXT_PUBLIC_HISTORIAL_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new Error('ID de hoja de historial no configurado');
      }

      const response = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Historial!A:D`
      );

      if (!response.ok) {
        throw new Error('Error al obtener historial');
      }

      const data = await response.json();
      const valores = data.values || [];

      // Convertir los valores a objetos HistorialBusqueda
      const historial: HistorialBusqueda[] = valores.slice(1).map((fila: any[]) => ({
        fecha: fila[0] || '',
        busqueda: fila[1] || '',
        filtros: fila[2] || '',
        resultados: parseInt(fila[3]) || 0
      }));

      return {
        exito: true,
        datos: historial
      };
    } catch (error) {
      this.logError('Error al obtener historial:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
} 