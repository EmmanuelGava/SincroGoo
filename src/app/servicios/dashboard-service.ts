import { GoogleSheetsService } from './google/googleSheets';

export interface Estadisticas {
  totalEstablecimientos: number;
  totalProyectos: number;
  búsquedasRecientes: number;
  exportacionesRecientes: number;
}

export class DashboardService {
  private static instance: DashboardService;
  private googleSheetsService: GoogleSheetsService;

  private constructor() {
    this.googleSheetsService = GoogleSheetsService.getInstance();
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  public async obtenerEstadisticas(): Promise<Estadisticas> {
    try {
      // Obtener el historial de búsquedas
      const historialId = localStorage.getItem('historialSheetId');
      let búsquedasRecientes = 0;
      let totalEstablecimientos = 0;

      if (historialId) {
        const historial = await this.googleSheetsService.obtenerHistorialBusquedas();
        búsquedasRecientes = historial.length - 1; // Restar 1 por el encabezado
        // Sumar los resultados de las últimas 5 búsquedas
        totalEstablecimientos = historial.slice(1, 6).reduce((sum, row) => sum + Number(row[7]), 0);
      }

      // Obtener el historial de exportaciones
      const exportacionesId = localStorage.getItem('exportacionesSheetId');
      let exportacionesRecientes = 0;

      if (exportacionesId) {
        const exportaciones = await this.googleSheetsService.obtenerHistorialExportaciones();
        exportacionesRecientes = exportaciones.length - 1; // Restar 1 por el encabezado
      }

      // Por ahora, el total de proyectos es 0 ya que no tenemos esa funcionalidad implementada
      const totalProyectos = 0;

      return {
        totalEstablecimientos,
        totalProyectos,
        búsquedasRecientes,
        exportacionesRecientes
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        totalEstablecimientos: 0,
        totalProyectos: 0,
        búsquedasRecientes: 0,
        exportacionesRecientes: 0
      };
    }
  }
} 