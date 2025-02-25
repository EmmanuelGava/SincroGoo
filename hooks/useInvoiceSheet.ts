import { useEffect, useState } from 'react'
import { useSheetEditor } from './useSheetEditor'
import { invoiceTemplate } from '@/types/sheets'
import { SheetUpdate } from '@/lib/sheet-editor'
import { updateSheetData } from '@/lib/google-sheets'

interface InvoiceData {
  companyInfo: {
    name: string
    address: string
    phone: string
  }
  invoiceDetails: {
    number: string
    date: Date
    dueDate: Date
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  summary: {
    subtotal: number
    adjustments: number
    total: number
  }
}

export function useInvoiceSheet(initialData?: any[][]) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { data, error, updateField, getFieldValue } = useSheetEditor({
    template: invoiceTemplate,
    initialData,
    onUpdate: async (updates: SheetUpdate[]) => {
      try {
        await updateSheetData(process.env.NEXT_PUBLIC_SHEET_ID || '', updates)
      } catch (err) {
        console.error('Error updating sheet:', err)
      }
    }
  })

  useEffect(() => {
    if (data && data.length > 0) {
      try {
        const processedData: InvoiceData = {
          companyInfo: {
            name: String(getFieldValue(invoiceTemplate.sections[0].fields[0], 2) || ''),
            address: String(getFieldValue(invoiceTemplate.sections[0].fields[1], 3) || ''),
            phone: String(getFieldValue(invoiceTemplate.sections[0].fields[2], 5) || '')
          },
          invoiceDetails: {
            number: String(getFieldValue(invoiceTemplate.sections[1].fields[0], 11) || ''),
            date: new Date(String(getFieldValue(invoiceTemplate.sections[1].fields[1], 8)) || new Date()),
            dueDate: new Date(String(getFieldValue(invoiceTemplate.sections[1].fields[2], 14)) || new Date())
          },
          items: [],
          summary: {
            subtotal: Number(getFieldValue(invoiceTemplate.sections[3].fields[0], 25) || 0),
            adjustments: Number(getFieldValue(invoiceTemplate.sections[3].fields[1], 26) || 0),
            total: Number(getFieldValue(invoiceTemplate.sections[3].fields[2], 27) || 0)
          }
        }

        // Procesar los items (filas 18-24)
        for (let row = 17; row <= 24; row++) {
          const description = getFieldValue(invoiceTemplate.sections[2].fields[0], row)
          if (description) {
            processedData.items.push({
              description: String(description),
              quantity: Number(getFieldValue(invoiceTemplate.sections[2].fields[1], row) || 0),
              unitPrice: Number(getFieldValue(invoiceTemplate.sections[2].fields[2], row) || 0),
              totalPrice: Number(getFieldValue(invoiceTemplate.sections[2].fields[3], row) || 0)
            })
          }
        }

        setInvoiceData(processedData)
      } catch (err) {
        console.error('Error processing invoice data:', err)
      }
      setLoading(false)
    }
  }, [data, getFieldValue])

  const updateInvoiceField = async (
    sectionId: keyof InvoiceData,
    fieldId: string,
    value: any,
    rowIndex?: number
  ) => {
    const section = invoiceTemplate.sections.find(s => s.id === sectionId)
    if (!section) return

    const field = section.fields.find(f => f.id === fieldId)
    if (!field) return

    await updateField(field, rowIndex || 0, value)
  }

  return {
    invoiceData,
    loading,
    error,
    updateInvoiceField
  }
} 