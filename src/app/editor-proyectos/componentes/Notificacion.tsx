'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

// Tipos de notificación
type TipoNotificacion = 'success' | 'info' | 'warning' | 'error';

// Interfaz para la notificación
interface Notificacion {
  mensaje: string;
  titulo?: string;
  tipo: TipoNotificacion;
  duracion?: number;
}

// Interfaz para el contexto
interface ContextoNotificacion {
  mostrarNotificacion: (notificacion: Notificacion) => void;
  ocultarNotificacion: () => void;
}

// Crear el contexto
const NotificacionContext = createContext<ContextoNotificacion>({
  mostrarNotificacion: () => {},
  ocultarNotificacion: () => {},
});

// Hook para usar el contexto
export const useNotificacion = () => useContext(NotificacionContext);

// Props para el proveedor
interface NotificacionProviderProps {
  children: ReactNode;
}

// Componente proveedor
export function NotificacionProvider({ children }: NotificacionProviderProps) {
  const [abierto, setAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState<Notificacion>({
    mensaje: '',
    tipo: 'info',
    duracion: 6000,
  });

  const mostrarNotificacion = (nuevaNotificacion: Notificacion) => {
    setNotificacion({
      ...nuevaNotificacion,
      duracion: nuevaNotificacion.duracion || 6000,
    });
    setAbierto(true);
  };

  const ocultarNotificacion = () => {
    setAbierto(false);
  };

  return (
    <NotificacionContext.Provider value={{ mostrarNotificacion, ocultarNotificacion }}>
      {children}
      <Snackbar
        open={abierto}
        autoHideDuration={notificacion.duracion}
        onClose={ocultarNotificacion}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={ocultarNotificacion} 
          severity={notificacion.tipo} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notificacion.titulo && <AlertTitle>{notificacion.titulo}</AlertTitle>}
          {notificacion.mensaje}
        </Alert>
      </Snackbar>
    </NotificacionContext.Provider>
  );
}

// Componente de notificación independiente (para uso sin contexto)
interface NotificacionProps {
  abierto: boolean;
  mensaje: string;
  titulo?: string;
  tipo?: TipoNotificacion;
  duracion?: number;
  onClose: () => void;
}

export function Notificacion({
  abierto,
  mensaje,
  titulo,
  tipo = 'info',
  duracion = 6000,
  onClose,
}: NotificacionProps) {
  return (
    <Snackbar
      open={abierto}
      autoHideDuration={duracion}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onClose} severity={tipo} variant="filled" sx={{ width: '100%' }}>
        {titulo && <AlertTitle>{titulo}</AlertTitle>}
        {mensaje}
      </Alert>
    </Snackbar>
  );
} 