// Hook para gestión del modo concentración del dashboard
// Fecha: 2025-01-17

'use client';

import { useCallback } from 'react';
import { useDashboardPreferences } from './useDashboardPreferences';

// =====================================================
// Interfaces
// =====================================================

interface UseFocusModeReturn {
  focusMode: boolean;
  toggleFocusMode: () => void;
  enableFocusMode: () => void;
  disableFocusMode: () => void;
}

// =====================================================
// Hook para gestión del modo concentración
// =====================================================

export function useFocusMode(): UseFocusModeReturn {
  const { preferences, updatePreferences, savePreferences } = useDashboardPreferences();

  // Obtener el estado actual del modo concentración
  const focusMode = preferences?.focus_mode || false;

  // Activar el modo concentración
  const enableFocusMode = useCallback(async () => {
    if (preferences && !preferences.focus_mode) {
      updatePreferences({ focus_mode: true });
      await savePreferences();
    }
  }, [preferences, updatePreferences, savePreferences]);

  // Desactivar el modo concentración
  const disableFocusMode = useCallback(async () => {
    if (preferences && preferences.focus_mode) {
      updatePreferences({ focus_mode: false });
      await savePreferences();
    }
  }, [preferences, updatePreferences, savePreferences]);

  // Alternar el modo concentración
  const toggleFocusMode = useCallback(async () => {
    if (preferences) {
      const newValue = !preferences.focus_mode;
      updatePreferences({ focus_mode: newValue });
      await savePreferences();
    }
  }, [preferences, updatePreferences, savePreferences]);

  return {
    focusMode,
    toggleFocusMode,
    enableFocusMode,
    disableFocusMode
  };
}