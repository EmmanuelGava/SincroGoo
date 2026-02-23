"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { ElementoDiapositiva, VistaPreviaDiapositiva, FilaSeleccionada } from '../../types'
import { useGoogleServices } from '../../hooks/useGoogleServices'
import { useUI } from '../UIContext'
import { toast } from 'sonner'
import { useSheets } from '../SheetsContext'

interface SlidesContextType {
  // Estados
  diapositivas: VistaPreviaDiapositiva[]
  diapositivaSeleccionada: VistaPreviaDiapositiva | null
  elementosActuales: ElementoDiapositiva[]
  elementosModificados: ElementoDiapositiva[]
  elementosPrevia: ElementoDiapositiva[]
  elementoSeleccionadoPopup: ElementoDiapositiva | null
  diapositivasConAsociaciones: Set<string>
  hayElementosModificados: boolean
  cargandoDiapositivas: boolean
  cargandoElementos: boolean
  idPresentacion: string
  idProyecto: string
  tituloPresentacion: string
  filaSeleccionada: FilaSeleccionada | null

  // Setters
  setElementosActuales: (elementos: ElementoDiapositiva[]) => void
  setElementosModificados: (elementos: ElementoDiapositiva[]) => void
  setHayElementosModificados: (hay: boolean) => void
  setElementoSeleccionadoPopup: (elemento: ElementoDiapositiva | null) => void
  setDiapositivaSeleccionada: (diapositiva: VistaPreviaDiapositiva | null) => void
  setElementosSeleccionados: (ids: string[]) => void
  setDiapositivasConAsociaciones: (asociaciones: Set<string>) => void
  setFilaSeleccionada: (fila: FilaSeleccionada | null) => void

  // Métodos
  manejarSeleccionDiapositiva: (idDiapositiva: string, filaSeleccionada: FilaSeleccionada | null) => void
  actualizarElementos: (elementos: ElementoDiapositiva[]) => Promise<boolean>
  previsualizarCambios: (elementos: ElementoDiapositiva[], mostrarPrevia: boolean) => void
  enlazarElemento: (elementoId: string, columnaId: string) => void
  desenlazarElemento: (elementoId: string) => void
  recargarDiapositivas: () => Promise<void>
}

const SlidesContext = createContext<SlidesContextType | null>(null)

