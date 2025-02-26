import { SheetTemplate, SheetField, CellValue, SheetSection } from '@/types/sheets'

export interface SheetUpdate {
  field: SheetField
  section: SheetSection
  rowIndex: number
  value: CellValue
  previousValue: CellValue
}

export class SheetEditor {
  private template: SheetTemplate
  private data: { [sectionId: string]: any[][] }
  private updates: SheetUpdate[]

  constructor(template: SheetTemplate) {
    this.template = template
    this.data = {}
    this.updates = []
  }

  setData(sectionId: string, data: any[][]) {
    this.data[sectionId] = data
    this.updates = this.updates.filter(update => update.section.id !== sectionId)
  }

  setValue(section: SheetSection, field: SheetField, rowIndex: number, value: CellValue) {
    if (!this.data[section.id]) {
      throw new Error('Sección no inicializada')
    }

    if (rowIndex < 0 || rowIndex >= this.data[section.id].length) {
      throw new Error('Índice de fila fuera de rango')
    }

    const columnIndex = section.fields.findIndex(f => f.key === field.key)
    if (columnIndex === -1) {
      throw new Error('Campo no encontrado en la sección')
    }

    const previousValue = this.data[section.id][rowIndex][columnIndex]
    this.data[section.id][rowIndex][columnIndex] = value

    this.updates.push({
      field,
      section,
      rowIndex,
      value,
      previousValue
    })
  }

  getValue(section: SheetSection, field: SheetField, rowIndex: number): CellValue {
    if (!this.data[section.id]) {
      throw new Error('Sección no inicializada')
    }

    if (rowIndex < 0 || rowIndex >= this.data[section.id].length) {
      throw new Error('Índice de fila fuera de rango')
    }

    const columnIndex = section.fields.findIndex(f => f.key === field.key)
    if (columnIndex === -1) {
      throw new Error('Campo no encontrado en la sección')
    }

    return this.data[section.id][rowIndex][columnIndex]
  }

  getUpdates(): SheetUpdate[] {
    return [...this.updates]
  }

  clearUpdates() {
    this.updates = []
  }

  getSection(sectionId: string): SheetSection | undefined {
    return this.template.sections.find(s => s.id === sectionId)
  }

  getSectionData(sectionId: string): any[][] | undefined {
    return this.data[sectionId]
  }
} 