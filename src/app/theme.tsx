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
      light: '#8c5fd0',
      dark: '#4b2680',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2d364c',
      light: '#535b70',
      dark: '#1a202e',
      contrastText: '#ffffff',
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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5',
          color: mode === 'dark' ? '#ffffff' : '#000000',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        },
      },
    },
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