"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { PaletteMode } from '@mui/material'

// Crear el contexto para el tema
const ThemeModeContext = createContext<{
  mode: PaletteMode;
  toggleMode: () => void;
}>({
  mode: 'light',
  toggleMode: () => {},
})

// Hook personalizado para usar el tema
export const useThemeMode = () => {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode debe ser usado dentro de un ThemeProvider')
  }
  return context
}

// Función para crear el tema
const createAppTheme = (mode: PaletteMode) => {
  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#6534ac',
        light: '#8c5fd0',
        dark: '#4a0d8a',
      },
      secondary: {
        main: '#03a9f4',
        light: '#67daff',
        dark: '#007ac1',
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#f5f5f5',
        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 600,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })

  return theme
}

// Proveedor del tema
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Intentar obtener el modo del tema del localStorage
  const [mode, setMode] = useState<PaletteMode>('light')

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as PaletteMode
    if (savedMode) {
      setMode(savedMode)
    } else {
      // Si no hay tema guardado, usar la preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setMode(prefersDark ? 'dark' : 'light')
    }
  }, [])

  const theme = createAppTheme(mode)

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('themeMode', newMode)
  }

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  )
} 