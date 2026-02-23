"use client"

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { 
  SlidesProvider, 
  SheetsProvider, 
  UIProvider, 
  NotificacionProvider 
} from '../contexts'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import { TablaHojas } from '../componentes/sheets/TablaHojas'
import { SidebarSlides } from '../componentes/slides/SidebarSlides'
import { PanelGuardarCambios } from '../componentes/PanelGuardarCambios'
import { EditorPlantilla } from '../componentes/plantilla/EditorPlantilla'
import { useSlides } from '../contexts'

function EditorContent() {
  const { 
    diapositivas, 
    diapositivaSeleccionada, 
    setDiapositivaSeleccionada,
    diapositivasConAsociaciones,
    cargandoDiapositivas,
    idPresentacion,
    idProyecto
  } = useSlides()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  const handleDiapositivaSeleccionada = async (idDiapositiva: string) => {
    const diapositiva = diapositivas.find(d => d.id === idDiapositiva)
    if (diapositiva) {
      setDiapositivaSeleccionada(diapositiva)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <EncabezadoSistema />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <div className="flex-1 overflow-auto p-4">
            <TablaHojas />
          </div>
          <SidebarSlides 
            sidebarAbierto={sidebarAbierto}
            setSidebarAbierto={setSidebarAbierto}
          />
        </div>
      </main>
      <PanelGuardarCambios />
    </div>
  )
}

interface ProyectoFetch {
  id: string
  hoja_calculo_id?: string
  presentacion_id?: string
  modo?: 'enlace' | 'plantilla'
  metadata?: {
    hojastitulo?: string
    presentaciontitulo?: string
    plantilla_template_id?: string
    column_mapping?: Record<string, string>
  }
}

export default function EditorPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [idProyecto, setIdProyecto] = useState<string>('')
  const [idHojaCalculo, setIdHojaCalculo] = useState<string>('')
  const [idPresentacion, setIdPresentacion] = useState<string>('')
  const [tituloHoja, setTituloHoja] = useState<string>('')
  const [tituloPresentacion, setTituloPresentacion] = useState<string>('')
  const [cargandoProyecto, setCargandoProyecto] = useState(true)
  const [errorProyecto, setErrorProyecto] = useState<string | null>(null)
  const [modoProyecto, setModoProyecto] = useState<'enlace' | 'plantilla'>('enlace')
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [templateType, setTemplateType] = useState<string>('')

  const projectId = params.projectId 
    ? (Array.isArray(params.projectId) ? params.projectId[0] : params.projectId)
    : ''

  useEffect(() => {
    if (!projectId) {
      setCargandoProyecto(false)
      return
    }

    const cargarProyecto = async () => {
      setCargandoProyecto(true)
      setErrorProyecto(null)
      try {
        const res = await fetch(`/api/supabase/projects/${projectId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar el proyecto')
        const proyecto = data.project as ProyectoFetch
        if (proyecto) {
          setIdProyecto(proyecto.id)
          setIdHojaCalculo(proyecto.hoja_calculo_id || searchParams.get('idHojaCalculo') || '')
          setIdPresentacion(proyecto.presentacion_id || searchParams.get('idPresentacion') || '')
          setModoProyecto(proyecto.modo || 'enlace')
          setColumnMapping(proyecto.metadata?.column_mapping || {})
          setTemplateType(proyecto.metadata?.plantilla_template_id || '')
          if (proyecto.metadata?.hojastitulo) setTituloHoja(proyecto.metadata.hojastitulo)
          else if (searchParams.get('tituloHoja')) setTituloHoja(searchParams.get('tituloHoja')!)
          if (proyecto.metadata?.presentaciontitulo) setTituloPresentacion(proyecto.metadata.presentaciontitulo)
          else if (searchParams.get('tituloPresentacion')) setTituloPresentacion(searchParams.get('tituloPresentacion')!)
        }
      } catch (err) {
        console.error('Error al cargar proyecto:', err)
        setErrorProyecto(err instanceof Error ? err.message : 'Error al cargar el proyecto')
        setIdProyecto(projectId)
        setIdHojaCalculo(searchParams.get('idHojaCalculo') || '')
        setIdPresentacion(searchParams.get('idPresentacion') || '')
        setTituloHoja(searchParams.get('tituloHoja') || '')
        setTituloPresentacion(searchParams.get('tituloPresentacion') || '')
      } finally {
        setCargandoProyecto(false)
      }
    }

    cargarProyecto()
  }, [projectId, searchParams])

  if (cargandoProyecto) {
    return <div className="flex items-center justify-center h-screen">Cargando proyecto...</div>
  }

  if (errorProyecto) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p className="text-destructive">{errorProyecto}</p>
      </div>
    )
  }

  if (!idProyecto || !idHojaCalculo || !idPresentacion) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p>No se encontró la hoja de cálculo o la presentación asociada al proyecto.</p>
      </div>
    )
  }

  if (modoProyecto === 'plantilla') {
    return (
      <UIProvider 
        initialIdProyecto={idProyecto} 
        tituloHoja={tituloHoja || undefined} 
        tituloPresentacion={tituloPresentacion || undefined}
      >
        <NotificacionProvider>
          <SheetsProvider idHojaCalculo={idHojaCalculo}>
            <EditorPlantilla
              idProyecto={idProyecto}
              idPresentacion={idPresentacion}
              idHojaCalculo={idHojaCalculo}
              columnMapping={columnMapping}
              templateType={templateType}
            />
          </SheetsProvider>
        </NotificacionProvider>
      </UIProvider>
    )
  }

  return (
    <UIProvider 
      initialIdProyecto={idProyecto} 
      tituloHoja={tituloHoja || undefined} 
      tituloPresentacion={tituloPresentacion || undefined}
    >
      <NotificacionProvider>
        <SheetsProvider idHojaCalculo={idHojaCalculo}>
          <SlidesProvider idProyecto={idProyecto} idPresentacion={idPresentacion}>
            <EditorContent />
          </SlidesProvider>
        </SheetsProvider>
      </NotificacionProvider>
    </UIProvider>
  )
}