import { SheetTemplate, SheetField, CellValue } from '@/types/sheets'

export interface SheetUpdate {
  range: string
  values: CellValue[][]
}

export class SheetEditor {
  private template: SheetTemplate
  private data: any[][]
  private updates: SheetUpdate[] = []

  constructor(template: SheetTemplate) {
    this.template = template
  }

  setData(data: any[][]) {
    this.data = data
  }

  getValue(field: SheetField, rowIndex: number): CellValue {
    const colIndex = this.getColumnIndex(field.column)
    return this.data[rowIndex][colIndex]
  }

  setValue(field: SheetField, rowIndex: number, value: CellValue) {
    if (!field.editable) {
      throw new Error(`Field ${field.id} is not editable`)
    }

    // Validar el valor según el tipo y las reglas de validación
    this.validateValue(field, value)

    const colIndex = this.getColumnIndex(field.column)
    
    // Formatear el valor según el tipo y formato del campo
    const formattedValue = this.formatValue(field, value)
    
    // Registrar la actualización
    this.updates.push({
      range: `${field.column}${rowIndex + 1}`,
      values: [[formattedValue]]
    })

    // Actualizar el valor en los datos locales
    this.data[rowIndex][colIndex] = formattedValue

    // Si el campo tiene dependencias, recalcular los campos dependientes
    if (field.dependsOn) {
      this.recalculateDependencies(field, rowIndex)
    }
  }

  private validateValue(field: SheetField, value: CellValue) {
    if (field.required && (value === null || value === '')) {
      throw new Error(`Field ${field.id} is required`)
    }

    if (field.validation) {
      const { type, options, min, max, formula } = field.validation

      switch (type) {
        case 'range':
          if (typeof value === 'number') {
            if (min !== undefined && value < min) {
              throw new Error(`Value must be greater than or equal to ${min}`)
            }
            if (max !== undefined && value > max) {
              throw new Error(`Value must be less than or equal to ${max}`)
            }
          }
          break

        case 'list':
          if (options && !options.includes(String(value))) {
            throw new Error(`Value must be one of: ${options.join(', ')}`)
          }
          break

        case 'custom':
          if (formula) {
            // Aquí iría la lógica para evaluar la fórmula personalizada
            // Por ahora solo validamos que exista un valor
            if (value === null || value === undefined) {
              throw new Error('Invalid value')
            }
          }
          break
      }
    }
  }

  private formatValue(field: SheetField, value: CellValue): CellValue {
    if (!field.format || value === null || value === undefined) {
      return value
    }

    const { type, prefix, suffix, decimals, pattern } = field.format

    switch (type) {
      case 'currency':
        if (typeof value === 'number') {
          let formatted = value.toFixed(decimals || 2)
          if (prefix) formatted = prefix + formatted
          if (suffix) formatted = formatted + suffix
          return formatted
        }
        break

      case 'percentage':
        if (typeof value === 'number') {
          return `${(value * 100).toFixed(decimals || 0)}%`
        }
        break

      case 'date':
        if (value instanceof Date) {
          // Usar el patrón especificado o un formato por defecto
          return value.toLocaleDateString()
        }
        break

      case 'text':
        if (pattern) {
          const regex = new RegExp(pattern)
          if (!regex.test(String(value))) {
            throw new Error(`Value does not match pattern: ${pattern}`)
          }
        }
        return String(value)
    }

    return value
  }

  private getColumnIndex(column: string): number {
    // Convertir letra de columna a índice (A=0, B=1, etc.)
    return column.split('').reduce((acc, char) => {
      return acc * 26 + char.toUpperCase().charCodeAt(0) - 65
    }, 0)
  }

  private recalculateDependencies(field: SheetField, rowIndex: number) {
    const section = this.template.sections.find(s => 
      s.fields.some(f => f.id === field.id)
    )

    if (!section) return

    section.fields
      .filter(f => f.dependsOn?.includes(field.id))
      .forEach(dependentField => {
        if (dependentField.formula) {
          const result = this.evaluateFormula(dependentField.formula, rowIndex)
          this.setValue(dependentField, rowIndex, result)
        }
      })
  }

  private evaluateFormula(formula: string, rowIndex: number): CellValue {
    // Reemplazar referencias a la fila actual
    const resolvedFormula = formula.replace(/{row}/g, (rowIndex + 1).toString())
    
    // Por ahora solo manejamos fórmulas simples
    // En una implementación real, necesitarías un parser de fórmulas más robusto
    try {
      return eval(resolvedFormula.substring(1)) // Remover el '=' inicial
    } catch (error) {
      console.error('Error evaluating formula:', error)
      return null
    }
  }

  getUpdates(): SheetUpdate[] {
    return this.updates
  }

  clearUpdates() {
    this.updates = []
  }
} 