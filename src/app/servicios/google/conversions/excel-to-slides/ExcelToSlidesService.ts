import { BaseConversionService } from '../BaseConversionService';
import { ResultadoAPI } from '../../core/types';
import * as XLSX from 'xlsx';
import { 
  OpcionesConversion,
  ResultadoConversion,
  DatosConversion,
  HojaExcel,
  ConfiguracionFila,
  ElementoSlide,
  ConfiguracionPaginacion,
  TipoGrafico
} from './types';
import { SlidesService } from '../../slides/SlidesService';
import { ElementoDiapositiva, TipoLayout, OpcionesCreacion, ContenidoTextoBase } from '../../slides/types';
import { slides_v1 } from 'googleapis';

export type DatosDiapositiva = {
  hoja: string;
  filas: ConfiguracionFila;
};

type SlidesRequest = slides_v1.Schema$Request;

export class ExcelToSlidesService extends BaseConversionService {
  protected serviceName = 'ExcelToSlidesService';
  protected requiredScopes = ['https://www.googleapis.com/auth/presentations'];
  private static instance: ExcelToSlidesService | null = null;
  private servicioSlides: SlidesService;
  private static readonly LIMITE_FILAS_POR_DIAPOSITIVA = 20;

  private constructor(accessToken: string) {
    super(accessToken);
    this.servicioSlides = SlidesService.getInstance(accessToken);
  }

  public static getInstance(accessToken: string): ExcelToSlidesService {
    if (!this.instance) {
      this.instance = new ExcelToSlidesService(accessToken);
    } else {
      this.instance.setAccessToken(accessToken);
    }
    return this.instance;
  }

  protected setAccessToken(accessToken: string): void {
    super.setAccessToken(accessToken);
    this.servicioSlides = SlidesService.getInstance(accessToken);
  }

