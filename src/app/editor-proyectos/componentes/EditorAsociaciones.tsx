"use client"

import { useSlides } from '../contexts/SlidesContext'
import { useSheets } from '../contexts/SheetsContext'
import { useUI } from '../contexts/UIContext'
import { ElementoDiapositiva } from '../types'

export function EditorAsociaciones() {
  const { elementosActuales, setElementosModificados, setHayElementosModificados } = useSlides()
  const { columnas } = useSheets()
  const { idProyecto } = useUI()

  const handleElementoChange = (elemento: ElementoDiapositiva, columnaId: string) => {
    const nuevosElementos = elementosActuales.map((el: ElementoDiapositiva) =>
      el.id === elemento.id
        ? { ...el, columnaAsociada: columnaId || undefined }
        : el
    )
    setElementosModificados(nuevosElementos)
    setHayElementosModificados(true)
  }

  return (
    <div className="space-y-4">
      {elementosActuales.map((elemento: ElementoDiapositiva) => (
        <div key={elemento.id} className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Elemento: {elemento.id}</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Contenido</label>
              <p className="mt-1">{typeof elemento.contenido === 'string' ? elemento.contenido : 
                typeof elemento.contenido === 'object' && elemento.contenido.texto ? elemento.contenido.texto : 
                JSON.stringify(elemento.contenido)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Columna Asociada</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={elemento.columnaAsociada || ''}
                onChange={(e) => handleElementoChange(elemento, e.target.value)}
              >
                <option value="">Sin asociar</option>
                {columnas.map((columna) => (
                  <option key={columna.id} value={columna.id}>
                    {columna.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 