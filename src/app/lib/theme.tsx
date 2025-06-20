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
        default: mode === 'dark' ? '#0d0d0d' : '#f5f5f5',
        paper: mode === 'dark' ? '#1a1a1a' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#ffffff' : '#000000',
        secondary: mode === 'dark' ? '#b0b0b0' : '#666666',
      },
      action: {
        hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        selected: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
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
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 500,
        fontSize: '0.875rem',
      },
      body1: {
        fontSize: '0.875rem',
      },
      body2: {
        fontSize: '0.8125rem',
      },
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'dark' ? '#0d0d0d' : '#f5f5f5',
            color: mode === 'dark' ? '#ffffff' : '#000000',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            transition: 'all 0.2s ease',
          },
          sizeSmall: {
            padding: 6,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? '#2d2d2d' : '#666666',
            fontSize: '0.75rem',
            padding: '6px 12px',
            borderRadius: 4,
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