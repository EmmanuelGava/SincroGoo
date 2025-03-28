import { ServicioGoogleSlides } from '../google/googleSlides';
import * as XLSX from 'xlsx';
import { Diapositiva, TipoContenido } from '@/app/excel-to-slides/modelos/diapositiva';

export interface HojaExcel {
  nombre: string;
  nombreDestino: string;
  seleccionada: boolean;
  datos?: any[][];
}

type TipoGrafico = 'barras' | 'lineas' | 'circular';

interface ConfiguracionFila {
  inicio: number;  // Fila inicial (1-indexed)
  fin?: number;    // Fila final opcional (1-indexed)
}

export type DatosDiapositiva = Diapositiva & {
  hoja: string;
  filas: ConfiguracionFila;
};

interface ElementoSlide {
  tipo: 'TITLE' | 'SUBTITLE' | 'TABLE' | 'CHART' | 'FOOTER' | 'NOTES';
  texto?: string;
  datos?: any[][];
  tipoGrafico?: TipoGrafico;
}

interface ConfiguracionPaginacion {
  filasPorDiapositiva: number;
  incluirEncabezados: boolean;
}

export class ExcelToSlidesService {
  private static instancia: ExcelToSlidesService | null = null;
  private servicioSlides: ServicioGoogleSlides | null = null;
  private static LIMITE_FILAS_POR_DIAPOSITIVA = 20; // Límite predeterminado
  private archivoActual: File | null = null;

  private constructor() {}

  static async getInstance(): Promise<ExcelToSlidesService> {
    if (!ExcelToSlidesService.instancia) {
      ExcelToSlidesService.instancia = new ExcelToSlidesService();
      ExcelToSlidesService.instancia.servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      
      if (!ExcelToSlidesService.instancia.servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }
    }
    return ExcelToSlidesService.instancia;
  }

  private async leerArchivo(archivo: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(archivo);
    });
  }

  async leerHojasExcel(archivo: File): Promise<string[]> {
    this.archivoActual = archivo;
    const workbook = await this.leerArchivo(archivo);
    return workbook.SheetNames;
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[nombreHoja];
          
          const datos = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          }) as any[][];

          // Si se especifican filas, filtrar los datos
          if (filas) {
            const inicio = filas.inicio - 1; // Convertir a 0-indexed
            const fin = filas.fin ? filas.fin - 1 : datos.length - 1;
            resolve(datos.slice(inicio, fin + 1));
          } else {
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

  private dividirDatosEnLotes(datos: any[][], config: { filasPorDiapositiva: number, incluirEncabezados: boolean }): any[][][] {
    if (!datos || datos.length === 0) return [];

    const lotes: any[][][] = [];
    const encabezados = datos[0];
    let datosContenido = datos.slice(1);

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

  async generarPresentacionPaginada(
    nombre: string, 
    diapositivas: DatosDiapositiva[]
  ): Promise<string> {
    try {
      if (!this.servicioSlides) {
        throw new Error('El servicio de Google Slides no está inicializado');
      }

      if (!this.archivoActual) {
        throw new Error('No hay archivo Excel seleccionado');
      }

      console.log('📊 Generando presentación paginada desde Excel:', nombre);
      
      const respCreacion = await this.servicioSlides.crearPresentacion(nombre);
      if (!respCreacion.exito || !respCreacion.datos) {
        throw new Error('Error al crear presentación desde Excel');
      }

      const presentacionId = respCreacion.datos.presentationId;
      console.log('📝 ID de presentación:', presentacionId);

      // Procesar cada diapositiva
      for (const diapositiva of diapositivas) {
        if (diapositiva.hoja) {
          // Leer los datos de la hoja según la configuración de filas
          const datos = await this.leerDatosHoja(this.archivoActual, diapositiva.hoja, diapositiva.filas);

          if (!datos || datos.length === 0) {
            console.warn('No hay datos en la hoja');
            continue;
          }

          console.log('Datos obtenidos:', datos);

          // Crear una diapositiva por cada fila de datos
          for (const fila of datos) {
            // Crear los elementos de la diapositiva basados en el mapeo
            const elementosDiapositiva: ElementoSlide[] = [];

            // Procesar cada mapeo de columna
            diapositiva.mapeoColumnas?.forEach(mapeo => {
              const indiceColumna = XLSX.utils.decode_col(mapeo.columna);
              const valorRaw = fila[indiceColumna];
              const valor = this.formatearValor(valorRaw, mapeo.encabezado || '');
              
              if (valor) { // Solo agregar el elemento si hay un valor
                console.log(`Procesando mapeo: ${mapeo.elementoDiapositiva} -> columna ${mapeo.columna} -> valor: ${valor}`);
                
                // Determinar el tipo de elemento basado en el mapeo
                switch (mapeo.elementoDiapositiva) {
                  case 'titulo_principal':
                    elementosDiapositiva.push({
                      tipo: 'TITLE',
                      texto: valor
                    });
                    break;
                  case 'subtitulo_principal':
                    elementosDiapositiva.push({
                      tipo: 'SUBTITLE',
                      texto: valor
                    });
                    break;
                  case 'contenido_principal':
                    elementosDiapositiva.push({
                      tipo: 'TITLE',
                      texto: valor
                    });
                    break;
                  case 'contenido_secundario':
                    elementosDiapositiva.push({
                      tipo: 'SUBTITLE',
                      texto: valor
                    });
                    break;
                  case 'pie_pagina':
                    elementosDiapositiva.push({
                      tipo: 'FOOTER',
                      texto: valor
                    });
                    break;
                  case 'notas':
                    elementosDiapositiva.push({
                      tipo: 'NOTES',
                      texto: valor
                    });
                    break;
                  default:
                    console.log(`Tipo de elemento no manejado: ${mapeo.elementoDiapositiva}`);
                }
              }
            });

            // Si no hay elementos pero hay título estático, usarlo
            if (elementosDiapositiva.length === 0) {
              if (diapositiva.titulo) {
                elementosDiapositiva.push({
                  tipo: 'TITLE',
                  texto: diapositiva.titulo
                });
              }
              if (diapositiva.subtitulo) {
                elementosDiapositiva.push({
                  tipo: 'SUBTITLE',
                  texto: diapositiva.subtitulo
                });
              }
            }

            // Solo crear la diapositiva si hay elementos para mostrar
            if (elementosDiapositiva.length > 0) {
              console.log('Creando diapositiva con elementos:', elementosDiapositiva);

              const respuesta = await this.servicioSlides.crearDiapositiva(
                presentacionId,
                'TITLE_AND_BODY',
                elementosDiapositiva
              );

              if (!respuesta.exito) {
                console.error('Error al crear diapositiva:', respuesta.error);
                throw new Error(respuesta.error);
              }

              // Esperar un momento antes de crear la siguiente diapositiva
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      }

      return presentacionId;
    } catch (error) {
      console.error('Error al generar presentación:', error);
      throw error;
    }
  }
} 