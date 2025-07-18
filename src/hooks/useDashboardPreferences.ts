// Hook para gestión de preferencias del dashboard
// Fecha: 2025-01-17

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardPreferences, LayoutType } from '../types/dashboard';

// =====================================================
// Interfaces
// =====================================================

interface UseDashboardPreferencesReturn {
  preferences: DashboardPreferences | null;
  loading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<DashboardPreferences>) => void;
  savePreferences: () => Promise<void>;
  resetPreferences: () => Promise<void>;
}

// =====================================================
// Hook principal
// =====================================================

export function useDashboardPreferences(): UseDashboardPreferencesReturn {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // =====================================================
  // Preferencias por defecto
  // =====================================================

  const getDefaultPreferences = useCallback((): DashboardPreferences => ({
    id: '',
    usuario_id: session?.user?.id || '',
    layout_type: 'expanded',
    visible_sections: ['metrics', 'conversations', 'tasks', 'notifications'],
    refresh_interval: 30,
    notification_settings: {
      browser_notifications: true,
      sound_alerts: true,
      priority_only: false,
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },
    focus_mode: false,
    custom_objectives: {
      response_time_target: 120,
      daily_conversations_target: 50,
      conversion_rate_target: 15
    },
    theme_preferences: {
      color_scheme: 'light',
      compact_view: false,
      show_animations: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }), [session?.user?.id]);

  // =====================================================
  // Cargar preferencias
  // =====================================================

  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/preferences');
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else if (response.status === 404) {
        // No hay preferencias guardadas, usar defaults
        const defaultPrefs = getDefaultPreferences();
        setPreferences(defaultPrefs);
      } else {
        throw new Error('Error al cargar preferencias');
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError(err as Error);
      // Usar preferencias por defecto en caso de error
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, getDefaultPreferences]);

  // =====================================================
  // Actualizar preferencias localmente
  // =====================================================

  const updatePreferences = useCallback((updates: Partial<DashboardPreferences>) => {
    setPreferences(current => {
      if (!current) return null;
      
      const updated = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  // =====================================================
  // Guardar preferencias en servidor
  // =====================================================

  const savePreferences = useCallback(async () => {
    if (!preferences || !session?.user?.id) {
      throw new Error('No hay preferencias para guardar');
    }

    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Error al guardar preferencias');
      }

      const savedPreferences = await response.json();
      setPreferences(savedPreferences);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err as Error);
      throw err;
    }
  }, [preferences, session?.user?.id]);

  // =====================================================
  // Resetear preferencias
  // =====================================================

  const resetPreferences = useCallback(async () => {
    try {
      const defaultPrefs = getDefaultPreferences();
      setPreferences(defaultPrefs);
      setHasUnsavedChanges(true);
      
      // Opcionalmente, guardar automáticamente
      await savePreferences();
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError(err as Error);
      throw err;
    }
  }, [getDefaultPreferences, savePreferences]);

  // =====================================================
  // Efectos
  // =====================================================

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Advertir sobre cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    savePreferences,
    resetPreferences
  };
}