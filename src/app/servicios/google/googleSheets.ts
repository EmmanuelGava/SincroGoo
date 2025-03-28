/**
 * Servicio para interactuar con la API de Google Sheets
 */

import { getSession } from "next-auth/react";
import { getCacheKey, getCacheItem, setCacheItem, shouldRefreshCache } from "@/lib/cache-service";
import { canMakeRequest, recordRequest, waitForRateLimit } from "@/lib/rate-limiter";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;

  private constructor() {}

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const session = await getSession();
      if (!session?.accessToken) {
        console.error('No hay token de acceso en la sesión');
        return null;
      }
      return session.accessToken as string;
    } catch (error) {
      console.error('Error al obtener el token de acceso:', error);
      return null;
    }
  }

  private limpiarDatos(datos: any[][]): any[][] {
    return datos.map(fila => 
      fila.map(valor => {
        if (valor === null || valor === undefined) {
          return '';
        }
        if (Array.isArray(valor)) {
          return valor.join('\n');
        }
        return String(valor);
      })
    );
  }

  public async crearDocumento(titulo: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('No se pudo obtener el token de acceso');
    }

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: titulo
        }
      })
    });

    if (!response.ok) {
      throw new Error('Error al crear el documento de Google Sheets');
    }

    const data = await response.json();
    return data.spreadsheetId;
  }

  public async actualizarHoja(spreadsheetId: string, nombreHoja: string, datos: any[][]): Promise<void> {
    console.log('Iniciando actualizarHoja con:', { spreadsheetId, nombreHoja, filas: datos.length });
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('No se pudo obtener el token de acceso');
    }

    try {
      // Obtener información de la hoja existente
      console.log('Obteniendo información de la hoja...');
      const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!sheetResponse.ok) {
        const errorData = await sheetResponse.json();
        console.error('Error al obtener información de la hoja:', errorData);
        throw new Error(`Error al obtener información de la hoja: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const sheetData = await sheetResponse.json();
      const sheetId = sheetData.sheets[0].properties.sheetId;
      const sheetTitle = sheetData.sheets[0].properties.title;

      // Renombrar la hoja si es necesario
      if (sheetTitle !== nombreHoja) {
        console.log('Renombrando hoja a:', nombreHoja);
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              updateSheetProperties: {
                properties: {
                  sheetId: sheetId,
                  title: nombreHoja
                },
                fields: 'title'
              }
            }]
          })
        });
      }

      // Limpiar y preparar los datos
      console.log('Procesando datos...');
      const datosProcesados = datos.map(fila => 
        fila.map(valor => {
          if (valor === null || valor === undefined) return '';
          if (typeof valor === 'object' && valor instanceof Date) {
            return valor.toISOString().split('T')[0];
          }
          return String(valor).trim();
        })
      );
      console.log('Datos procesados:', datosProcesados.length, 'filas');

      // Actualizar los datos
      console.log('Actualizando datos en la hoja...');
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(nombreHoja)}!A1:${this.getColumnLetter(datosProcesados[0].length)}${datosProcesados.length}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: datosProcesados,
            majorDimension: 'ROWS'
          })
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('Error al actualizar datos:', errorData);
        throw new Error(`Error al actualizar datos: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const updateData = await updateResponse.json();
      console.log('Datos actualizados:', updateData);

      // Aplicar formato
      console.log('Aplicando formato...');
      const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // Formato para la primera fila (encabezados)
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: datosProcesados[0].length
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
              }
            },
            // Ajustar automáticamente el ancho de las columnas
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: datosProcesados[0].length
                }
              }
            },
            // Agregar bordes a todas las celdas
            {
              updateBorders: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: datosProcesados.length,
                  startColumnIndex: 0,
                  endColumnIndex: datosProcesados[0].length
                },
                top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                innerVertical: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } }
              }
            }
          ]
        })
      });

      if (!formatResponse.ok) {
        const errorData = await formatResponse.json();
        console.error('Error al aplicar formato:', errorData);
        throw new Error(`Error al aplicar formato: ${errorData.error?.message || 'Error desconocido'}`);
      }

      console.log('Formato aplicado exitosamente');

    } catch (error) {
      console.error('Error en actualizarHoja:', error);
      throw new Error(`Error al actualizar la hoja: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private getColumnLetter(columnNumber: number): string {
    let dividend = columnNumber;
    let columnName = '';
    let modulo;

    while (dividend > 0) {
      modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
  }

  public async eliminarHojaPredeterminada(spreadsheetId: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('No se pudo obtener el token de acceso');
    }

    // Obtener la lista de hojas
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener información del documento');
    }

    const data = await response.json();
    const hojasPredeterminadas = data.sheets.filter((sheet: any) => 
      sheet.properties.title === 'Sheet1' || 
      sheet.properties.title === 'Hoja1'
    );

    if (hojasPredeterminadas.length > 0) {
      // Eliminar la hoja predeterminada
      const deleteResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: hojasPredeterminadas.map((hoja: any) => ({
            deleteSheet: {
              sheetId: hoja.properties.sheetId
            }
          }))
        })
      });

      if (!deleteResponse.ok) {
        throw new Error('Error al eliminar la hoja predeterminada');
      }
    }
  }

  public async crearHojaCalculo(titulo: string, datos: any[][]): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Modificar el encabezado para incluir el símbolo "#" en Total Puntuaciones
      const headers = ['Nombre', 'Dirección', 'Teléfono', 'Sitio Web', 'Horarios', 'Puntuación', '# Total Puntuaciones'];
      const datosFiltrados = [headers, ...datos.slice(1).map(fila => fila.slice(0, 7))];

      // Crear la hoja de cálculo
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
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
                  frozenRowCount: 1,
                  rowCount: datosFiltrados.length,
                  columnCount: datosFiltrados[0].length
                }
              }
            }
          ]
        })
      });

      if (!createResponse.ok) {
        throw new Error('Error al crear la hoja de cálculo');
      }

      const createData = await createResponse.json();
      const spreadsheetId = createData.spreadsheetId;

      // Obtener el sheetId
      const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!sheetResponse.ok) {
        throw new Error('Error al obtener información de la hoja');
      }

      const sheetData = await sheetResponse.json();
      const sheetId = sheetData.sheets[0].properties.sheetId;

      // Escribir los datos
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Establecimientos!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: datosFiltrados,
          majorDimension: 'ROWS'
        })
      });

      // Aplicar formato
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: datosFiltrados[0].length
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.8,
                      green: 0.9,
                      blue: 1
                    },
                    borders: {
                      top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } }
                    },
                    textFormat: {
                      foregroundColor: { red: 0, green: 0, blue: 0 },
                      bold: true,
                      fontSize: 10,
                      fontFamily: "Arial"
                    },
                    verticalAlignment: 'MIDDLE',
                    horizontalAlignment: 'LEFT'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,borders,textFormat,verticalAlignment,horizontalAlignment)'
              }
            },
            // Filtros
            {
              setBasicFilter: {
                filter: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: datosFiltrados.length,
                    startColumnIndex: 0,
                    endColumnIndex: datosFiltrados[0].length
                  }
                }
              }
            },
            // Ajuste automático de columnas
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: datosFiltrados[0].length
                }
              }
            },
            // Formato de celdas de datos
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 1,
                  endRowIndex: datosFiltrados.length,
                  startColumnIndex: 0,
                  endColumnIndex: datosFiltrados[0].length
                },
                cell: {
                  userEnteredFormat: {
                    borders: {
                      top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                      right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } }
                    },
                    verticalAlignment: 'TOP',
                    textFormat: {
                      fontSize: 10,
                      fontFamily: "Arial"
                    },
                    wrapStrategy: 'WRAP'
                  }
                },
                fields: 'userEnteredFormat(borders,verticalAlignment,textFormat,wrapStrategy)'
              }
            }
          ]
        })
      });

      return spreadsheetId;
    } catch (error) {
      console.error('Error al crear la hoja de cálculo:', error);
      throw new Error('Error al crear la hoja de cálculo');
    }
  }

  private async formatearHoja(spreadsheetId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      // Primero, obtener la información de la hoja
      const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!sheetResponse.ok) {
        const errorData = await sheetResponse.json();
        throw new Error(`Error al obtener información de la hoja: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const sheetData = await sheetResponse.json();
      const sheetId = sheetData.sheets[0].properties.sheetId;

      // Formatear encabezados
      const formatResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 7
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: sheetId,
                  gridProperties: {
                    columnCount: 7,
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties(columnCount,frozenRowCount)'
              }
            }
          ]
        })
      });

      if (!formatResponse.ok) {
        const errorData = await formatResponse.json();
        throw new Error(`Error al formatear la hoja: ${errorData.error?.message || 'Error desconocido'}`);
      }

      // Ajustar ancho de columnas
      const columnResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: Array(7).fill(null).map((_, index) => ({
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: index,
                endIndex: index + 1
              },
              properties: {
                pixelSize: 200
              },
              fields: 'pixelSize'
            }
          }))
        })
      });

      if (!columnResponse.ok) {
        const errorData = await columnResponse.json();
        throw new Error(`Error al ajustar columnas: ${errorData.error?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al formatear la hoja:', error);
      throw new Error(`Error al formatear la hoja: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async escribirDatos(spreadsheetId: string, sheetName: string, datos: any[][]): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: datos,
          majorDimension: 'ROWS'
        })
      });
    } catch (error) {
      console.error('Error al escribir datos:', error);
      throw new Error('Error al escribir datos en la hoja de cálculo');
    }
  }

  public async guardarHistorialBusqueda(busqueda: string, filtros: any, resultados: number): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      
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
              title: 'Historial de Búsquedas - SincroGoo',
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
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Historial!A1:G1?valueInputOption=USER_ENTERED`, {
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
              'Radio (km)',
              'Filtros aplicados',
              'Resultados encontrados',
              'Link a exportación'
            ]]
          })
        });
      } else {
        spreadsheetId = historialId;
      }

      // Agregar nueva entrada al historial
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Historial!A:G:append?valueInputOption=USER_ENTERED`, {
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
            filtros.radio,
            JSON.stringify(filtros),
            resultados,
            localStorage.getItem('lastSpreadsheetId') || 'No exportado'
          ]]
        })
      });

    } catch (error) {
      console.error('Error al guardar en el historial:', error);
    }
  }

  public async obtenerHistorialBusquedas(): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();
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

  public async obtenerHistorialExportaciones(): Promise<any[][]> {
    try {
      const accessToken = await this.getAccessToken();
      const exportacionesId = localStorage.getItem('exportacionesSheetId');

      if (!exportacionesId) {
        return [];
      }

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${exportacionesId}/values/Exportaciones!A:Z`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener historial de exportaciones');
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Error al obtener historial de exportaciones:', error);
      return [];
    }
  }

  public async obtenerInformacionHoja(idHoja: string): Promise<HojaCalculo> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${idHoja}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información de la hoja');
      }

      const data = await response.json();
      return {
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
    } catch (error) {
      console.error('Error al obtener información de la hoja:', error);
      throw error;
    }
  }

  public async obtenerDatosHoja(idHoja: string, indiceHoja: number = 0): Promise<ResultadoAPI<HojaCalculo>> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Obtener información de la hoja
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${idHoja}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información de la hoja');
      }

      const data = await response.json();
      
      // Obtener los datos de la hoja específica
      const sheetData = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${idHoja}/values/${data.sheets[indiceHoja].properties.title}!A:Z`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!sheetData.ok) {
        throw new Error('Error al obtener datos de la hoja');
      }

      const values = await sheetData.json();
      
      // Procesar los datos
      const columnas = values.values?.[0] || [];
      const filas = values.values?.slice(1).map((fila: any[]) => {
        const filaProcesada: any = {};
        columnas.forEach((columna: string, index: number) => {
          filaProcesada[columna] = fila[index] || '';
        });
        return filaProcesada;
      }) || [];

      return {
        exito: true,
        datos: {
          id: data.spreadsheetId,
          titulo: data.properties.title,
          hojas: data.sheets.map((sheet: any) => ({
            id: sheet.properties.sheetId,
            titulo: sheet.properties.title,
            indice: sheet.properties.index,
            columnas: columnas,
            filas: filas
          }))
        }
      };
    } catch (error) {
      console.error('Error al obtener datos de la hoja:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }

  public async listarHojasCalculo(): Promise<ResultadoAPI<HojaCalculo[]>> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener la lista de hojas de cálculo');
      }

      const data = await response.json();
      
      const hojas = await Promise.all(
        data.files.map(async (file: any) => {
          const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${file.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          });

          if (!sheetResponse.ok) {
            throw new Error(`Error al obtener detalles de la hoja ${file.id}`);
          }

          const sheetData = await sheetResponse.json();
          return {
            id: file.id,
            titulo: file.name,
            hojas: sheetData.sheets.map((sheet: any) => ({
              id: sheet.properties.sheetId,
              titulo: sheet.properties.title,
              indice: sheet.properties.index,
              columnas: [],
              filas: []
            }))
          };
        })
      );

      return {
        exito: true,
        datos: hojas
      };
    } catch (error) {
      console.error('Error al listar hojas de cálculo:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }

  public async verificarDocumentoExistente(titulo: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      // Buscar documentos con el mismo nombre
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${titulo}' and mimeType='application/vnd.google-apps.spreadsheet'`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al verificar documentos existentes');
      }

      const data = await response.json();
      
      // Si hay documentos con el mismo nombre, devolver el ID del primero
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error al verificar documento existente:', error);
      throw error;
    }
  }
}

