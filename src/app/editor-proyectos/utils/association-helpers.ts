import { ElementoDiapositiva, FilaSeleccionada, ColumnaHoja } from '../types';

/**
 * Interface para una recomendación de asociación
 */
export interface AsociacionRecomendada {
  elementoId: string;
  columnaId: string;
  puntuacion: number;  // 0-100
  razon: string;
}

/**
 * Calcula la similitud entre dos strings (0-1)
 */
function similitudTexto(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  
  // Caso exacto
  if (aLower === bLower) return 1;
  
  // Caso de inclusión
  if (aLower.includes(bLower)) return 0.9;
  if (bLower.includes(aLower)) return 0.9;
  
  // Similitud basada en caracteres comunes
  const aSet = new Set(aLower);
  const bSet = new Set(bLower);
  
  const intersection = new Set(Array.from(aSet).filter(char => bSet.has(char)));
  const union = new Set([...Array.from(aSet), ...Array.from(bSet)]);
  
  return intersection.size / union.size;
}

/**
 * Determina si un texto parece contener un valor numérico
 */
function esNumerico(texto: string): boolean {
  return !isNaN(parseFloat(texto)) && isFinite(Number(texto));
}

/**
 * Determina si un texto parece ser una fecha
 */
function esFecha(texto: string): boolean {
  // Patrones comunes de fecha
  const patronesFecha = [
    /^\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}$/,   // 01/01/2022, 1-1-2022
    /^\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}$/,     // 2022/01/01, 2022-1-1
    /^\d{1,2}\s+de\s+\w+\s+de\s+\d{2,4}$/i   // 1 de enero de 2022
  ];
  
  return patronesFecha.some(patron => patron.test(texto));
}

/**
 * Determina si un texto parece ser un precio o valor monetario
 */
function esPrecio(texto: string): boolean {
  return /^[$€£¥]?\s*\d+([.,]\d+)?\s*[$€£¥]?$/.test(texto);
}

/**
 * Obtiene el contenido mostrable de un elemento
 */
function obtenerContenidoElemento(elemento: ElementoDiapositiva): string {
  if (typeof elemento.contenido === 'string') return elemento.contenido;
  if (typeof elemento.contenido === 'object' && elemento.contenido !== null) {
    if ('texto' in elemento.contenido) return elemento.contenido.texto;
    return JSON.stringify(elemento.contenido);
  }
  return String(elemento.contenido || '');
}

/**
 * Obtiene el valor de una celda para una columna y fila específicas
 */
function obtenerValorCelda(columnaId: string, fila: FilaSeleccionada): string | null {
  const valorCelda = fila.valores.find(v => v.columnaId === columnaId);
  return valorCelda ? String(valorCelda.valor) : null;
}

/**
 * Determina la compatibilidad entre el tipo de elemento y el valor de una celda
 */
function compatibilidadTipoValor(elemento: ElementoDiapositiva, valorCelda: string): number {
  const contenidoElemento = obtenerContenidoElemento(elemento);
  
  // Para elementos de tipo imagen
  if (elemento.tipo === 'imagen') {
    try {
      new URL(valorCelda); // Intenta parsear como URL
      return 1; // Es una URL válida
    } catch (e) {
      return 0; // No es una URL
    }
  }
  
  // Para elementos de texto que parecen numéricos
  const elementoEsNumerico = esNumerico(contenidoElemento);
  const valorEsNumerico = esNumerico(valorCelda);
  
  if (elementoEsNumerico && valorEsNumerico) return 1;
  
  // Para elementos que parecen fechas
  const elementoEsFecha = esFecha(contenidoElemento);
  const valorEsFecha = esFecha(valorCelda);
  
  if (elementoEsFecha && valorEsFecha) return 1;
  
  // Para elementos que parecen precios
  const elementoEsPrecio = esPrecio(contenidoElemento);
  const valorEsPrecio = esPrecio(valorCelda);
  
  if (elementoEsPrecio && valorEsPrecio) return 1;
  
  // Para texto general, usar similitud de texto
  return similitudTexto(contenidoElemento, valorCelda);
}

/**
 * Genera recomendaciones de asociaciones entre elementos y columnas
 */
