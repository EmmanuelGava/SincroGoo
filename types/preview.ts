export interface Procedure {
  id: string
  name: string
  color?: string
  description?: string
  category?: string
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'cash' | 'installments' | 'mixed' | 'digital'
  installments?: number
  hasCashComponent?: boolean
  provider?: string
}

export interface Country {
  id: string
  name: string
  currency: string
  currencySymbol: string
  defaultPaymentMethods: string[]
}

export interface PriceConfiguration {
  procedureId: string
  countryId: string
  paymentMethodId: string
  basePrice: number
  adjustments?: {
    type: 'discount' | 'surcharge'
    value: number
    isPercentage: boolean
  }[]
}

export interface PreviewChange {
  slideIndex: number
  oldPrice: string
  newPrice: string
  elementId: string
  position?: {
    x: number
    y: number
  }
  elementData: {
    width: number
    height: number
    rotation: number
    text: string
    type: string
    style: {
      fontSize?: {
        magnitude?: number
        unit?: string
      }
      foregroundColor?: {
        opaqueColor?: {
          rgbColor?: {
            red?: number
            green?: number
            blue?: number
          }
        }
      }
      bold?: boolean
      italic?: boolean
      fontFamily?: string
    }
  }
}

export interface SheetColumn {
  id: string
  header: string
  type: 'text' | 'number' | 'price' | 'select' | 'date'
  width?: number
  editable?: boolean
  options?: string[]  // Para tipo 'select'
  format?: {
    prefix?: string   // Ej: '$'
    suffix?: string   // Ej: 'USD'
    decimals?: number
    thousandsSeparator?: string
    decimalSeparator?: string
  }
}

export interface SheetConfiguration {
  id: string
  name: string
  range: string        // Ej: "A1:Z100"
  columns: SheetColumn[]
  slidesMapping?: {
    sourceColumn: string    // Columna que contiene el valor a buscar
    targetColumn: string    // Columna que contiene el ID del elemento en slides
    matchType: 'exact' | 'contains' | 'regex'
  }[]
}

export interface ModifiableField {
  id: string
  name: string
  type: 'price' | 'text' | 'number' | 'date'
  sourceColumn: string
  targetColumn: string
  format?: {
    prefix?: string
    suffix?: string
    decimals?: number
    thousandsSeparator?: string
    decimalSeparator?: string
  }
  validation?: {
    min?: number
    max?: number
    pattern?: string
    required?: boolean
    customValidation?: string // Función personalizada de validación
  }
  transform?: {
    beforeUpdate?: string  // Función de transformación antes de actualizar
    afterUpdate?: string   // Función de transformación después de actualizar
  }
}

export interface UserConfiguration {
  defaultSheet?: string
  defaultSlides?: string
  activeFields: ModifiableField[]
  sheetConfigs: SheetConfiguration[]
  procedures: Procedure[]
  paymentMethods: PaymentMethod[]
  countries: Country[]
  priceConfigurations: PriceConfiguration[]
} 