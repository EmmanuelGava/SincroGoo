import { useState, useEffect } from 'react'
import { SheetEditor, SheetUpdate } from '@/lib/sheet-editor'
import { SheetTemplate, SheetField, CellValue, SheetSection } from '@/types/sheets'

interface UseSheetEditorProps {
  template: SheetTemplate
  initialData?: { [sectionId: string]: any[][] }
  onUpdate?: (updates: SheetUpdate[]) => void
}

interface UseSheetEditorReturn {
  data: { [sectionId: string]: any[][] }
  error: string | null
  updateField: (section: SheetSection, field: SheetField, rowIndex: number, value: CellValue) => Promise<void>
  getFieldValue: (section: SheetSection, field: SheetField, rowIndex: number) => CellValue
  getSection: (sectionId: string) => SheetSection | undefined
  getSectionData: (sectionId: string) => any[][] | undefined
}

export function useSheetEditor({ template, initialData, onUpdate }: UseSheetEditorProps): UseSheetEditorReturn {
  const [editor] = useState(() => new SheetEditor(template))
  const [data, setData] = useState<{ [sectionId: string]: any[][] }>(initialData || {})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([sectionId, sectionData]) => {
        editor.setData(sectionId, sectionData)
      })
      setData(initialData)
    }
  }, [initialData, editor])

  const updateField = async (section: SheetSection, field: SheetField, rowIndex: number, value: CellValue) => {
    try {
      setError(null)
      editor.setValue(section, field, rowIndex, value)
      
      // Obtener los datos actualizados
      const updates = editor.getUpdates()
      
      // Notificar las actualizaciones
      if (onUpdate) {
        await onUpdate(updates)
      }
      
      // Limpiar las actualizaciones después de aplicarlas
      editor.clearUpdates()

      // Actualizar el estado local
      setData(prevData => ({
        ...prevData,
        [section.id]: editor.getSectionData(section.id) || []
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el campo')
    }
  }

  const getFieldValue = (section: SheetSection, field: SheetField, rowIndex: number): CellValue => {
    return editor.getValue(section, field, rowIndex)
  }

  const getSection = (sectionId: string): SheetSection | undefined => {
    return editor.getSection(sectionId)
  }

  const getSectionData = (sectionId: string): any[][] | undefined => {
    return editor.getSectionData(sectionId)
  }

  return {
    data,
    error,
    updateField,
    getFieldValue,
    getSection,
    getSectionData
  }
} 