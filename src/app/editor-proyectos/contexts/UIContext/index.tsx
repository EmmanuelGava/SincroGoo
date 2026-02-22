"use client"

import React, { createContext, useContext, useState } from 'react'

interface UIContextType {
  // Estados básicos
  cargando: boolean
  error: string | null
  
  // Estados de UI
  sidebarAbierto: boolean
  cambiosPendientes: boolean
  mostrarVistaPrevia: boolean
  
  // IDs y títulos
  idProyecto: string
  tituloHoja: string
  tituloPresentacion: string
  
  // Setters
  setCargando: (cargando: boolean) => void
  setError: (error: string | null) => void
  setSidebarAbierto: (abierto: boolean) => void
  setCambiosPendientes: (pendientes: boolean) => void
  setMostrarVistaPrevia: (mostrar: boolean) => void
}

const UIContext = createContext<UIContextType | null>(null)

interface UIProviderProps {
  children: React.ReactNode
  initialIdProyecto: string
  tituloHoja?: string
  tituloPresentacion?: string
}

export function UIProvider({
  children,
  initialIdProyecto,
  tituloHoja = 'Hoja de cálculo',
  tituloPresentacion = 'Presentación'
}: UIProviderProps) {
  // Estados básicos
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estados de UI
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState(false)
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false)
  
  // IDs y títulos
  const [idProyecto] = useState(initialIdProyecto)

  const value: UIContextType = {
    // Estados básicos
    cargando,
    error,
    
    // Estados de UI
    sidebarAbierto,
    cambiosPendientes,
    mostrarVistaPrevia,
    
    // IDs y títulos
    idProyecto,
    tituloHoja,
    tituloPresentacion,
    
    // Setters
    setCargando,
    setError,
    setSidebarAbierto,
    setCambiosPendientes,
    setMostrarVistaPrevia,
  }

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI debe ser usado dentro de un UIProvider')
  }
  return context
} 