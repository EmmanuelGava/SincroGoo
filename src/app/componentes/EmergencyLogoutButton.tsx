'use client';

import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { ExitToApp as ExitToAppIcon } from '@mui/icons-material';
import { toast } from 'sonner';

/**
 * Botón de salida de emergencia para cuando el cierre de sesión normal falla
 */
export function EmergencyLogoutButton() {
  const [loading, setLoading] = useState(false);
  
  const handleEmergencyLogout = async () => {
    try {
      setLoading(true);
      console.log('🚨 [EmergencyLogout] Iniciando cierre de sesión de emergencia...');
      
      // 1. Intentar el endpoint de emergencia
      const response = await fetch('/api/auth/emergency-logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ [EmergencyLogout] Error en endpoint de emergencia:', await response.text());
      } else {
        console.log('✅ [EmergencyLogout] Endpoint de emergencia OK');
      }
      
      // 2. Limpiar localStorage completamente
      console.log('🧹 [EmergencyLogout] Limpiando localStorage...');
      localStorage.clear();
      
      // 3. Limpiar sessionStorage
      console.log('🧹 [EmergencyLogout] Limpiando sessionStorage...');
      sessionStorage.clear();
      
      // 4. Limpiar todas las cookies manualmente
      console.log('🧹 [EmergencyLogout] Limpiando cookies manualmente...');
      const cookies = document.cookie.split(';');
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        
        // Eliminar en múltiples dominios y rutas para asegurar la limpieza
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
      }
      
      console.log('✅ [EmergencyLogout] Limpieza completa, redirigiendo...');
      toast.success('Sesión eliminada, redirigiendo...');
      
      // 5. Redirigir a la página de inicio con un parámetro para forzar recarga completa
      setTimeout(() => {
        window.location.href = `/?forcedLogout=true&t=${Date.now()}`;
      }, 500);
      
    } catch (error) {
      console.error('❌ [EmergencyLogout] Error crítico:', error);
      toast.error('Error al cerrar sesión');
      setLoading(false);
      
      // En caso de error grave, intentar recargar la página
      setTimeout(() => {
        window.location.href = `/?error=true&t=${Date.now()}`;
      }, 1500);
    }
  };
  
  return (
    <Button
      variant="contained"
      color="error"
      fullWidth
      disabled={loading}
      onClick={handleEmergencyLogout}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ExitToAppIcon />}
      sx={{ 
        mt: 1,
        py: 1.5,
        fontWeight: 'bold',
        textTransform: 'none',
        fontSize: '1rem'
      }}
    >
      {loading ? 'Cerrando sesión...' : 'Salida de emergencia'}
    </Button>
  );
} 