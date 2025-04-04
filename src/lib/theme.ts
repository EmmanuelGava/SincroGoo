import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

/**
 * Hook para manejar el tema de la aplicación
 */
export function useThemeMode() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme
    if (stored) setTheme(stored)
    setMounted(true)
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
      return
    }
    
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const setMode = (mode: Theme) => {
    localStorage.setItem('theme', mode)
    setTheme(mode)
  }

  return {
    theme,
    setTheme: setMode,
    mounted
  }
} 