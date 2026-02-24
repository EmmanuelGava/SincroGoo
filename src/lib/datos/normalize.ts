/**
 * Normaliza un array de objetos (filas con keys = columnas) al formato DatosHoja
 * usado por el flujo de plantillas (Sheets, Excel, CSV).
 *
 * Ejemplo entrada:
 * [
 *   { Nombre: 'Bar Alem', Dirección: 'Ayacucho 3494', Teléfono: '011 4849-2301' },
 *   { Nombre: 'Pinocha', Dirección: 'Av. San Martín 2795', Teléfono: '011 4759-1409' }
 * ]
 *
 * Ejemplo salida (formato DatosHoja):
 * { encabezados: ['Nombre', 'Dirección', 'Teléfono'], filas: [{ indice, valores: [{ valor }...] }] }
 */

export interface ValorCeldaNormalizado {
  valor: string | number | null;
}

export interface FilaNormalizada {
  indice: number;
  valores: ValorCeldaNormalizado[];
}

export interface DatosHojaNormalizados {
  encabezados: string[];
  filas: FilaNormalizada[];
}

/**
 * Convierte array de objetos a formato DatosHoja.
 * Usa las keys del primer objeto como encabezados.
 */
export function normalizeRowObjectsToDatosHoja(
  rows: Record<string, unknown>[]
): DatosHojaNormalizados {
  if (!rows || rows.length === 0) {
    return { encabezados: [], filas: [] };
  }

  const encabezados = Object.keys(rows[0]);
  const filas = rows.map((row, i) => ({
    indice: i + 1,
    valores: encabezados.map((col) => {
      const v = row[col];
      return {
        valor:
          v === null || v === undefined
            ? ''
            : typeof v === 'object'
              ? String(v)
              : v
      };
    })
  }));

  return { encabezados, filas };
}