export function SlidesProvider({ 
  children,
  idProyecto,
  idPresentacion 
}: { 
  children: React.ReactNode
  idProyecto: string
  idPresentacion: string
}) {
  // Estados
  const [diapositivas, setDiapositivas] = useState<VistaPreviaDiapositiva[]>([])
  const [diapositivaSeleccionada, setDiapositivaSeleccionada] = useState<VistaPreviaDiapositiva | null>(null)
  const [elementosActuales, setElementosActuales] = useState<ElementoDiapositiva[]>([])
  const [elementosModificados, setElementosModificados] = useState<ElementoDiapositiva[]>([])
  const [elementosPrevia, setElementosPrevia] = useState<ElementoDiapositiva[]>([])
  const [elementoSeleccionadoPopup, setElementoSeleccionadoPopup] = useState<ElementoDiapositiva | null>(null)
  const [diapositivasConAsociaciones, setDiapositivasConAsociaciones] = useState<Set<string>>(new Set())
  const [hayElementosModificados, setHayElementosModificados] = useState(false)
  const [cargandoDiapositivas, setCargandoDiapositivas] = useState(false)
  const [cargandoElementos, setCargandoElementos] = useState(false)
  const [elementosSeleccionados, setElementosSeleccionados] = useState<string[]>([])
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSeleccionada | null>(null)
  const [tituloPresentacion, setTituloPresentacion] = useState<string>('')

  // Hooks
  const { cargarDiapositivas, actualizarElementosDiapositiva } = useGoogleServices()
  const { setCargando } = useUI()
  const { filaSeleccionada: filaSeleccionadaSheets, columnas } = useSheets()

  // Sincronizar fila seleccionada con el contexto de sheets
  useEffect(() => {
    setFilaSeleccionada(filaSeleccionadaSheets)
  }, [filaSeleccionadaSheets])

  const recargarDiapositivas = useCallback(async () => {
    if (!idPresentacion) return
    setCargandoDiapositivas(true)
    setCargando(true)
    try {
      const resultado = await cargarDiapositivas(idPresentacion)
      if (resultado?.datos?.diapositivas) {
        console.log('🎯 [SlidesContext] Diapositivas recargadas:', resultado.datos.diapositivas.length)
        setDiapositivas(resultado.datos.diapositivas)
        if (resultado.datos.titulo) setTituloPresentacion(resultado.datos.titulo)
        const asociaciones = new Set<string>()
        resultado.datos.diapositivas.forEach((diapositiva: VistaPreviaDiapositiva) => {
          if (diapositiva.elementos?.some((elemento: { columnaAsociada?: string }) => elemento.columnaAsociada)) {
            asociaciones.add(diapositiva.id)
          }
        })
        setDiapositivasConAsociaciones(asociaciones)
      }
    } catch (error) {
      console.error('❌ [SlidesContext] Error al recargar diapositivas:', error)
      toast.error('Error al recargar las diapositivas')
    } finally {
      setCargandoDiapositivas(false)
      setCargando(false)
    }
  }, [idPresentacion, cargarDiapositivas, setCargando])

  // Cargar diapositivas al montar
  useEffect(() => {
    recargarDiapositivas()
  }, [idPresentacion, recargarDiapositivas])

  // Manejar selección de diapositiva
  const manejarSeleccionDiapositiva = useCallback((
    idDiapositiva: string,
    filaSeleccionada: FilaSeleccionada | null
  ) => {
    const diapositiva = diapositivas.find(d => d.id === idDiapositiva)
    if (!diapositiva) return

    console.log('🔄 [SlidesContext] Seleccionando diapositiva:', {
      idDiapositiva,
      elementos: diapositiva.elementos?.length
    })

    setDiapositivaSeleccionada(diapositiva)
    setElementosActuales(diapositiva.elementos || [])
    setElementosPrevia(diapositiva.elementos || [])  // Inicializar elementosPrevia con los elementos actuales
    setElementosModificados([])  // Limpiar elementos modificados
    setHayElementosModificados(false)
    setFilaSeleccionada(filaSeleccionada)
  }, [diapositivas])

  // Actualizar elementos
  const actualizarElementos = async (elementosModificados: ElementoDiapositiva[]): Promise<boolean> => {
    if (!diapositivaSeleccionada || !filaSeleccionada) {
      console.log('❌ [SlidesContext] No se puede actualizar:', {
        tieneDiapositivaSeleccionada: !!diapositivaSeleccionada,
        tieneFilaSeleccionada: !!filaSeleccionada
      })
      return false
    }

    try {
      setCargandoElementos(true)
      console.log('🔄 [SlidesContext] Verificando elementos modificados...')

      // Preparar los elementos para actualizar - mantener todos los elementos
      const elementosParaActualizar = elementosActuales.map(elemento => {
        const elementoModificado = elementosModificados.find(em => em.id === elemento.id)
        return elementoModificado || elemento
      })

      console.log('📊 [SlidesContext] Elementos a actualizar:', {
        totalElementos: elementosParaActualizar.length,
        elementosModificados: elementosModificados.length,
        detallesModificados: elementosModificados.map(e => ({
          id: e.id,
          tipo: e.tipo,
          contenidoAnterior: elementosPrevia.find(ep => ep.id === e.id)?.contenido,
          contenidoNuevo: e.contenido
        }))
      })

      // Actualizar en Google Slides - enviamos TODOS los elementos
      console.log('🔄 [SlidesContext] Actualizando en Google Slides:', {
        idPresentacion,
        idDiapositiva: diapositivaSeleccionada.id,
        totalElementos: elementosParaActualizar.length,
        elementos: elementosParaActualizar
      })

      const resultadoSlides = await actualizarElementosDiapositiva(
        idPresentacion,
        diapositivaSeleccionada.id,
        elementosParaActualizar // Enviamos todos los elementos
      )

      console.log('✅ [SlidesContext] Resultado actualización:', { 
        resultadoSlides,
        elementosActualizados: elementosParaActualizar.length
      })

      if (resultadoSlides) {
        toast.success('Cambios guardados correctamente')
        setElementosActuales(elementosParaActualizar)
        setElementosPrevia(elementosParaActualizar)
        setElementosModificados([])
        setHayElementosModificados(false)
        return true
      }

      console.error('❌ [SlidesContext] Error al actualizar en Google Slides')
      toast.error('Error al guardar los cambios')
      return false
    } catch (error) {
      console.error('❌ [SlidesContext] Error al actualizar elementos:', error)
      toast.error('Error al guardar los cambios')
      return false
    } finally {
      setCargandoElementos(false)
    }
  }

  // Función auxiliar para obtener el contenido como texto
  const obtenerContenidoTexto = (contenido: any): string => {
    if (typeof contenido === 'string') return contenido
    if (typeof contenido === 'object' && contenido !== null) {
      if ('texto' in contenido) return contenido.texto
      return JSON.stringify(contenido)
    }
    return String(contenido || '')
  }

  // Función para registrar cambios en la base de datos
  const registrarCambiosEnBD = async (cambios: Array<{
    idElemento: string,
    idDiapositiva: string,
    contenidoAnterior: string,
    contenidoNuevo: string,
    columnaAnterior?: string,
    columnaNueva?: string,
    filaId?: string
  }>): Promise<boolean> => {
    try {
      const response = await fetch('/api/cambios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idPresentacion,
          cambios
        })
      })

      if (!response.ok) {
        throw new Error('Error al registrar los cambios')
      }

      return true
    } catch (error) {
      console.error('Error al registrar cambios:', error)
      return false
    }
  }

  // Previsualizar cambios
  const previsualizarCambios = useCallback((
    elementos: ElementoDiapositiva[],
    mostrarPrevia: boolean
  ) => {
    if (mostrarPrevia) {
      setElementosPrevia(elementosActuales)
      setElementosActuales(elementos)
    } else {
      setElementosActuales(elementosPrevia)
      setElementosPrevia([])
    }
  }, [elementosActuales])

  // Actualizar todos los elementos asociados cuando cambia la fila seleccionada
  useEffect(() => {
    if (filaSeleccionadaSheets && elementosActuales.length > 0) {
      console.log('🔄 [SlidesContext] Actualizando contenido de elementos con nueva fila seleccionada:', {
        filaId: filaSeleccionadaSheets.id,
        elementosActuales: elementosActuales.length
      });
      
      let hayActualizaciones = false;
      const elementosActualizados = elementosActuales.map(elemento => {
        // Si el elemento tiene una columna asociada
        if (elemento.columnaAsociada) {
          // Buscar el valor correspondiente en la fila seleccionada
          const valorCelda = filaSeleccionadaSheets.valores.find(
            v => v.columnaId === elemento.columnaAsociada
          );
          
          // Si se encuentra un valor, actualizar el contenido del elemento
          if (valorCelda && valorCelda.valor !== undefined) {
            // Realizar validación de tipo según el tipo de elemento
            const valorCeldaStr = String(valorCelda.valor);
            let esCompatible = true;
            
            // Para elementos de tipo imagen, verificar que el valor sea una URL válida
            if (elemento.tipo === 'imagen') {
              try {
                new URL(valorCeldaStr); // Esto lanzará error si no es una URL válida
              } catch (e) {
                console.warn(`⚠️ [SlidesContext] Valor incompatible para elemento tipo imagen: ${valorCeldaStr}`);
                esCompatible = false;
              }
            }
            
            // Para elementos numéricos, verificar que sea un número
            if ((elemento.tipo === 'texto' || elemento.tipo === 'titulo') && 
                elemento.contenido && 
                typeof elemento.contenido === 'object' && 
                elemento.contenido.esNumerico && 
                isNaN(Number(valorCeldaStr))) {
              console.warn(`⚠️ [SlidesContext] Valor no numérico para elemento que espera número: ${valorCeldaStr}`);
              esCompatible = false;
            }
            
            if (esCompatible) {
              console.log(`✅ [SlidesContext] Actualizando elemento ${elemento.id} con valor: ${valorCelda.valor}`);
              hayActualizaciones = true;
              
              // Actualizar según el tipo de contenido
              if (typeof elemento.contenido === 'object' && elemento.contenido !== null) {
                return {
                  ...elemento,
                  contenido: { ...elemento.contenido, texto: valorCeldaStr },
                  modificado: true,
                  _filaId: filaSeleccionadaSheets.id
                };
              } else {
                return {
                  ...elemento,
                  contenido: valorCeldaStr,
                  modificado: true,
                  _filaId: filaSeleccionadaSheets.id
                };
              }
            }
          }
        }
        return elemento;
      });
      
      if (hayActualizaciones) {
        console.log('✅ [SlidesContext] Elementos actualizados con nuevos valores de celdas');
        setElementosActuales(elementosActualizados);
        setHayElementosModificados(true);
      }
    }
  }, [filaSeleccionadaSheets]);

  // Función mejorada para enlazar elementos con mejor validación
  const enlazarElemento = useCallback((elementoId: string, columnaId: string) => {
    // Obtener información del elemento actual y la columna
    const elemento = elementosActuales.find(e => e.id === elementoId);
    const columna = columnas.find(c => c.id === columnaId);
    
    if (!elemento || !columna) {
      toast.error("No se puede enlazar: elemento o columna no encontrados");
      return;
    }
    
    console.log(`🔄 [SlidesContext] Enlazando elemento ${elementoId} con columna ${columnaId} (${columna.titulo})`);
    
    setElementosActuales(elementos => elementos.map(e => 
      e.id === elementoId 
        ? { 
            ...e, 
            columnaAsociada: columnaId, 
            tipoAsociacion: 'automatica',
            modificado: true
          }
        : e
    ));
    
    // Si hay una fila seleccionada, aplicar el valor inmediatamente
    if (filaSeleccionada) {
      const valorCelda = filaSeleccionada.valores.find(v => v.columnaId === columnaId);
      if (valorCelda && valorCelda.valor !== undefined) {
        console.log(`✅ [SlidesContext] Aplicando valor inmediato: ${valorCelda.valor}`);
        
        setElementosActuales(elementos => elementos.map(e => 
          e.id === elementoId 
            ? {
                ...e,
                contenido: typeof e.contenido === 'object' && e.contenido !== null
                  ? { ...e.contenido, texto: String(valorCelda.valor) }
                  : String(valorCelda.valor),
                modificado: true,
                _filaId: filaSeleccionada.id
              }
            : e
        ));
      }
    }
    
    setHayElementosModificados(true);
    toast.success(`Elemento enlazado con columna "${columna.titulo}"`);
  }, [elementosActuales, filaSeleccionada, columnas]);

  const desenlazarElemento = useCallback((elementoId: string) => {
    setElementosActuales(elementos => elementos.map(elemento => 
      elemento.id === elementoId 
        ? { 
            ...elemento, 
            columnaAsociada: undefined, 
            tipoAsociacion: undefined, 
            _filaId: undefined,
            modificado: true
          }
        : elemento
    ))
    setHayElementosModificados(true)
  }, [])

  // Actualizar elementos cuando se abre el popup y hay fila seleccionada
  useEffect(() => {
    if (elementoSeleccionadoPopup && filaSeleccionadaSheets) {
      const elementoActual = elementosActuales.find(e => e.id === elementoSeleccionadoPopup.id)
      if (elementoActual?.columnaAsociada) {
        const valorCeldaEncontrado = filaSeleccionadaSheets.valores.find(
          v => v.columnaId === elementoActual.columnaAsociada
        )
        
        if (valorCeldaEncontrado?.valor) {
          setElementosActuales(elementos => elementos.map(elemento => 
            elemento.id === elementoActual.id
              ? {
                  ...elemento,
                  contenido: typeof elemento.contenido === 'object' && elemento.contenido !== null
                    ? { ...elemento.contenido, texto: valorCeldaEncontrado.valor }
                    : valorCeldaEncontrado.valor,
                  modificado: true,
                  _filaId: filaSeleccionadaSheets.id
                }
              : elemento
          ))
          setHayElementosModificados(true)
        }
      }
    }
  }, [elementoSeleccionadoPopup, filaSeleccionadaSheets, elementosActuales])

  const value = {
    // Estados
    diapositivas,
    diapositivaSeleccionada,
    elementosActuales,
    elementosModificados,
    elementosPrevia,
    elementoSeleccionadoPopup,
    diapositivasConAsociaciones,
    hayElementosModificados,
    cargandoDiapositivas,
    cargandoElementos,
    idPresentacion,
    idProyecto,
    tituloPresentacion,
    filaSeleccionada,

    // Setters
    setElementosActuales,
    setElementosModificados,
    setHayElementosModificados,
    setElementoSeleccionadoPopup,
    setDiapositivaSeleccionada,
    setElementosSeleccionados,
    setDiapositivasConAsociaciones,
    setFilaSeleccionada,

    // Métodos
    manejarSeleccionDiapositiva,
    actualizarElementos,
    previsualizarCambios,
    enlazarElemento,
    desenlazarElemento,
    recargarDiapositivas
  }

  return (
    <SlidesContext.Provider value={value}>
      {children}
    </SlidesContext.Provider>
  )
}

export function useSlides() {
  const context = useContext(SlidesContext)
  if (!context) {
    throw new Error('useSlides debe usarse dentro de un SlidesProvider')
  }
  return context
} 