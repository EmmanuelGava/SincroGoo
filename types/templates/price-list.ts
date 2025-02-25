import { SheetTemplate } from '../sheets'

export const priceListTemplate: SheetTemplate = {
  id: 'price_list',
  name: 'Lista de Precios',
  type: 'price_list',
  headerRows: 1,
  dataStartRow: 2,
  sections: [
    {
      id: 'filters',
      name: 'Filtros',
      range: 'A1:Q1',
      type: 'header',
      fields: [
        {
          id: 'no_modify',
          name: 'No modificar números',
          column: 'A1',
          type: 'text',
          editable: false
        }
      ]
    },
    {
      id: 'price_matrix',
      name: 'Matriz de Precios',
      range: 'A2:Q100',
      type: 'details',
      fields: [
        {
          id: 'procedure_type',
          name: 'Tipo de cirugía',
          column: 'A',
          type: 'select',
          validation: {
            type: 'list',
            options: [
              'Bariátrica',
              'Aumento Mamario',
              'Levantamiento Mamario',
              'Reducción Mamaria'
            ]
          }
        },
        {
          id: 'country',
          name: 'País del cliente',
          column: 'B',
          type: 'select',
          validation: {
            type: 'list',
            options: ['Uruguay', 'Bolivia']
          }
        },
        {
          id: 'payment_method',
          name: 'Método de pago',
          column: 'C',
          type: 'select',
          validation: {
            type: 'list',
            options: [
              'Efectivo',
              'Efectivo Paquete',
              '12 Cuotas',
              '12 Cuotas + Cash',
              '24 Cuotas',
              '24 Cuotas + Cash',
              'dLocal'
            ]
          }
        },
        {
          id: 'cash_price',
          name: 'Precio Efectivo',
          column: 'D',
          type: 'price',
          format: {
            type: 'currency',
            prefix: '$',
            decimals: 2
          }
        },
        {
          id: '12_installments',
          name: '12 Cuotas',
          column: 'E',
          type: 'price',
          format: {
            type: 'currency',
            prefix: '$',
            decimals: 2
          }
        },
        {
          id: '24_installments',
          name: '24 Cuotas',
          column: 'F',
          type: 'price',
          format: {
            type: 'currency',
            prefix: '$',
            decimals: 2
          }
        }
      ]
    }
  ]
}

// Configuración de mapeo con las diapositivas
export const priceListSlidesMapping = {
  sourceFields: ['cash_price', '12_installments', '24_installments'],
  targetElements: {
    pattern: /\$\s*\d+([.,]\d{1,2})?\s*(?:USD)?/,
    matchType: 'contains'
  },
  validation: {
    requireExactMatch: false,
    allowMultipleMatches: true
  }
} 