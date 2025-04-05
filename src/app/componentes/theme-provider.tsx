'use client'

import * as React from 'react'
// import { NextThemesProvider } from 'next-themes' // Comentado porque no se utiliza
import { ThemeProvider as MuiThemeProvider } from '@/app/lib/theme'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  storageKey?: string
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <MuiThemeProvider>
      {children}
    </MuiThemeProvider>
  )
}
