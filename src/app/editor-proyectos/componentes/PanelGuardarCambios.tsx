"use client"

import { useSlides } from '../contexts/SlidesContext'
import { useUI } from '../contexts/UIContext'
import { usePathname } from 'next/navigation'

export function PanelGuardarCambios() {
  const { actualizarElementos, elementosPrevia } = useSlides()
  const { cargando } = useUI()
  const pathname = usePathname()

  // No mostrar el panel si estamos en el editor de elementos
  if (pathname?.includes('/editor-proyectos')) {
    return null
  }

  const hayElementosModificados = elementosPrevia.length > 0

  const handleGuardar = async () => {
    if (!hayElementosModificados) return
    await actualizarElementos(elementosPrevia)
  }

  if (!hayElementosModificados) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-between items-center">
      <p className="text-sm text-muted-foreground">
        Hay cambios pendientes por guardar
      </p>
      <button
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        onClick={handleGuardar}
        disabled={cargando}
      >
        {cargando ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  )
} 