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
  /** Color de texto en hex (#RRGGBB). Si no se define, se usa el color de la plantilla. */
  color?: string;
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

/** Estilos de layout dinámico */
export type EstiloLayoutDinamico = 'vertical' | 'horizontal' | 'compacto'

/** Genera layout dinámico a partir de las columnas del usuario. Slide ~= 720x405 pt */
export function generarLayoutDinamico(
  placeholders: string[],
  basePlantillaId: string = 'ficha_local',
  estilo: EstiloLayoutDinamico = 'vertical'
): LayoutElement[] {
  if (placeholders.length === 0) return []
  const result: LayoutElement[] = []
  const slideW = 720
  const margin = 40
  const imageCols = placeholders.filter((p) => esColumnaImagen(p))
  const textCols = placeholders.filter((p) => !esColumnaImagen(p))
  const fontFamily = 'Roboto'

  if (estilo === 'horizontal') {
    // Imagen a la izquierda, texto a la derecha
    const imgW = 280
    const textX = margin + imgW + 24
    const textW = slideW - textX - margin
    let y = 40

    if (imageCols.length > 0) {
      result.push({
        placeholder: imageCols[0],
        tipo: 'imagen',
        x: margin,
        y: 40,
        w: imgW,
        h: 320
      })
    }

    textCols.forEach((ph, i) => {
      const isFirst = i === 0
      result.push({
        placeholder: ph,
        x: textX,
        y,
        w: textW,
        h: isFirst ? 48 : 32,
        fontSize: isFirst ? 24 : 14,
        bold: isFirst,
        fontFamily
      })
      y += isFirst ? 56 : 38
    })

    imageCols.slice(1).forEach((ph) => {
      result.push({ placeholder: ph, tipo: 'imagen', x: textX, y, w: 180, h: 100 })
      y += 110
    })
    return result
  }

  if (estilo === 'compacto') {
    // Menos espaciado, filas más densas
    const rowHeight = 28
    let y = 30

    if (imageCols.length > 0) {
      result.push({
        placeholder: imageCols[0],
        tipo: 'imagen',
        x: margin,
        y: 30,
        w: 180,
        h: 110
      })
      y = 150
    }

    textCols.forEach((ph, i) => {
      const isFirst = i === 0 && imageCols.length === 0
      result.push({
        placeholder: ph,
        x: margin,
        y,
        w: slideW - margin * 2,
        h: rowHeight,
        fontSize: isFirst ? 18 : 12,
        bold: isFirst,
        fontFamily
      })
      y += rowHeight + 4
    })

    imageCols.slice(1).forEach((ph) => {
      result.push({ placeholder: ph, tipo: 'imagen', x: margin, y, w: 160, h: 90 })
      y += 100
    })
    return result
  }

  // vertical (por defecto): imagen arriba, texto abajo
  const rowHeight = 36
  let y = 30

  if (imageCols.length > 0) {
    result.push({
      placeholder: imageCols[0],
      tipo: 'imagen',
      x: margin,
      y: 30,
      w: 240,
      h: 150
    })
    y = 195
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
      bold: isFirst,
      fontFamily
    })
    y += rowHeight
  })

  imageCols.slice(1).forEach((ph) => {
    result.push({ placeholder: ph, tipo: 'imagen', x: margin, y, w: 200, h: 120 })
    y += 130
  })

  return result
}

/** Posiciones (pt) por plantilla. Slide ~= 720x405 pt */
export const LAYOUTS: Record<string, LayoutElement[]> = {
  catalogo_productos: [
    { placeholder: 'Imagen', tipo: 'imagen', x: 40, y: 30, w: 400, h: 200 },
    { placeholder: 'Nombre', x: 40, y: 245, w: 620, h: 48, fontSize: 26, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Precio', x: 40, y: 300, w: 200, h: 38, fontSize: 22, fontFamily: 'Roboto' },
    { placeholder: 'Descripción', x: 40, y: 348, w: 620, h: 45, fontSize: 14, fontFamily: 'Roboto' }
  ],
  ficha_cliente: [
    { placeholder: 'Nombre', x: 40, y: 30, w: 620, h: 48, fontSize: 26, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Teléfono', x: 40, y: 95, w: 300, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Email', x: 40, y: 130, w: 300, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Dirección', x: 40, y: 165, w: 300, h: 48, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Notas', x: 380, y: 95, w: 300, h: 200, fontSize: 14, fontFamily: 'Roboto' }
  ],
  ficha_local: [
    { placeholder: 'imagen', tipo: 'imagen', x: 40, y: 30, w: 220, h: 155 },
    { placeholder: 'Nombre', x: 280, y: 30, w: 380, h: 45, fontSize: 24, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Calificación', x: 280, y: 85, w: 100, h: 28, fontSize: 16, fontFamily: 'Roboto' },
    { placeholder: 'Total Reseñas', x: 390, y: 85, w: 160, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Dirección', x: 40, y: 200, w: 620, h: 30, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Teléfono', x: 40, y: 238, w: 300, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Sitio Web', x: 40, y: 274, w: 300, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Horarios', x: 360, y: 238, w: 300, h: 66, fontSize: 14, fontFamily: 'Roboto' }
  ],
  propuesta_comercial: [
    { placeholder: 'Empresa', x: 40, y: 30, w: 620, h: 48, fontSize: 26, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Servicio', x: 40, y: 95, w: 620, h: 120, fontSize: 16, fontFamily: 'Roboto' },
    { placeholder: 'Precio', x: 40, y: 230, w: 300, h: 42, fontSize: 22, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Condiciones', x: 40, y: 285, w: 620, h: 95, fontSize: 14, fontFamily: 'Roboto' }
  ],
  reporte_simple: [
    { placeholder: 'Título', x: 40, y: 30, w: 620, h: 45, fontSize: 24, bold: true, alignment: 'CENTER', fontFamily: 'Roboto' },
    { placeholder: 'Dato1', x: 40, y: 95, w: 300, h: 80, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Dato2', x: 380, y: 95, w: 300, h: 80, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Observaciones', x: 40, y: 195, w: 620, h: 160, fontSize: 14, fontFamily: 'Roboto' }
  ],
  tarjeta_minimalista: [
    { placeholder: 'Imagen', tipo: 'imagen', x: 40, y: 40, w: 300, h: 180 },
    { placeholder: 'Título', x: 360, y: 50, w: 300, h: 44, fontSize: 22, bold: true, fontFamily: 'Roboto' },
    { placeholder: 'Subtítulo', x: 360, y: 100, w: 300, h: 28, fontSize: 14, fontFamily: 'Roboto' },
    { placeholder: 'Descripción', x: 360, y: 140, w: 300, h: 200, fontSize: 13, fontFamily: 'Roboto' }
  ],
  portada: [
    { placeholder: 'Título', x: 80, y: 140, w: 560, h: 70, fontSize: 44, bold: true, alignment: 'CENTER', fontFamily: 'Roboto' },
    { placeholder: 'Subtítulo', x: 80, y: 220, w: 560, h: 40, fontSize: 18, alignment: 'CENTER', fontFamily: 'Roboto' }
  ],
  blanco: []
};
