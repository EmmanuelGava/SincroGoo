import { useEffect, useState } from 'react'
import { useSheetEditor } from './useSheetEditor'
import { invoiceTemplate, SheetField } from '@/types/sheets'
import { SheetUpdate } from '@/lib/sheet-editor'
import { SheetsService } from '@/lib/sheets-service'
import { DataRow, ColumnConfig } from '@/lib/types'
import { useSession } from 'next-auth/react'

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

export function useInvoiceSheet(initialData?: { [sectionId: string]: any[][] }) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()
  const sheetsService = new SheetsService(session?.accessToken || '')
  
  const { data, error, updateField, getFieldValue } = useSheetEditor({
    template: invoiceTemplate,
    initialData,
    onUpdate: async (updates: SheetUpdate[]) => {
      try {
        // Encontrar la sección relevante para obtener el rango
        const section = invoiceTemplate.sections.find(s => 
          updates.some(u => s.fields.some(f => f.key === u.field.key))
        )
        
        if (!section) {
          throw new Error('No se encontró la sección para actualizar')
        }

        const result = await sheetsService.updateData({
          spreadsheetId: process.env.NEXT_PUBLIC_SHEET_ID || '',
          range: section.range,
          headerRow: invoiceTemplate.headerRows,
          columns: section.fields.map((f: SheetField, index: number): ColumnConfig => ({
            key: f.key,
            type: f.type as 'text' | 'number' | 'date' | 'boolean' | 'price' | 'formula' | 'select',
            format: f.format,
            index
          }))
        }, updates.map(u => ({
          id: `row_${u.rowIndex}`,
          values: { [u.field.key]: u.value },
          lastUpdate: new Date(),
          rowNumber: u.rowIndex
        })), [])
        
        if (!result.success) {
          throw new Error(typeof result.error === 'string' ? result.error : 'Error desconocido')
        }
      } catch (err) {
        console.error('Error updating sheet:', err)
      }
    }
  })

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      try {
        const companyData = data.company?.[0] || []
        const invoiceDetailsData = data.invoice_details?.[0] || []
        const itemsData = data.items || []
        const summaryData = data.summary?.[0] || []

        const processedData: InvoiceData = {
          companyInfo: {
            name: String(companyData[0] || ''),
            address: String(companyData[1] || ''),
            phone: String(companyData[2] || '')
          },
          invoiceDetails: {
            number: String(invoiceDetailsData[0] || ''),
            date: new Date(String(invoiceDetailsData[1]) || new Date()),
            dueDate: new Date(String(invoiceDetailsData[2]) || new Date())
          },
          items: itemsData.map(row => ({
            description: String(row[0] || ''),
            quantity: Number(row[1] || 0),
            unitPrice: Number(row[2] || 0),
            totalPrice: Number(row[3] || 0)
          })),
          summary: {
            subtotal: Number(summaryData[0] || 0),
            adjustments: Number(summaryData[1] || 0),
            total: Number(summaryData[2] || 0)
          }
        }

        setInvoiceData(processedData)
      } catch (err) {
        console.error('Error processing invoice data:', err)
      }
      setLoading(false)
    }
  }, [data])

  const updateInvoiceField = async (
    sectionId: keyof InvoiceData,
    fieldId: string,
    value: any,
    rowIndex: number = 0
  ) => {
    const section = invoiceTemplate.sections.find(s => s.id === sectionId)
    if (!section) return

    const field = section.fields.find(f => f.key === fieldId)
    if (!field) return

    await updateField(section, field, rowIndex, value)
  }

  return {
    invoiceData,
    loading,
    error,
    updateInvoiceField
  }
} 