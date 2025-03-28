// Exportar todas las clases para facilitar su importación
export * from '../globales/conexion';
export * from '../proyectos/proyectos-service';
export * from './sheets-service';
export * from '../slides/slides-service';
export * from './celdas-service';
export * from '../slides/elementos-service';
export * from './sincronizacion-service';
export * from '../slides/diapositivas-service';

// Importar las clases para que funcione la exportación
import { ProyectosAPI } from '../proyectos/proyectos-service';
import { SheetsAPI } from './sheets-service';
import { SlidesAPI } from '../slides/slides-service';
import { CeldasAPI } from './celdas-service';
import { ElementosAPI } from '../slides/elementos-service';
import { SincronizacionAPI } from './sincronizacion-service';
import { DiapositivasAPI } from '../slides/diapositivas-service';

// Clase principal que agrupa todas las funcionalidades
export class SincroGooAPI {
  // Proyectos
  static obtenerProyectos = ProyectosAPI.obtenerProyectos;
  static obtenerProyecto = ProyectosAPI.obtenerProyecto;
  static crearProyecto = ProyectosAPI.crearProyecto;
  static actualizarProyecto = ProyectosAPI.actualizarProyecto;
  static eliminarProyecto = ProyectosAPI.eliminarProyecto;
  
  // Sheets
  static async guardarSheet(datos: any) {
    return await SheetsAPI.crearSheet(datos);
  }

  static async guardarSheetCompleto(datos: any) {
    return await SheetsAPI.crearSheet(datos);
  }

  static obtenerSheetPorGoogleId = SheetsAPI.obtenerSheetPorGoogleId;
  static obtenerSheet = SheetsAPI.obtenerSheet;
  static obtenerSheetsPorProyecto = SheetsAPI.obtenerSheetsPorProyecto;
  
  // Slides
  static guardarSlide = SlidesAPI.guardarSlide;
  static guardarSlideCompleto = SlidesAPI.guardarSlideCompleto;
  static obtenerSlidePorGoogleId = SlidesAPI.obtenerSlidePorGoogleId;
  static obtenerSlide = SlidesAPI.obtenerSlide;
  static obtenerDiapositivas = SlidesAPI.obtenerDiapositivas;
  static guardarDiapositiva = SlidesAPI.guardarDiapositiva;
  
  // Diapositivas
  static obtenerDiapositivasPorPresentacion = DiapositivasAPI.obtenerDiapositivasPorPresentacion;
  static obtenerDiapositivaPorGoogleId = DiapositivasAPI.obtenerDiapositivaPorGoogleId;
  static guardarDiapositivaNueva = DiapositivasAPI.guardarDiapositiva;
  static actualizarOrdenDiapositivas = DiapositivasAPI.actualizarOrdenDiapositivas;
  static eliminarDiapositiva = DiapositivasAPI.eliminarDiapositiva;
  
  // Celdas
  static guardarCeldas = CeldasAPI.guardarCeldas;
  static guardarCeldasGoogle = CeldasAPI.guardarCeldasGoogle;
  static guardarCeldasEnBaseDatos = CeldasAPI.guardarCeldasEnBaseDatos;
  static obtenerCeldas = CeldasAPI.obtenerCeldas;
  static obtenerCelda = CeldasAPI.obtenerCelda;
  static obtenerCeldaPorReferencia = CeldasAPI.obtenerCeldaPorReferencia;
  static convertirDatosGoogleSheets = CeldasAPI.convertirDatosGoogleSheets;
  
  // Elementos y asociaciones
  static async guardarElementos(datos: any) {
    return await ElementosAPI.guardarElemento(datos);
  }

  static obtenerElementosPorDiapositiva = ElementosAPI.obtenerElementosPorDiapositiva;
  static obtenerAsociacionesPorElemento = ElementosAPI.obtenerAsociacionesPorElemento;
  static async guardarAsociacionesElementosCeldas(datos: any) {
    return await ElementosAPI.guardarAsociacion(datos);
  }

  static async asociarElemento(datos: any) {
    return await ElementosAPI.guardarAsociacion(datos);
  }

  static async desasociarElemento(datos: any) {
    return await ElementosAPI.eliminarAsociacion(datos);
  }

  static async actualizarElementoConCeldaAsociada(datos: any) {
    return await ElementosAPI.guardarElemento(datos);
  }
  
  // Sincronización
  static inicializarBaseDatos = SincronizacionAPI.inicializarBaseDatos;
  static verificarFuncionesRPC = SincronizacionAPI.verificarFuncionesRPC;
  static verificarTablas = SincronizacionAPI.verificarTablas;
  static verificarTabla = SincronizacionAPI.verificarTabla;
  static verificarTablasElementos = SincronizacionAPI.verificarTablasElementos;
  static sincronizarProyecto = SincronizacionAPI.sincronizarProyecto;
}

// Exportar todas las APIs de tablas
export { SlidesAPI } from '../slides/slides-service';
export { SheetsAPI } from './sheets-service';
export { ElementosAPI } from '../slides/elementos-service';
export { CeldasAPI } from './celdas-service';
export { DiapositivasAPI } from '../slides/diapositivas-service';