  async leerHojasExcel(archivo: File): Promise<string[]> {
    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      return workbook.SheetNames;
    } catch (error) {
      this.logError('Error al leer hojas de Excel:', error);
      throw new Error('No se pudo leer el archivo Excel');
    }
  }

  async leerEncabezadosHoja(archivo: File, nombreHoja: string, filaEncabezados: number = 1): Promise<{ [columna: string]: string }> {
    const workbook = await this.leerArchivo(archivo);
    const worksheet = workbook.Sheets[nombreHoja];
    
    if (!worksheet) {
      throw new Error(`No se encontró la hoja "${nombreHoja}"`);
    }

    const encabezados: { [columna: string]: string } = {};
    const ref = worksheet['!ref'];
    
    if (!ref) {
      return encabezados;
    }

    const range = XLSX.utils.decode_range(ref);
    const filas = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null | undefined)[][];
    const filaHeaders = filas[filaEncabezados - 1] || []; // Convertir a 0-indexed

    for (let C = range.s.c; C <= range.e.c; C++) {
      const columna = XLSX.utils.encode_col(C);
      const valor = filaHeaders[C];
      encabezados[columna] = valor != null ? String(valor) : '';
    }

    return encabezados;
  }

  async leerDatosHoja(archivo: File, nombreHoja: string, filas?: ConfiguracionFila): Promise<any[][]> {
    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[nombreHoja];
      
      if (!worksheet) {
        throw new Error(`No se encontró la hoja "${nombreHoja}"`);
      }

      const datos = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ''
      }) as any[][];

      // Si se especifican filas, filtrar los datos
      if (filas) {
        const inicio = filas.inicio - 1; // Convertir a 0-indexed
        const fin = filas.fin ? filas.fin - 1 : datos.length - 1;
        return datos.slice(inicio, fin + 1);
      }
      
      return datos;
    } catch (error) {
      this.logError('Error al leer datos de la hoja:', error);
      throw new Error(`No se pudo leer la hoja "${nombreHoja}"`);
    }
  }

  private dividirDatosEnLotes(datos: any[][], config: ConfiguracionPaginacion): any[][][] {
    if (!datos || datos.length === 0) return [];

    const lotes: any[][][] = [];
    const encabezados = datos[0];
    const datosContenido = datos.slice(1);

    // Dividir en lotes según el límite de filas
    for (let i = 0; i < datosContenido.length; i += config.filasPorDiapositiva) {
      const lote = datosContenido.slice(i, i + config.filasPorDiapositiva);
      if (config.incluirEncabezados) {
        lotes.push([encabezados, ...lote]);
      } else {
        lotes.push(lote);
      }
    }

    return lotes;
  }

  private formatearValor(valor: any, tipo: string): string {
    if (valor === null || valor === undefined) return '';
    
    // Si es un número y el tipo contiene 'precio' o 'valor'
    if (typeof valor === 'number' && (tipo.toLowerCase().includes('precio') || tipo.toLowerCase().includes('valor'))) {
      return `$${valor.toLocaleString('es-CL')}`;
    }
    
    return String(valor).trim();
  }

  async generarPresentacionPaginada(titulo: string, datos: any[]): Promise<string | null> {
    try {
      const opciones: OpcionesCreacion = {
        titulo: titulo
      };

      const resultado = await this.servicioSlides.crearPresentacion(opciones);
      
      if (!resultado.exito || !resultado.datos) {
        console.error('Error al crear la presentación:', resultado);
        return null;
      }

      const presentationId = resultado.datos.presentationId;
      const requests: slides_v1.Schema$Request[] = [];

      // ... resto del código para generar las diapositivas ...

      if (requests.length > 0) {
        await this.servicioSlides.actualizarPresentacion(presentationId, requests);
      }

      return presentationId;
    } catch (error) {
      console.error('Error al generar la presentación:', error);
      return null;
    }
  }

  protected async procesarArchivo(file: File, opciones: OpcionesConversion): Promise<ResultadoAPI<ResultadoConversion>> {
    try {
      // 1. Verificar archivo
      if (!this.verificarArchivo(file, [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls'
      ])) {
        throw new Error('Formato de archivo no válido');
      }

      // 2. Si hay ID existente, verificar acceso
      if (opciones.documentoExistenteId) {
        await this.verificarAcceso(opciones.documentoExistenteId, 'slides');
      }

      // 3. Leer hojas del Excel
      const hojas = await this.leerHojasExcel(file);
      const hojasSeleccionadas = hojas.map(nombre => ({
        nombre,
        nombreDestino: nombre,
        seleccionada: true
      }));

      // 4. Crear presentación
      const presentationId = opciones.documentoExistenteId || 
        await this.crearDocumento(opciones.nombreDocumento, 'slides');

      // 5. Procesar cada hoja
      const diapositivas = [];
      for (const hoja of hojasSeleccionadas.filter(h => h.seleccionada)) {
        const datos = await this.leerDatosHoja(file, hoja.nombre);
        
        // Dividir datos en lotes si es necesario
        const lotes = this.dividirDatosEnLotes(datos, {
          filasPorDiapositiva: opciones.filasPorDiapositiva || ExcelToSlidesService.LIMITE_FILAS_POR_DIAPOSITIVA,
          incluirEncabezados: opciones.incluirEncabezados || true
        });

        // Crear una diapositiva por lote
        for (let i = 0; i < lotes.length; i++) {
          await this.servicioSlides.insertarDiapositiva(presentationId, i, 'TITULO_Y_CUERPO');
          
          const elementos: ElementoDiapositiva[] = [{
            id: `titulo_${i}`,
            tipo: 'TEXTO',
            posicion: { x: 0, y: 0, unidad: 'PT' },
            tamaño: { ancho: 100, alto: 50, unidad: 'PT' },
            contenido: {
              tipo: 'TEXTO',
              texto: `${hoja.nombreDestino} - Parte ${i + 1}`
            } as ContenidoTextoBase
          }];

          const resultado = await this.servicioSlides.actualizarDiapositiva(
            presentationId,
            `slide_${i}`,
            elementos
          );

          if (resultado.exito) {
            diapositivas.push({
              id: `slide_${i}`,
              titulo: `${hoja.nombreDestino} - Parte ${i + 1}`,
              indice: i
            });
          }
        }
      }

      return {
        exito: true,
        datos: {
          exito: true,
          error: undefined,
          datos: {
            exito: true,
            presentationId,
            url: this.obtenerUrlEdicion(presentationId, 'slides'),
            diapositivas
          }
        }
      };

    } catch (error) {
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        codigo: 500
      };
    }
  }

  private async leerArchivo(archivo: File): Promise<XLSX.WorkBook> {
    const buffer = await archivo.arrayBuffer();
    return XLSX.read(buffer, { type: 'array' });
  }

  /**
   * Sincroniza un archivo Excel con Google Slides
   * @param hojas Lista de hojas a sincronizar
   * @param archivo Archivo Excel
   * @param opciones Opciones de conversión
   * @returns Resultado de la sincronización
   */
  async sincronizarConGoogleSlides(
    hojas: HojaExcel[],
    archivo: File,
    opciones: OpcionesConversion
  ): Promise<ResultadoConversion> {
    try {
      // 1. Verificar archivo
      if (!this.verificarArchivo(archivo, [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls'
      ])) {
        throw new Error('Formato de archivo no válido');
      }

      // 2. Si hay ID existente, verificar acceso
      if (opciones.documentoExistenteId) {
        await this.verificarAcceso(opciones.documentoExistenteId, 'slides');
      }

      // 3. Crear o usar documento existente
      const presentationId = opciones.documentoExistenteId || 
        await this.crearDocumento(opciones.nombreDocumento, 'slides');

      // 4. Procesar cada hoja seleccionada
      const diapositivasCreadas = [];
      let indiceActual = 0;
      
      for (const hoja of hojas.filter(h => h.seleccionada)) {
        const datos = await this.leerDatosHoja(archivo, hoja.nombre);
        
        // Crear diapositivas para esta hoja
        const resultado = await this.servicioSlides.insertarDiapositiva(
          presentationId,
          indiceActual++,
          'TITULO_Y_CUERPO'
        );

        if (resultado.exito) {
          // Actualizar el contenido de la diapositiva
          const elementos: ElementoDiapositiva[] = [{
            id: `titulo_${indiceActual}`,
            tipo: 'TEXTO',
            posicion: { x: 0, y: 0, unidad: 'PT' },
            tamaño: { ancho: 100, alto: 50, unidad: 'PT' },
            contenido: {
              tipo: 'TEXTO',
              texto: hoja.nombreDestino
            } as ContenidoTextoBase
          }];

          await this.servicioSlides.actualizarDiapositiva(
            presentationId,
            `slide_${indiceActual}`,
            elementos
          );

          diapositivasCreadas.push({
            id: `slide_${indiceActual}`,
            titulo: hoja.nombreDestino,
            indice: indiceActual
          });
        }
      }

      const url = this.obtenerUrlEdicion(presentationId, 'slides');
      const datos: DatosConversion = {
        exito: true,
        presentationId,
        url,
        diapositivas: diapositivasCreadas.map(d => ({
          id: d.id,
          titulo: d.titulo,
          indice: d.indice
        }))
      };

      return {
        exito: true,
        datos
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