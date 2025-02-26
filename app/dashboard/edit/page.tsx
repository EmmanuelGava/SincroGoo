"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SheetSyncView } from "@/components/SheetSyncView"
import { Loader2, ArrowLeft } from "lucide-react"
import { SheetConfig } from '@/lib/types'
import { SlidesService } from '@/lib/slides-service'
import { toast } from 'sonner'

export default function EditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin')
    },
  })

  const [isLoading, setIsLoading] = useState(true)
  const [sheetId, setSheetId] = useState<string>("")
  const [slideId, setSlideId] = useState<string>("")
  const [projectData, setProjectData] = useState<any>(null)

  useEffect(() => {
    checkDocuments()
  }, [searchParams])

  const checkDocuments = async () => {
    setIsLoading(true)
    try {
      const sheet = searchParams.get("sheet")
      const slide = searchParams.get("slide")

      if (!sheet || !slide) {
        router.push("/dashboard")
        return
      }

      // Verificar acceso a la presentación
      if (session?.accessToken) {
        const slidesService = new SlidesService(session.accessToken)
        const result = await slidesService.fetchSlidePreviews(slide)
        
        if (!result.success) {
          toast.error(result.error || "Error al acceder a la presentación")
          router.push("/dashboard")
          return
        }
      }

      // Cargar datos del proyecto
      const savedProjects = localStorage.getItem("syncProjects")
      if (savedProjects) {
        const projects = JSON.parse(savedProjects)
        const project = projects.find((p: any) => p.sheetId === sheet && p.slideId === slide)
        if (project) {
          setProjectData(project)
        }
      }

      setSheetId(sheet)
      setSlideId(slide)
      setIsLoading(false)
    } catch (error) {
      console.error("Error checking documents:", error)
      toast.error("Error al verificar los documentos")
      router.push("/dashboard")
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!session?.accessToken) {
    return null
  }

  const config: SheetConfig = {
    spreadsheetId: sheetId,
    range: 'A:Z',  // Rango amplio para detectar todas las columnas
    headerRow: 0,  // No asumimos headers
    columns: [
      { key: 'A', index: 0, type: 'text' },
      { key: 'B', index: 1, type: 'text' },
      { key: 'C', index: 2, type: 'text' },
      { key: 'D', index: 3, type: 'text' },
      { key: 'E', index: 4, type: 'text' },
      { key: 'F', index: 5, type: 'text' },
      { key: 'G', index: 6, type: 'text' },
      { key: 'H', index: 7, type: 'text' },
      { key: 'I', index: 8, type: 'text' },
      { key: 'J', index: 9, type: 'text' }
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-24 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="hover:bg-violet-100 dark:hover:bg-violet-900/20 text-slate-700 dark:text-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {projectData?.name || 'Editor'}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Sincroniza tus documentos
              </p>
            </div>
          </div>
        </div>

        {/* SheetSyncView */}
        <Card className="bg-white/95 dark:bg-slate-900/95 border border-violet-200 dark:border-violet-900/30 shadow-lg">
          <CardContent className="p-6">
            <SheetSyncView token={session.accessToken} config={config} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


