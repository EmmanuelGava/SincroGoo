"use client"

import { Button } from "@/components/ui/button"
import { FileSpreadsheet, PresentationIcon, RefreshCcw, Settings, Folder, ArrowRight, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { ProjectPicker } from "@/components/project-picker"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  sheetId: string
  sheetName: string
  slideId: string
  slideName: string
  lastModified: string
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const router = useRouter()

  useEffect(() => {
    // Cargar proyectos guardados
    const savedProjects = localStorage.getItem("syncProjects")
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects))
    }
  }, [])

  const handleSaveProject = (project: Project) => {
    const updatedProjects = [...projects, project]
    setProjects(updatedProjects)
    localStorage.setItem("syncProjects", JSON.stringify(updatedProjects))
  }

  const handleOpenProject = (project: Project) => {
    router.push(`/dashboard/edit?sheet=${project.sheetId}&slide=${project.slideId}`)
  }

  const handleOpenSettings = (project: Project) => {
    localStorage.setItem("currentProject", JSON.stringify(project))
    router.push(`/dashboard/settings?project=${project.id}`)
  }

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId)
    setProjects(updatedProjects)
    localStorage.setItem("syncProjects", JSON.stringify(updatedProjects))
    toast.success("Proyecto eliminado correctamente")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-24 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Gestiona tus proyectos de sincronización</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-violet-500" />
                <h2 className="font-medium text-slate-900 dark:text-white">Proyectos Activos</h2>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{projects.length}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Conexiones guardadas</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <h2 className="font-medium text-slate-900 dark:text-white">Hojas Conectadas</h2>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{projects.length}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Hojas de cálculo</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PresentationIcon className="w-5 h-5 text-violet-500" />
                <h2 className="font-medium text-slate-900 dark:text-white">Presentaciones</h2>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{projects.length}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Presentaciones conectadas</p>
          </motion.div>
        </div>

        {/* Proyectos */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Mis Proyectos</h2>
                <span className="text-sm text-slate-600 dark:text-slate-400">Gestiona tus conexiones guardadas</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Lista de Proyectos */}
            <div className="space-y-4">
              {projects.map(project => (
                <div 
                  key={project.id}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-grow cursor-pointer" onClick={() => handleOpenProject(project)}>
                      <h3 className="font-medium text-slate-900 dark:text-white flex items-center">
                        {project.name}
                        <ArrowRight className="ml-2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                          {project.sheetName}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <PresentationIcon className="w-4 h-4 text-violet-500" />
                          {project.slideName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(project.lastModified).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenSettings(project)}
                          className="hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteProject(project.id)}
                          className="hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón para crear nuevo proyecto */}
            <ProjectPicker onSave={handleSaveProject} savedProjects={projects} />
          </div>
        </div>
      </div>
    </div>
  )
}

