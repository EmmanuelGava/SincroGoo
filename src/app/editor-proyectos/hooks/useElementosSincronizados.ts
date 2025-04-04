import { useEffect, useState } from 'react'
import { ElementoDiapositiva, FilaSeleccionada } from '../types'

interface ElementosSincronizados {
  elementos: ElementoDiapositiva[]
  elementosModificados: ElementoDiapositiva[]
  hayModificaciones: boolean
}

export function useElementosSincronizados(
  elementosActuales: ElementoDiapositiva[],
  filaSeleccionada: FilaSeleccionada | null
): ElementosSincronizados {
  const [elementosSincronizados, setElementosSincronizados] = useState<ElementoDiapositiva[]>(elementosActuales)
  const [elementosModificados, setElementosModificados] = useState<ElementoDiapositiva[]>([])
  const [hayModificaciones, setHayModificaciones] = useState(false)

  // Actualizar elementos cuando cambia la fila seleccionada
  useEffect(() => {
    if (!filaSeleccionada) {
      setElementosSincronizados(elementosActuales)
      setElementosModificados([])
      setHayModificaciones(false)
      return
    }

    // Crear mapa de valores por columna
    const valoresPorColumna = filaSeleccionada.valores.reduce((acc, val) => {
      acc[val.columnaId] = val.valor;
      return acc;
    }, {} as Record<string, string>);

    // Actualizar elementos que tienen columna asociada
    const elementosActualizados = elementosActuales.map(elemento => {
      if (!elemento.columnaAsociada || !valoresPorColumna[elemento.columnaAsociada]) {
        return elemento
      }

      const valorCelda = valoresPorColumna[elemento.columnaAsociada]
      const elementoModificado = {
        ...elemento,
        contenido: typeof elemento.contenido === 'object' && elemento.contenido !== null
          ? { ...elemento.contenido, texto: valorCelda }
          : valorCelda,
        modificado: true,
        _filaId: filaSeleccionada.id
      }

      return elementoModificado
    })

    // Identificar elementos modificados
    const modificados = elementosActualizados.filter(
      (elemento, index) => elemento.modificado && 
      JSON.stringify(elemento) !== JSON.stringify(elementosActuales[index])
    )

    setElementosSincronizados(elementosActualizados)
    setElementosModificados(modificados)
    setHayModificaciones(modificados.length > 0)
  }, [filaSeleccionada, elementosActuales])

  return {
    elementos: elementosSincronizados,
    elementosModificados,
    hayModificaciones
  }
} 