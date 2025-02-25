import { useState, useEffect } from 'react'
import { SheetEditor, SheetUpdate } from '@/lib/sheet-editor'
import { SheetTemplate, SheetField, CellValue } from '@/types/sheets'

interface UseSheetEditorProps {
  template: SheetTemplate
  initialData?: any[][]
  onUpdate?: (updates: SheetUpdate[]) => void
}

export function useSheetEditor({ template, initialData, onUpdate }: UseSheetEditorProps) {
  const [editor] = useState(() => new SheetEditor(template))
  const [data, setData] = useState<any[][]>(initialData || [])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      editor.setData(initialData)
      setData(initialData)
    }
  }, [initialData, editor])

  const updateField = async (field: SheetField, rowIndex: number, value: CellValue) => {
    try {
      setError(null)
      editor.setValue(field, rowIndex, value)
      
      // Obtener los datos actualizados
      const updates = editor.getUpdates()
      
      // Notificar las actualizaciones
      if (onUpdate) {
        await onUpdate(updates)
      }
      
      // Limpiar las actualizaciones después de aplicarlas
      editor.clearUpdates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el campo')
    }
  }

  const getFieldValue = (field: SheetField, rowIndex: number) => {
    return editor.getValue(field, rowIndex)
  }

  return {
    data,
    error,
    updateField,
    getFieldValue
  }
} 