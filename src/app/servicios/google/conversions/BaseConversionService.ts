import { BaseGoogleService } from '../core/BaseGoogleService';
import { ResultadoAPI } from '../core/types';

export abstract class BaseConversionService extends BaseGoogleService {
  protected abstract serviceName: string;
  protected abstract requiredScopes: string[];

  constructor(accessToken: string) {
    super(accessToken);
  }

  /**
   * Verifica si tenemos acceso a un documento de Google
   * @param documentId ID del documento
   * @param apiEndpoint Endpoint de la API (sheets, slides, etc)
   */
  protected async verificarAcceso(documentId: string, apiEndpoint: string): Promise<void> {
    try {
      const response = await fetch(
        `https://${apiEndpoint}.googleapis.com/v4/${apiEndpoint}/${documentId}?fields=id,properties.title`,
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

  /**
   * Crea un nuevo documento de Google
   * @param titulo Título del documento
   * @param apiEndpoint Endpoint de la API (sheets, slides, etc)
   * @returns ID del documento creado
   */
  protected async crearDocumento(titulo: string, apiEndpoint: string): Promise<string> {
    try {
      const response = await fetch(
        `https://${apiEndpoint}.googleapis.com/v4/${apiEndpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: titulo
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'No se pudo crear el documento');
      }

      const data = await response.json();
      return data.spreadsheetId || data.presentationId;
    } catch (error) {
      throw new Error(`Error al crear documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Procesa un archivo y lo convierte al formato deseado
   * @param file Archivo a procesar
   * @param opciones Opciones de conversión
   */
  protected abstract procesarArchivo(file: File, opciones: any): Promise<ResultadoAPI<any>>;

  /**
   * Verifica si un archivo es válido para la conversión
   * @param file Archivo a verificar
   * @param tiposPermitidos Array de tipos MIME permitidos
   */
  protected verificarArchivo(file: File, tiposPermitidos: string[]): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return tiposPermitidos.some(tipo => 
      file.type === tipo || 
      tipo.endsWith(extension || '')
    );
  }

  /**
   * Obtiene la URL de edición de un documento
   * @param documentId ID del documento
   * @param tipo Tipo de documento (sheets, slides, etc)
   */
  protected obtenerUrlEdicion(documentId: string, tipo: string): string {
    return `https://docs.google.com/${tipo}/d/${documentId}/edit`;
  }

  /**
   * Obtiene la URL de visualización de un documento
   * @param documentId ID del documento
   * @param tipo Tipo de documento (sheets, slides, etc)
   */
  protected obtenerUrlVisualizacion(documentId: string, tipo: string): string {
    return `https://docs.google.com/${tipo}/d/${documentId}/view`;
  }
} 