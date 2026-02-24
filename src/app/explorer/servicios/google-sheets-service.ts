import { GoogleAuthService } from './google-auth-service';

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private googleAuthService: GoogleAuthService;

  private constructor() {
    this.googleAuthService = GoogleAuthService.getInstance();
  }

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  private async obtenerTokenAcceso(): Promise<string> {
    return this.googleAuthService.obtenerTokenAcceso();
  }

  public async crearHojaCalculo(titulo: string, datos: any[][]): Promise<string> {
    try {
      const accessToken = await this.obtenerTokenAcceso();

      // Crear nueva hoja de cálculo
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

      // Escribir datos
      await this.escribirDatos(spreadsheetId, 'Establecimientos', datos);

      // Aplicar formato
      await this.aplicarFormato(spreadsheetId, datos.length);

      return spreadsheetId;
    } catch (error) {
      console.error('Error al crear hoja de cálculo:', error);
      throw error;
    }
  }

  private async escribirDatos(spreadsheetId: string, sheetName: string, datos: any[][]): Promise<void> {
    try {
      const accessToken = await this.obtenerTokenAcceso();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: datos,
            majorDimension: 'ROWS'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al escribir datos');
      }
    } catch (error) {
      console.error('Error al escribir datos:', error);
      throw error;
    }
  }

  private async aplicarFormato(spreadsheetId: string, totalRows: number): Promise<void> {
    try {
      const accessToken = await this.obtenerTokenAcceso();
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              // Formato del encabezado
              {
                repeatCell: {
                  range: {
                    sheetId: 0,
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
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: totalRows,
                    startColumnIndex: 0,
                    endColumnIndex: 7
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
                    sheetId: 0,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: 7
                  }
                }
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al aplicar formato');
      }
    } catch (error) {
      console.error('Error al aplicar formato:', error);
      throw error;
    }
  }

  public async guardarHistorialBusqueda(busqueda: string, filtros: any, resultados: number): Promise<void> {
    try {
      const accessToken = await this.obtenerTokenAcceso();
      
      // Obtener o crear la hoja de historial
      const historialId = localStorage.getItem('historialSheetId');
      let spreadsheetId: string;

      if (!historialId) {
        // Crear nueva hoja para historial
        const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              title: 'Historial de Búsquedas - Klosync',
            },
            sheets: [
              {
                properties: {
                  title: 'Historial',
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error('Error al crear la hoja de historial');
        }

        const data = await response.json();
        spreadsheetId = data.spreadsheetId;
        localStorage.setItem('historialSheetId', spreadsheetId);

        // Agregar encabezados
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Historial!A1:H1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[
              'Fecha',
              'Término de búsqueda',
              'Ubicación',
              'Latitud',
              'Longitud',
              'Radio (km)',
              'Filtros aplicados',
              'Resultados encontrados'
            ]]
          })
        });
      } else {
        spreadsheetId = historialId;
      }

      // Agregar nueva entrada al historial
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Historial!A:H:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            new Date().toLocaleString(),
            busqueda,
            filtros.ubicacion || 'No especificada',
            filtros.lat,
            filtros.lng,
            filtros.radio,
            JSON.stringify({
              precioMinimo: filtros.precioMinimo,
              precioMaximo: filtros.precioMaximo,
              puntuacionMinima: filtros.puntuacionMinima,
              horarioApertura: filtros.horarioApertura ? filtros.horarioApertura.format('HH:mm') : null,
              horarioCierre: filtros.horarioCierre ? filtros.horarioCierre.format('HH:mm') : null
            }),
            resultados
          ]]
        })
      });

    } catch (error) {
      console.error('Error al guardar en el historial:', error);
    }
  }

  public async obtenerHistorialBusquedas(): Promise<any[]> {
    try {
      const accessToken = await this.obtenerTokenAcceso();
      const historialId = localStorage.getItem('historialSheetId');

      if (!historialId) {
        return [];
      }

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${historialId}/values/Historial!A:G`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener el historial');
      }

      const data = await response.json();
      return data.values || [];

    } catch (error) {
      console.error('Error al obtener el historial:', error);
      return [];
    }
  }
} 