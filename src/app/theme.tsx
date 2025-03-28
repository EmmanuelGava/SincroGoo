'use client';

import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Tipo para el contexto del tema
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

// Crear el contexto
const ThemeModeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
});

// Hook para usar el contexto del tema
export const useThemeMode = () => useContext(ThemeModeContext);

// Crear un tema personalizado
const createAppTheme = (mode: ThemeMode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#6534ac',
      light: mode === 'dark' ? '#8c5fd0' : '#8c5fd0',
      dark: mode === 'dark' ? '#4b2680' : '#4b2680',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2d364c',
      light: mode === 'dark' ? '#535b70' : '#535b70',
      dark: mode === 'dark' ? '#1a202e' : '#1a202e',
      contrastText: '#ffffff',
    },
    // ... resto de la configuración del tema ...
  },
});

interface ThemeContextProps {
  children: ReactNode;
}

export function ThemeContext({ children }: ThemeContextProps) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
    if (savedTheme) {
      setMode(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme', newMode);
    document.documentElement.setAttribute('data-theme', newMode);
  };

  const theme = createAppTheme(mode);

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
        <MUIThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MUIThemeProvider>
      </ThemeModeContext.Provider>
    </NextThemesProvider>
  );
} 