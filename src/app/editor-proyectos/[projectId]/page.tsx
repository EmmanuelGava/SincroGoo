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

export default function EditorPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [idProyecto, setIdProyecto] = useState<string>('')
  const [idHojaCalculo, setIdHojaCalculo] = useState<string>('')
  const [idPresentacion, setIdPresentacion] = useState<string>('')

  useEffect(() => {
    if (params.projectId) {
      const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId
      setIdProyecto(projectId)
    }

    const sheetId = searchParams.get('idHojaCalculo')
    if (sheetId) {
      setIdHojaCalculo(sheetId)
    }

    const presentationId = searchParams.get('idPresentacion')
    if (presentationId) {
      setIdPresentacion(presentationId)
    }
  }, [params.projectId, searchParams])

  if (!idProyecto || !idHojaCalculo || !idPresentacion) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  return (
    <UIProvider initialIdProyecto={idProyecto}>
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