'use client';

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '@/app/lib/theme';

export function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  
  const handleToggleMode = () => {
    console.log('🔍 [ThemeToggleButton] Cambiando tema');
    console.log('- Tema actual:', mode);
    
    toggleMode();
    
    // Forzar la actualización de los estilos del sistema
    const newMode = mode === 'light' ? 'dark' : 'light';
    document.documentElement.style.colorScheme = newMode;
    
    console.log('✅ [ThemeToggleButton] Tema cambiado a:', newMode);
  };
  
  return (
    <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
      <IconButton
        onClick={handleToggleMode}
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