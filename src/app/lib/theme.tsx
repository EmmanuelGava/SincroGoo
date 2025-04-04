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
  return createTheme({
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
      text: {
        primary: mode === 'dark' ? '#ffffff' : '#000000',
        secondary: mode === 'dark' ? '#b0b0b0' : '#666666',
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
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5',
            color: mode === 'dark' ? '#ffffff' : '#000000',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          },
        },
      },
    },
  })
}

// Proveedor del tema
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Intentar obtener el tema guardado
    const savedMode = localStorage.getItem('themeMode') as PaletteMode
    
    // Determinar el tema inicial
    let initialMode: PaletteMode
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      initialMode = savedMode
    } else {
      // Si no hay tema guardado, usar la preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      initialMode = prefersDark ? 'dark' : 'light'
      // Guardar la preferencia inicial
      localStorage.setItem('themeMode', initialMode)
    }
    
    // Aplicar el tema
    setMode(initialMode)
    document.documentElement.setAttribute('data-theme', initialMode)
    document.documentElement.style.setProperty('color-scheme', initialMode)
    
    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('themeMode')) {
        const newMode = e.matches ? 'dark' : 'light'
        setMode(newMode)
        document.documentElement.setAttribute('data-theme', newMode)
        document.documentElement.style.setProperty('color-scheme', newMode)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('themeMode', newMode)
    document.documentElement.setAttribute('data-theme', newMode)
    document.documentElement.style.setProperty('color-scheme', newMode)
  }

  // Evitar problemas de hidratación
  if (!mounted) {
    return null
  }

  const theme = createAppTheme(mode)

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  )
} 