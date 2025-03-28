/**
 * API centralizada para SincroGoo
 * Este archivo unifica todas las operaciones CRUD con Supabase
 */

import { ProyectosService } from '../tablas/proyectos-service';
import { SheetsAPI } from '../tablas/sheets-service';
import { SlidesAPI } from '../slides/slides-service';
import { CeldasAPI } from '../tablas/celdas-service';
import { ElementosAPI } from '../slides/elementos-service';
import { SincronizacionAPI } from '../tablas/sincronizacion-service';

/**
 * API centralizada para SincroGoo que unifica todas las operaciones CRUD con Supabase
 */
export class SincroGooAPI {
  // Proyectos
  static obtenerProyectos = ProyectosService.listarProyectos;
  static obtenerProyecto = ProyectosService.obtenerProyecto;
  static crearProyecto = ProyectosService.crearProyecto;
  static actualizarProyecto = ProyectosService.actualizarProyecto;
  static eliminarProyecto = ProyectosService.eliminarProyecto;
  
  // Sheets
  static guardarSheet = SheetsAPI.crearSheet;
  static obtenerSheetPorGoogleId = SheetsAPI.obtenerSheetPorGoogleId;
  
  // Slides
  static guardarSlide = SlidesAPI.guardarSlide;
  static obtenerSlidePorGoogleId = SlidesAPI.obtenerSlidePorGoogleId;
  
  // Celdas
  static guardarCeldaPorUUID = CeldasAPI.guardarCeldas;
  static guardarCeldaPorGoogleId = CeldasAPI.guardarCeldasGoogle;
  
  // Elementos y asociaciones
  static guardarElemento = ElementosAPI.guardarElemento;
  static asociarElemento = ElementosAPI.guardarAsociacion;
  static desasociarElemento = ElementosAPI.eliminarAsociacion;
  
  /**
   * Sincroniza un proyecto completo con la base de datos
   * @param proyectoId ID del proyecto
   * @param datosSheets Datos de hojas de cálculo
   * @param datosSlides Datos de presentaciones
   * @returns Resultado de la sincronización
   */
  static async sincronizarProyectoCompleto(proyectoId: string, datosSheets: any, datosSlides: any) {
    console.log(' [SincroGooAPI] Iniciando sincronización completa del proyecto:', proyectoId);
    console.log(` [SincroGooAPI] Datos a sincronizar: ${datosSheets.length} hojas, ${datosSlides.length} presentaciones`);
    
    if (datosSheets.length > 0) {
      console.log(' [SincroGooAPI] Resumen de hojas a sincronizar:');
      datosSheets.forEach((sheet: any, index: number) => {
        console.log(`   Hoja ${index + 1}: ${sheet.titulo} (${sheet.googleId}) - ${sheet.celdas?.length || 0} celdas`);
      });
    }
    
    if (datosSlides.length > 0) {
      console.log(' [SincroGooAPI] Resumen de presentaciones a sincronizar:');
      datosSlides.forEach((slide: any, index: number) => {
        console.log(`   Presentación ${index + 1}: ${slide.titulo} (${slide.googleId}) - ${slide.diapositivas?.length || 0} diapositivas`);
      });
    }
    
    try {
      const resultado = await SincronizacionAPI.sincronizarProyecto(proyectoId, datosSheets, datosSlides);
      console.log(' [SincroGooAPI] Sincronización completada con éxito:', resultado);
      return resultado;
    } catch (error) {
      console.error(' [SincroGooAPI] Error durante la sincronización:', error);
      throw error; // Re-lanzar el error para que pueda ser manejado por el llamador
    }
  }
}
