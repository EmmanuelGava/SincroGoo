import { useInvoiceSheet } from '@/hooks/useInvoiceSheet'
import { useState } from 'react'

interface InvoiceEditorProps {
  initialData?: any[][]
}

export function InvoiceEditor({ initialData }: InvoiceEditorProps) {
  const { invoiceData, loading, error, updateInvoiceField } = useInvoiceSheet(initialData)
  const [editMode, setEditMode] = useState(false)

  if (loading) {
    return <div className="flex justify-center p-4">Cargando factura...</div>
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>
  }

  if (!invoiceData) {
    return <div className="p-4">No hay datos de factura disponibles</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Encabezado de la factura */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Factura</h1>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="font-semibold mb-2">Información de la Empresa</h2>
            <div className="space-y-2">
              <EditableField
                label="Nombre"
                value={invoiceData.companyInfo.name}
                onEdit={(value) => updateInvoiceField('companyInfo', 'company_name', value)}
                editMode={editMode}
              />
              <EditableField
                label="Dirección"
                value={invoiceData.companyInfo.address}
                onEdit={(value) => updateInvoiceField('companyInfo', 'company_address', value)}
                editMode={editMode}
              />
              <EditableField
                label="Teléfono"
                value={invoiceData.companyInfo.phone}
                onEdit={(value) => updateInvoiceField('companyInfo', 'company_phone', value)}
                editMode={editMode}
              />
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Detalles de Factura</h2>
            <div className="space-y-2">
              <EditableField
                label="Número"
                value={invoiceData.invoiceDetails.number}
                onEdit={(value) => updateInvoiceField('invoiceDetails', 'invoice_number', value)}
                editMode={editMode}
              />
              <EditableField
                label="Fecha"
                value={invoiceData.invoiceDetails.date.toLocaleDateString()}
                onEdit={(value) => updateInvoiceField('invoiceDetails', 'invoice_date', new Date(value))}
                editMode={editMode}
                type="date"
              />
              <EditableField
                label="Fecha de vencimiento"
                value={invoiceData.invoiceDetails.dueDate.toLocaleDateString()}
                onEdit={(value) => updateInvoiceField('invoiceDetails', 'due_date', new Date(value))}
                editMode={editMode}
                type="date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items de la factura */}
      <div className="mb-8">
        <h2 className="font-semibold mb-4">Artículos</h2>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2 text-right">Precio unitario</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">
                  <EditableField
                    value={item.description}
                    onEdit={(value) => updateInvoiceField('items', 'description', value, index + 17)}
                    editMode={editMode}
                  />
                </td>
                <td className="p-2 text-right">
                  <EditableField
                    value={item.quantity.toString()}
                    onEdit={(value) => updateInvoiceField('items', 'quantity', Number(value), index + 17)}
                    editMode={editMode}
                    type="number"
                  />
                </td>
                <td className="p-2 text-right">
                  <EditableField
                    value={item.unitPrice.toFixed(2)}
                    onEdit={(value) => updateInvoiceField('items', 'unit_price', Number(value), index + 17)}
                    editMode={editMode}
                    type="number"
                    step="0.01"
                  />
                </td>
                <td className="p-2 text-right">
                  {item.totalPrice.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span>Subtotal:</span>
            <span>{invoiceData.summary.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Ajustes:</span>
            <EditableField
              value={invoiceData.summary.adjustments.toFixed(2)}
              onEdit={(value) => updateInvoiceField('summary', 'adjustments', Number(value))}
              editMode={editMode}
              type="number"
              step="0.01"
            />
          </div>
          <div className="flex justify-between py-2 font-bold">
            <span>Total:</span>
            <span>{invoiceData.summary.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botón de edición */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {editMode ? 'Guardar' : 'Editar'}
        </button>
      </div>
    </div>
  )
}

interface EditableFieldProps {
  label?: string
  value: string
  onEdit: (value: string) => void
  editMode: boolean
  type?: string
  step?: string
}

function EditableField({ label, value, onEdit, editMode, type = 'text', step }: EditableFieldProps) {
  if (!editMode) {
    return (
      <div>
        {label && <span className="font-medium">{label}: </span>}
        <span>{value}</span>
      </div>
    )
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onEdit(e.target.value)}
        step={step}
        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
} 