// Exportar la clase en lugar de una instancia
export class ServicioGoogleSheets {
  private static instance: ServicioGoogleSheets;
  private sheetsService: GoogleSheetsService;

  private constructor() {
    this.sheetsService = GoogleSheetsService.getInstance();
  }

  public static obtenerInstancia(): ServicioGoogleSheets {
    if (!ServicioGoogleSheets.instance) {
      ServicioGoogleSheets.instance = new ServicioGoogleSheets();
    }
    return ServicioGoogleSheets.instance;
  }

  // Delegate methods to sheetsService
  public async crearHojaCalculo(titulo: string, datos: any[][]): Promise<string> {
    return this.sheetsService.crearHojaCalculo(titulo, datos);
  }

  public async obtenerInformacionHoja(idHoja: string): Promise<any> {
    return this.sheetsService.obtenerInformacionHoja(idHoja);
  }

  public async obtenerDatosHoja(idHoja: string, indiceHoja: number = 0): Promise<ResultadoAPI<HojaCalculo>> {
    return this.sheetsService.obtenerDatosHoja(idHoja, indiceHoja);
  }

  public async listarHojasCalculo(): Promise<ResultadoAPI<HojaCalculo[]>> {
    return this.sheetsService.listarHojasCalculo();
  }

  // Add other methods as needed
} 