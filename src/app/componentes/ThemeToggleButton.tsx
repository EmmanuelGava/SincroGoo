'use client';

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '@/app/lib/theme';

export function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  
  const handleToggleTheme = () => {
    toggleMode();
    // Forzar la actualización de los estilos
    document.documentElement.style.setProperty('color-scheme', mode === 'dark' ? 'light' : 'dark');
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