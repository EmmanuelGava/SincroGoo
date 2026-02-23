/** Convierte hex (#RRGGBB) a rgb normalizado 0-1 para Slides API */
export function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace(/^#/, '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return { red: r, green: g, blue: b };
}

export interface LayoutElement {
  placeholder: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  bold?: boolean;
}

/** Posiciones (pt) por plantilla. Slide ~= 720x405 pt */
export const LAYOUTS: Record<string, LayoutElement[]> = {
  catalogo_productos: [
    { placeholder: 'Imagen', x: 40, y: 30, w: 400, h: 200, fontSize: 12 },
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
    { placeholder: 'Nombre', x: 40, y: 30, w: 620, h: 50, fontSize: 28, bold: true },
    { placeholder: 'Dirección', x: 40, y: 100, w: 620, h: 35, fontSize: 16 },
    { placeholder: 'Teléfono', x: 40, y: 145, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Sitio Web', x: 40, y: 185, w: 300, h: 30, fontSize: 14 },
    { placeholder: 'Calificación', x: 40, y: 225, w: 200, h: 35, fontSize: 18 }
  ],
  propuesta_comercial: [
    { placeholder: 'Empresa', x: 40, y: 30, w: 620, h: 50, fontSize: 26, bold: true },
    { placeholder: 'Servicio', x: 40, y: 100, w: 620, h: 120, fontSize: 16 },
    { placeholder: 'Precio', x: 40, y: 240, w: 300, h: 45, fontSize: 22 },
    { placeholder: 'Condiciones', x: 40, y: 300, w: 620, h: 80, fontSize: 14 }
  ],
  reporte_simple: [
    { placeholder: 'Título', x: 40, y: 30, w: 620, h: 45, fontSize: 24, bold: true },
    { placeholder: 'Dato1', x: 40, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Dato2', x: 380, y: 95, w: 300, h: 80, fontSize: 14 },
    { placeholder: 'Observaciones', x: 40, y: 195, w: 620, h: 160, fontSize: 14 }
  ],
  blanco: []
};
