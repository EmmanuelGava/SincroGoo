"use client"

import { useState, useEffect } from 'react';
import { ServicioGoogleSlides } from '@/servicios/google/googleSlides';
import { VistaPreviaDiapositiva, ElementoDiapositiva } from '@/tipos/diapositivas';
import { buildThumbnailUrl, preloadThumbnails } from '../utils/thumbnailManager';

interface UseDiapositivasProps {
  idPresentacion: string;
  token?: string;
  onError?: (error: string) => void;
  onDiapositivaSeleccionada?: (diapositiva: VistaPreviaDiapositiva, elementos: ElementoDiapositiva[]) => void;
}

interface UseDiapositivasResult {
  diapositivas: VistaPreviaDiapositiva[];
  diapositivaSeleccionada: VistaPreviaDiapositiva | null;
  elementos: ElementoDiapositiva[];
  cargando: boolean;
  error: string | null;
  cargarDiapositivas: () => Promise<void>;
  seleccionarDiapositiva: (idDiapositiva: string, idElemento: string | null) => Promise<void>;
  diapositivasConAsociaciones: Set<string>;
}

export function useDiapositivas({
  idPresentacion,
  token,
  onError,
  onDiapositivaSeleccionada
}: UseDiapositivasProps): UseDiapositivasResult {
  const [diapositivas, setDiapositivas] = useState<VistaPreviaDiapositiva[]>([]);
  const [diapositivaSeleccionada, setDiapositivaSeleccionada] = useState<VistaPreviaDiapositiva | null>(null);
  const [elementos, setElementos] = useState<ElementoDiapositiva[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diapositivasConAsociaciones, setDiapositivasConAsociaciones] = useState<Set<string>>(new Set());

  // Función para cargar diapositivas
  const cargarDiapositivas = async (): Promise<void> => {
    if (!idPresentacion) {
      console.log('No hay ID de presentación');
      return;
    }
    
    try {
      console.log('Iniciando carga de diapositivas:', idPresentacion);
      setCargando(true);
      setError(null);
      
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      if (!servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }
      
      // Obtener la presentación
      const resultado = await servicioSlides.obtenerPresentacion(idPresentacion);
      
      if (!resultado.exito || !resultado.datos) {
        throw new Error('Error al cargar la presentación: ' + (resultado.error || 'Error desconocido'));
      }
      
      const diapositivasObtenidas = resultado.datos.diapositivas;
      console.log('Diapositivas cargadas:', diapositivasObtenidas.length);
      
      // Añadir URLs de miniaturas a las diapositivas
      const diapositivasConUrl = diapositivasObtenidas.map(diapositiva => ({
        ...diapositiva,
        urlImagen: buildThumbnailUrl(idPresentacion, diapositiva.id)
      }));
      
      // Actualizar el estado con las diapositivas
      setDiapositivas(diapositivasConUrl);
      
      // Precargar miniaturas en segundo plano
      try {
        const slideIds = diapositivasConUrl.map(d => d.id);
        console.log(`Iniciando precarga de ${slideIds.length} miniaturas`);
        
        preloadThumbnails(idPresentacion, slideIds.slice(0, 10))
          .then(() => console.log('Precarga de miniaturas completada'))
          .catch(error => console.log('Error en precarga de miniaturas (controlado)'));
      } catch (error) {
        console.log('Error al iniciar precarga de miniaturas (controlado)');
      }
      
      // Si hay diapositivas, seleccionar la primera
      if (diapositivasConUrl.length > 0) {
        console.log('Seleccionando primera diapositiva:', diapositivasConUrl[0].id);
        try {
          await seleccionarDiapositiva(diapositivasConUrl[0].id, null);
        } catch (selectionError) {
          console.warn('Error al seleccionar la primera diapositiva (controlado):', selectionError);
          // No propagamos este error para evitar que falle toda la carga
        }
      }
      
    } catch (error) {
      console.error('Error al cargar diapositivas:', error);
      const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
      setError(mensajeError);
      
      if (onError) {
        onError(mensajeError);
      }
    } finally {
      setCargando(false);
    }
  };

  // Efecto para cargar diapositivas automáticamente cuando cambia el ID de presentación
  useEffect(() => {
    if (idPresentacion && idPresentacion.trim() !== '' && !cargando && diapositivas.length === 0) {
      console.log('🔍 [Debug] Cargando diapositivas automáticamente para presentación:', idPresentacion);
      cargarDiapositivas();
    }
  }, [idPresentacion, cargando, diapositivas.length]);

  // Función para seleccionar una diapositiva
  const seleccionarDiapositiva = async (idDiapositiva: string, idElemento: string | null): Promise<void> => {
    if (!idPresentacion) {
      console.log('❌ [Debug] No hay ID de presentación');
      return;
    }
    
    try {
      console.log('🔍 [Debug] Seleccionando diapositiva:', idDiapositiva);
      
      // Verificar si tenemos diapositivas cargadas
      if (diapositivas.length === 0) {
        console.warn('⚠️ [Debug] No hay diapositivas cargadas para seleccionar');
        return;
      }
      
      // Buscar la diapositiva seleccionada
      const diapositivaActual = diapositivas.find(d => d.id === idDiapositiva);
      if (!diapositivaActual) {
        console.warn(`⚠️ [Debug] No se encontró la diapositiva con ID: ${idDiapositiva}`);
        // Si no se encuentra la diapositiva específica pero hay diapositivas disponibles,
        // seleccionamos la primera como fallback
        if (diapositivas.length > 0) {
          console.log('🔄 [Debug] Seleccionando primera diapositiva como fallback');
          const primeraDiapositiva = diapositivas[0];
          setDiapositivaSeleccionada(primeraDiapositiva);
          // Recursivamente llamamos a esta función con la primera diapositiva
          await seleccionarDiapositiva(primeraDiapositiva.id, idElemento);
          return;
        } else {
          throw new Error('No se encontró la diapositiva seleccionada');
        }
      }
      
      setDiapositivaSeleccionada(diapositivaActual);
      setElementos([]); // Limpiar elementos mientras se cargan los nuevos
      
      // Inicializar el servicio de Google Slides
      const servicioSlides = await ServicioGoogleSlides.obtenerInstancia();
      if (!servicioSlides) {
        throw new Error('No se pudo inicializar el servicio de Google Slides');
      }
      
      // Cargar elementos de la diapositiva
      console.log('🔍 [Debug] Cargando elementos para diapositiva:', idDiapositiva);
      const resultado = await servicioSlides.obtenerElementos(idPresentacion, idDiapositiva);
      
      if (!resultado.exito || !resultado.datos) {
        console.error('❌ [Debug] No se encontraron elementos en la diapositiva:', resultado.error || 'Error desconocido');
        throw new Error('No se encontraron elementos en la diapositiva');
      }
      
      const elementosTexto = resultado.datos;
      console.log('✅ [Debug] Elementos cargados:', elementosTexto.length);
      
      // Actualizar el estado con los elementos cargados
      setElementos(elementosTexto);
      
      // Verificar si hay elementos asociados
      const elementosAsociados = elementosTexto.filter(e => e.columnaAsociada);
      console.log('ℹ️ [Debug] Elementos con asociaciones:', elementosAsociados.length);
      
      // Actualizar el conjunto de diapositivas con asociaciones
      if (elementosAsociados.length > 0) {
        setDiapositivasConAsociaciones(prev => {
          const nuevo = new Set(prev);
          nuevo.add(idDiapositiva);
          return nuevo;
        });
      }
      
      // Llamar al callback si existe
      if (onDiapositivaSeleccionada) {
        console.log('🔄 [Debug] Llamando a callback onDiapositivaSeleccionada con', elementosTexto.length, 'elementos');
        onDiapositivaSeleccionada(diapositivaActual, elementosTexto);
      } else {
        console.warn('⚠️ [Debug] No hay callback onDiapositivaSeleccionada definido');
      }
      
    } catch (error) {
      console.error('❌ [Debug] Error al seleccionar diapositiva:', error);
      const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
      setError(mensajeError);
      
      if (onError) {
        onError(mensajeError);
      }
    }
  };

  return {
    diapositivas,
    diapositivaSeleccionada,
    elementos,
    cargando,
    error,
    cargarDiapositivas,
    seleccionarDiapositiva,
    diapositivasConAsociaciones
  };
} 