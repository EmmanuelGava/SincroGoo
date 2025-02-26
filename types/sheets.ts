export type CellValue = string | number | boolean | Date | null

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
  key: string
  name: string
  column?: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'price' | 'formula'
  required?: boolean
  format?: {
    type: 'currency' | 'percentage' | 'date' | 'number' | 'text'
    pattern?: string
    decimals?: number
    prefix?: string
    suffix?: string
  }
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
          key: 'company_name',
          name: 'Nombre de la Empresa',
          column: 'B3',
          type: 'text',
          required: true
        },
        {
          id: 'company_address',
          key: 'company_address',
          name: 'Dirección',
          column: 'B4',
          type: 'text'
        },
        {
          id: 'company_phone',
          key: 'company_phone',
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
          key: 'invoice_number',
          name: 'N.º de factura',
          column: 'G12',
          type: 'text',
          required: true
        },
        {
          id: 'invoice_date',
          key: 'invoice_date',
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
          key: 'due_date',
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
          key: 'description',
          name: 'Descripción',
          column: 'A',
          type: 'text',
          required: true
        },
        {
          id: 'quantity',
          key: 'quantity',
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
          key: 'unit_price',
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
          key: 'total_price',
          name: 'Precio total',
          column: 'H',
          type: 'formula',
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
          key: 'subtotal',
          name: 'Subtotal',
          column: 'H26',
          type: 'formula',
          format: {
            type: 'currency',
            prefix: '€',
            decimals: 2
          }
        },
        {
          id: 'adjustments',
          key: 'adjustments',
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
          key: 'total',
          name: 'Total',
          column: 'H28',
          type: 'formula',
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