// Declaraciones de tipos para módulos que no se encuentran

// Para @/types/preview
declare module '@/types/preview' {
  export interface PreviewChange {
    id: string;
    before: string;
    after: string;
    [key: string]: any;
  }
}

// Para @/types/sheets
declare module '@/types/sheets' {
  export interface SheetField {
    key: string;
    name: string;
    type: string;
    [key: string]: any;
  }

  export interface SheetSection {
    id: string;
    name: string;
    fields: SheetField[];
    [key: string]: any;
  }

  export interface SheetTemplate {
    id: string;
    name: string;
    sections: SheetSection[];
    [key: string]: any;
  }

  export interface CellValue {
    value: any;
    formatted?: string;
    [key: string]: any;
  }

  export const invoiceTemplate: SheetTemplate;
}

// Declaración para evitar errores con archivos CSS
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Declaración para evitar errores con archivos de imágenes
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
} 