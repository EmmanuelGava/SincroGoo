'use client';

import React, { useEffect, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useTheme } from 'next-themes';
import { useThemeMode } from '@/lib/theme';

export function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Efecto para sincronizar los temas
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Evitar problemas de hidratación
  if (!mounted) {
    return null;
  }
  
  const isDarkMode = mode === 'dark' || theme === 'dark';
  
  const handleToggleTheme = () => {
    toggleMode();
    setTheme(isDarkMode ? 'light' : 'dark');
  };
  
  return (
    <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
      <IconButton
        onClick={handleToggleTheme}
        sx={{
          color: mode === 'dark' ? 'white' : 'black',
          '&:hover': {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        {mode === 'dark' ? (
          <LightModeOutlinedIcon />
        ) : (
          <DarkModeOutlinedIcon />
        )}
      </IconButton>
    </Tooltip>
  );
} 