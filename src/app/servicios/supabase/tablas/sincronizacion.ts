/**
 * Este archivo es una redirección al archivo sincronizacion-service.ts
 * Se mantiene para compatibilidad con código existente
 */

import { SheetsAPI } from './sheets-service';
import { SlidesAPI } from '../slides/slides-service';
import { CeldasAPI } from './celdas-service';
import { ElementosAPI } from '../slides/elementos-service';
import { SincronizacionAPI } from './sincronizacion-service';

// Exportar todas las clases para mantener compatibilidad
export { SincronizacionAPI, SheetsAPI, SlidesAPI, CeldasAPI, ElementosAPI };

// Agregar método actualizarElemento a ElementosAPI si no existe
// Esto es para compatibilidad con código existente
if (!('actualizarElemento' in ElementosAPI)) {
  (ElementosAPI as any).actualizarElemento = async function(elemento: any) {
    console.log('⚠️ [Compatibilidad] Usando método de compatibilidad actualizarElemento');
    return await ElementosAPI.guardarElemento(elemento);
  };
}

// Asegurar que los métodos que manejan string | undefined sean seguros
const originalEliminarAsociacion = ElementosAPI.eliminarAsociacion;
(ElementosAPI as any).eliminarAsociacion = async function(id: string | undefined) {
  if (!id) {
    console.warn('⚠️ [Compatibilidad] Intento de eliminar asociación con ID undefined');
    return false;
  }
  return await originalEliminarAsociacion(id);
};