export function recomendarAsociaciones(
  elementos: ElementoDiapositiva[],
  columnas: ColumnaHoja[],
  fila: FilaSeleccionada
): AsociacionRecomendada[] {
  const recomendaciones: AsociacionRecomendada[] = [];
  
  // Filtrar elementos sin asociación
  const elementosSinAsociacion = elementos.filter(e => !e.columnaAsociada);
  
  for (const elemento of elementosSinAsociacion) {
    const contenidoElemento = obtenerContenidoElemento(elemento);
    
    // Saltear elementos vacíos o muy cortos
    if (!contenidoElemento || contenidoElemento.length < 2) continue;
    
    const resultadosPorColumna: Array<{columna: ColumnaHoja, puntuacion: number, razon: string}> = [];
    
    for (const columna of columnas) {
      const valorCelda = obtenerValorCelda(columna.id, fila);
      
      if (valorCelda) {
        // Calcular similitud básica
        let puntuacion = similitudTexto(contenidoElemento, valorCelda) * 100;
        let razon = "Similitud de texto";
        
        // Bonificación para coincidencias exactas o casi exactas
        if (puntuacion > 80) {
          puntuacion += 10;
          razon = "Coincidencia casi exacta";
        }
        
        // Bonificación para compatibilidad de tipo
        const compatibilidad = compatibilidadTipoValor(elemento, valorCelda);
        if (compatibilidad > 0.7) {
          puntuacion += 5;
          razon = "Tipo de datos compatible";
        }
        
        // Bonificación para coincidencia de título de columna con contenido
        const similitudConTitulo = similitudTexto(contenidoElemento, columna.titulo);
        if (similitudConTitulo > 0.7) {
          puntuacion += 8;
          razon = "Coincide con título de columna";
        }
        
        // Limite máximo
        puntuacion = Math.min(puntuacion, 100);
        
        resultadosPorColumna.push({
          columna,
          puntuacion,
          razon
        });
      }
    }
    
    // Ordenar resultados por puntuación
    resultadosPorColumna.sort((a, b) => b.puntuacion - a.puntuacion);
    
    // Añadir la mejor recomendación si supera un umbral mínimo
    if (resultadosPorColumna.length > 0 && resultadosPorColumna[0].puntuacion > 30) {
      const mejor = resultadosPorColumna[0];
      recomendaciones.push({
        elementoId: elemento.id,
        columnaId: mejor.columna.id,
        puntuacion: mejor.puntuacion,
        razon: mejor.razon
      });
    }
  }
  
  // Ordenar recomendaciones finales por puntuación
  return recomendaciones.sort((a, b) => b.puntuacion - a.puntuacion);
}

/**
 * Aplica automáticamente las mejores recomendaciones a los elementos
 */
export function aplicarRecomendacionesAutomaticas(
  elementos: ElementoDiapositiva[],
  columnas: ColumnaHoja[],
  fila: FilaSeleccionada,
  umbralConfianza: number = 70 // Por defecto, aplicar solo las de alta confianza
): ElementoDiapositiva[] {
  const recomendaciones = recomendarAsociaciones(elementos, columnas, fila);
  
  // Filtrar recomendaciones que superen el umbral
  const recomendacionesAplicables = recomendaciones.filter(rec => rec.puntuacion >= umbralConfianza);
  
  if (recomendacionesAplicables.length === 0) {
    return elementos; // No hay cambios
  }
  
  // Aplicar las recomendaciones
  return elementos.map(elemento => {
    const recomendacion = recomendacionesAplicables.find(rec => rec.elementoId === elemento.id);
    
    if (recomendacion) {
      // Encontrar el valor de la celda recomendada
      const valorCelda = obtenerValorCelda(recomendacion.columnaId, fila);
      
      if (valorCelda) {
        // Actualizar el elemento con la asociación recomendada
        return {
          ...elemento,
          columnaAsociada: recomendacion.columnaId,
          tipoAsociacion: 'automatica',
          contenido: typeof elemento.contenido === 'object' && elemento.contenido !== null
            ? { ...elemento.contenido, texto: valorCelda }
            : valorCelda,
          modificado: true,
          _filaId: fila.id
        };
      }
    }
    
    return elemento;
  });
} 