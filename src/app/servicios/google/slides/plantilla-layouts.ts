/** Convierte hex (#RRGGBB) a rgb normalizado 0-1 para Slides API */
export function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return { red: r, green: g, blue: b };
}

/** Alineación horizontal del texto (mapea a START/CENTER/END de la API) */
export type AlignmentType = 'LEFT' | 'CENTER' | 'RIGHT';

export interface LayoutElement {
  placeholder: string;
  /** Tipo de elemento: texto (cuadro de texto) o imagen (createImage). Por defecto texto. */
  tipo?: 'texto' | 'imagen';
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  bold?: boolean;
  /** Alineación del párrafo. Solo aplica a elementos de tipo texto. */
  alignment?: AlignmentType;
  /** Familia de fuente (ej: "Arial", "Roboto"). Solo aplica a elementos de tipo texto. */
  fontFamily?: string;
}

/** Indica si una columna debe tratarse como imagen (URL) */
export function esColumnaImagen(nombre: string): boolean {
  const n = String(nombre || '').toLowerCase()
  return (
    n === 'imagen' ||
    n === 'image' ||
    n === 'foto' ||
    n === 'photo' ||
    n === 'url_imagen' ||
    n === 'url' ||
    n.includes('imagen') ||
    n.includes('foto')
  )
}

/** Genera layout dinámico a partir de las columnas del usuario. Slide ~= 720x405 pt */
export function generarLayoutDinamico(
  placeholders: string[],
  basePlantillaId: string = 'ficha_local'
): LayoutElement[] {
  if (placeholders.length === 0) return []
  const result: LayoutElement[] = []
  const slideW = 720
  const slideH = 405
  const margin = 40
  const rowHeight = 36
  const imageCols = placeholders.filter((p) => esColumnaImagen(p))
  const textCols = placeholders.filter((p) => !esColumnaImagen(p))
  let y = 30

  if (imageCols.length > 0) {
    const imgCol = imageCols[0]
    result.push({
      placeholder: imgCol,
      tipo: 'imagen',
      x: margin,
      y: 30,
      w: 220,
      h: 140
    })
    y = 180
  }

  textCols.forEach((ph, i) => {
    const isFirst = i === 0 && imageCols.length === 0
    result.push({
      placeholder: ph,
      x: margin,
      y,
      w: slideW - margin * 2,
      h: rowHeight,
      fontSize: isFirst ? 22 : 14,
      bold: isFirst
    })
    y += rowHeight
  })

  imageCols.slice(1).forEach((ph) => {
    result.push({
      placeholder: ph,
      tipo: 'imagen',
      x: margin,
      y,
      w: 200,
      h: 120
    })
    y += 130
  })

  return result
}

/** Posiciones (pt) por plantilla. Slide ~= 720x405 pt */
export const LAYOUTS: Record<string, LayoutElement[]> = {
  catalogo_productos: [
    { placeholder: 'Imagen', tipo: 'imagen', x: 40, y: 30, w: 400, h: 200 },
    { placeholder: 'Nombre', x: 40, y: 240, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Precio', x: 40, y: 300, w: 200, h: 40, fontSize: 24 },
    { placeholder: 'Descripción', x: 40, y: 350, w: 620, h: 50, fontSize: 14 }
  ],
  ficha_cliente: [
    { placeholder: 'Nombre', x: 40, y: 30, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Teléfono', x: 40, y: 100, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Email', x: 40, y: 140, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Dirección', x: 40, y: 180, w: 300, h: 50, fontSize: 14 },
    { placeholder: 'Notas', x: 380, y: 100, w: 300, h: 200, fontSize: 14 }
  ],
  ficha_local: [
    { placeholder: 'imagen', tipo: 'imagen', x: 40, y: 30, w: 200, h: 150 },
    { placeholder: 'Nombre', x: 260, y: 30, w: 400, h: 45, fontSize: 24, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Calificación', x: 260, y: 85, w: 120, h: 28, fontSize: 16 },
    { placeholder: 'Total Reseñas', x: 390, y: 85, w: 180, h: 28, fontSize: 14 },
    { placeholder: 'Dirección', x: 40, y: 195, w: 620, h: 30, fontSize: 14 },
    { placeholder: 'Teléfono', x: 40, y: 235, w: 300, h: 28, fontSize: 14 },
    { placeholder: 'Sitio Web', x: 40, y: 273, w: 300, h: 28, fontSize: 14 },
    { placeholder: 'Horarios', x: 360, y: 235, w: 300, h: 66, fontSize: 14 }
  ],
  propuesta_comercial: [
    { placeholder: 'Empresa', x: 40, y: 30, w: 620, h: 50, fontSize: 26, bold: true },
    { placeholder: 'Servicio', x: 40, y: 100, w: 620, h: 120, fontSize: 16 },
    { placeholder: 'Precio', x: 40, y: 240, w: 300, h: 45, fontSize: 22 },
    { placeholder: 'Condiciones', x: 40, y: 300, w: 620, h: 80, fontSize: 14 }
  ],
  reporte_simple: [
    { placeholder: 'Título', x: 40, y: 30, w: 620, h: 45, fontSize: 24, bold: true, alignment: 'CENTER' },
    { placeholder: 'Dato1', x: 40, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Dato2', x: 380, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Observaciones', x: 40, y: 195, w: 620, h: 160, fontSize: 14 }
  ],
  blanco: []
};
