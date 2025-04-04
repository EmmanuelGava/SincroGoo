"use client"

import { createContext, useContext, useState, useCallback } from 'react'
import { Alert, AlertTitle, Box } from '@mui/material'

export type TipoNotificacion = 'success' | 'info' | 'warning' | 'error'

export interface Notificacion {
  id?: string
  mensaje: string
  titulo?: string
  tipo: TipoNotificacion
  duracion?: number
}

interface NotificacionContextType {
  notificaciones: Notificacion[]
  mostrarNotificacion: (notificacion: Notificacion) => void
  ocultarNotificacion: (id: string) => void
  limpiarNotificaciones: () => void
}

const NotificacionContext = createContext<NotificacionContextType | null>(null)

interface NotificacionProviderProps {
  children: React.ReactNode
}

export function NotificacionProvider({ children }: NotificacionProviderProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])

  const mostrarNotificacion = useCallback((notificacion: Notificacion) => {
    const id = Math.random().toString(36).substring(7)
    const nuevaNotificacion = {
      ...notificacion,
      id,
      duracion: notificacion.duracion || 5000
    }

    setNotificaciones(prev => [...prev, nuevaNotificacion])

    // Auto ocultar después de la duración especificada
    setTimeout(() => {
      ocultarNotificacion(id)
    }, nuevaNotificacion.duracion)
  }, [])

  const ocultarNotificacion = useCallback((id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id))
  }, [])

  const limpiarNotificaciones = useCallback(() => {
    setNotificaciones([])
  }, [])

  const value: NotificacionContextType = {
    notificaciones,
    mostrarNotificacion,
    ocultarNotificacion,
    limpiarNotificaciones
  }

  return (
    <NotificacionContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          width: 'auto',
          maxWidth: '80%'
        }}
      >
        {notificaciones.map(notificacion => (
          <Alert
            key={notificacion.id}
            severity={notificacion.tipo}
            variant="filled"
            onClose={() => ocultarNotificacion(notificacion.id!)}
            sx={{
              minWidth: '300px',
              boxShadow: 3
            }}
          >
            {notificacion.titulo && (
              <AlertTitle>{notificacion.titulo}</AlertTitle>
            )}
            {notificacion.mensaje}
          </Alert>
        ))}
      </Box>
    </NotificacionContext.Provider>
  )
}

export function useNotificacion() {
  const context = useContext(NotificacionContext)
  if (!context) {
    throw new Error('useNotificacion debe ser usado dentro de un NotificacionProvider')
  }
  return context
} 