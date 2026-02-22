"use client"

import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import { useToast } from '@/componentes/ui/use-toast';
import { ElementoDiapositiva, VistaPreviaDiapositiva } from '../types';

export function useGoogleServices() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificarSesion = useCallback(() => {
    console.log('🔐 [useGoogleServices] Verificando sesión:', {
      status,
      tieneToken: !!session?.accessToken
    });

    if (status === 'loading') return null;
    if (!session?.accessToken) {
      toast({
        title: "Error de autenticación",
        description: "Por favor, inicia sesión nuevamente",
        variant: "destructive"
      });
      return false;
    }
    return true;
  }, [session?.accessToken, status, toast]);

  const cargarHojaCalculo = useCallback(async (spreadsheetId: string) => {
    setCargando(true);
    setError(null);
    
    try {
      const sesionValida = verificarSesion();
      if (sesionValida === null) return null;
      if (!sesionValida) return null;

      const response = await fetch(`/api/google/sheets?action=getData&spreadsheetId=${spreadsheetId}`);
      console.log('📥 [useGoogleServices] Respuesta sheets:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive"
        });
        return null;
      }

      if (!response.ok) {
        throw new Error('Error al cargar datos de la hoja');
      }

      const resultado = await response.json();
      console.log('📦 [useGoogleServices] Datos sheets recibidos:', {
        resultado,
        estructuraFilas: resultado.datos?.filas?.map((f: any) => ({
          id: f.id,
          cantidadValores: Object.keys(f.valores || {}).length,
          valores: f.valores
        })),
        estructuraColumnas: resultado.datos?.columnas?.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          tipo: c.tipo
        }))
      });

      if (!resultado.exito) {
        throw new Error(resultado.error || 'Error al procesar datos de la hoja');
      }

      return resultado;
    } catch (error) {
      console.error('❌ [useGoogleServices] Error en sheets:', error);
      toast({
        title: "Error al cargar hoja de cálculo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setError('Error al cargar la hoja de cálculo');
      return null;
    } finally {
      setCargando(false);
    }
  }, [session?.accessToken, toast, verificarSesion]);

  const cargarDiapositivas = useCallback(async (presentationId: string) => {
    setCargando(true);
    setError(null);
    
    try {
      const sesionValida = verificarSesion();
      if (sesionValida === null) return null;
      if (!sesionValida) return null;

      const response = await fetch(`/api/google/slides?action=getData&presentationId=${presentationId}&onlyMetadata=true`);
      console.log('📥 [useGoogleServices] Respuesta slides:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive"
        });
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useGoogleServices] Error en slides response:', errorText);
        throw new Error('Error al cargar diapositivas');
      }

      const resultado = await response.json();
      console.log('📦 [useGoogleServices] Datos slides recibidos:', resultado);

      if (!resultado.exito) {
        throw new Error(resultado.error || 'Error al procesar diapositivas');
      }

      return resultado;
    } catch (error) {
      console.error('❌ [useGoogleServices] Error en slides:', error);
      toast({
        title: "Error al cargar diapositivas",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setError('Error al cargar las diapositivas');
      return null;
    } finally {
      setCargando(false);
    }
  }, [session?.accessToken, toast, verificarSesion]);

  const cargarElementosDiapositiva = useCallback(async (presentationId: string, slideId: string) => {
    setCargando(true);
    setError(null);
    
    try {
      const sesionValida = verificarSesion();
      if (sesionValida === null) return null;
      if (!sesionValida) return null;

      const response = await fetch(`/api/google/slides?action=getData&presentationId=${presentationId}&slideId=${slideId}&onlyMetadata=false`);
      console.log('📥 [useGoogleServices] Respuesta elementos:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        toast({
          title: "Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
          variant: "destructive"
        });
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useGoogleServices] Error en elementos response:', errorText);
        throw new Error('Error al cargar elementos');
      }

      const resultado = await response.json();
      console.log('📦 [useGoogleServices] Datos elementos recibidos:', resultado);

      if (!resultado.exito) {
        throw new Error(resultado.error || 'Error al procesar elementos');
      }

      return resultado;
    } catch (error) {
      console.error('❌ [useGoogleServices] Error en elementos:', error);
      toast({
        title: "Error al cargar elementos",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setError('Error al cargar los elementos');
      return null;
    } finally {
      setCargando(false);
    }
  }, [session?.accessToken, toast, verificarSesion]);

  const actualizarRangoHoja = useCallback(async (
    spreadsheetId: string,
    range: string,
    valores: string[][]
  ): Promise<boolean> => {
    setCargando(true);
    setError(null);

    try {
      const sesionValida = verificarSesion();
      if (sesionValida === null) return false;
      if (!sesionValida) return false;

      const response = await fetch('/api/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, range, valores })
      });

      const resultado = await response.json();
      if (!response.ok || !resultado.exito) {
        throw new Error(resultado.error || 'Error al actualizar la hoja');
      }

      return true;
    } catch (error) {
      console.error('❌ [useGoogleServices] Error al actualizar hoja:', error);
      toast({
        title: "Error al actualizar la hoja",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setError('Error al actualizar la hoja');
      return false;
    } finally {
      setCargando(false);
    }
  }, [session?.accessToken, toast, verificarSesion]);

  const actualizarElementosDiapositiva = useCallback(async (
    presentationId: string,
    slideId: string,
    elementos: ElementoDiapositiva[]
  ) => {
    setCargando(true);
    setError(null);
    
    try {
      const sesionValida = verificarSesion();
      if (sesionValida === null) return false;
      if (!sesionValida) return false;

      const response = await fetch('/api/google/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateSlide',
          presentationId,
          slideId,
          elementos
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar diapositiva');
      }

      const resultado = await response.json();
      if (!resultado.exito) {
        throw new Error(resultado.error || 'Error al procesar actualización');
      }

      console.log('Elementos actualizados:', {
        presentationId,
        slideId,
        elementos
      });

      return true;
    } catch (error) {
      console.error('❌ [useGoogleServices] Error al actualizar diapositiva:', error);
      toast({
        title: "Error al actualizar diapositiva",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      setError('Error al actualizar los elementos');
      return false;
    } finally {
      setCargando(false);
    }
  }, [session?.accessToken, toast, verificarSesion]);

  return {
    cargando,
    error,
    cargarHojaCalculo,
    cargarDiapositivas,
    cargarElementosDiapositiva,
    actualizarRangoHoja,
    actualizarElementosDiapositiva
  };
} 