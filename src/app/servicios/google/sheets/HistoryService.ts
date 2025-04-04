import { BaseGoogleService } from '../core/BaseGoogleService';

export class HistoryService extends BaseGoogleService {
  protected serviceName = 'HistoryService';
  protected requiredScopes = ['https://www.googleapis.com/auth/spreadsheets'];
  private static instance: HistoryService | null = null;

  private constructor(accessToken: string) {
    super(accessToken);
  }

  public static getInstance(accessToken: string): HistoryService {
    if (!this.instance) {
      this.instance = new HistoryService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  async obtenerHistorialBusquedas(): Promise<any[]> {
    try {
      const response = await this.apiClient.sheets('v4').spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_HISTORY_ID,
        range: 'Historial!A2:H',
        auth: this.oauth2Client
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }

  async guardarHistorialBusqueda(busqueda: string, filtros: any, resultados: number): Promise<void> {
    try {
      const fecha = new Date().toLocaleString();
      const fila = [
        fecha,
        busqueda,
        filtros.ubicacion || '',
        filtros.lat,
        filtros.lng,
        filtros.radio,
        JSON.stringify(filtros),
        resultados
      ];

      await this.apiClient.sheets('v4').spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_HISTORY_ID,
        range: 'Historial!A2:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [fila]
        },
        auth: this.oauth2Client
      });
    } catch (error) {
      console.error('Error al guardar historial:', error);
      throw error;
    }
  }
} 