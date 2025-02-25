export type CellValue = string | number | boolean | null

export interface SheetTemplate {
  id: string
  name: string
  type: 'invoice' | 'price_list' | 'custom'
  headerRows: number
  dataStartRow: number
  sections: SheetSection[]
}

export interface SheetSection {
  id: string
  name: string
  range: string
  type: 'header' | 'details' | 'summary' | 'custom'
  fields: SheetField[]
}

export interface SheetField {
  id: string
  name: string
  column: string
  type: 'text' | 'number' | 'price' | 'date' | 'formula' | 'select'
  editable?: boolean
  required?: boolean
  format?: {
    type: 'currency' | 'percentage' | 'number' | 'date' | 'text'
    prefix?: string
    suffix?: string
    decimals?: number
    locale?: string
    pattern?: string
  }
  validation?: {
    type: 'range' | 'list' | 'custom'
    options?: string[]
    min?: number
    max?: number
    formula?: string
  }
  defaultValue?: CellValue
  formula?: string
  dependsOn?: string[]  // IDs de otros campos
}

// Ejemplo de factura
export const invoiceTemplate: SheetTemplate = {
  id: 'invoice',
  name: 'Factura',
  type: 'invoice',
  headerRows: 3,
  dataStartRow: 4,
  sections: [
    {
      id: 'company',
      name: 'Información de la Empresa',
      range: 'A1:F3',
      type: 'header',
      fields: [
        {
          id: 'company_name',
          name: 'Nombre de la Empresa',
          column: 'B3',
          type: 'text',
          required: true
        },
        {
          id: 'company_address',
          name: 'Dirección',
          column: 'B4',
          type: 'text'
        },
        {
          id: 'company_phone',
          name: 'Teléfono',
          column: 'B6',
          type: 'text',
          format: {
            type: 'text',
            pattern: '(\\d{2,4}) \\d{3}-?\\d{4}'
          }
        }
      ]
    },
    {
      id: 'invoice_details',
      name: 'Detalles de Factura',
      range: 'A11:H16',
      type: 'details',
      fields: [
        {
          id: 'invoice_number',
          name: 'N.º de factura',
          column: 'G12',
          type: 'text',
          required: true
        },
        {
          id: 'invoice_date',
          name: 'Fecha',
          column: 'B9',
          type: 'date',
          format: {
            type: 'date',
            pattern: 'dd/MM/yyyy'
          }
        },
        {
          id: 'due_date',
          name: 'Fecha de vencimiento',
          column: 'G15',
          type: 'date',
          format: {
            type: 'date',
            pattern: 'dd/MM/yyyy'
          }
        }
      ]
    },
    {
      id: 'items',
      name: 'Artículos',
      range: 'A18:H25',
      type: 'details',
      fields: [
        {
          id: 'description',
          name: 'Descripción',
          column: 'A',
          type: 'text',
          required: true
        },
        {
          id: 'quantity',
          name: 'Cantidad',
          column: 'D',
          type: 'number',
          format: {
            type: 'number',
            decimals: 0
          }
        },
        {
          id: 'unit_price',
          name: 'Precio unitario',
          column: 'F',
          type: 'price',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        },
        {
          id: 'total_price',
          name: 'Precio total',
          column: 'H',
          type: 'formula',
          formula: '=D{row}*F{row}',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        }
      ]
    },
    {
      id: 'summary',
      name: 'Resumen',
      range: 'F26:H29',
      type: 'summary',
      fields: [
        {
          id: 'subtotal',
          name: 'Subtotal',
          column: 'H26',
          type: 'formula',
          formula: '=SUM(H19:H25)',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        },
        {
          id: 'adjustments',
          name: 'Ajustes',
          column: 'H27',
          type: 'price',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        },
        {
          id: 'total',
          name: 'Total',
          column: 'H28',
          type: 'formula',
          formula: '=H26+H27',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        }
      ]
    }
  ]
} 