"use client"

import { useState, useEffect } from 'react';
import { VistaPreviaDiapositiva } from '../types';

interface ThumbnailsMap {
  [key: string]: string;
}

/**
 * Devuelve las URLs de thumbnails para las diapositivas.
 * Prioridad: urlImagen (ya viene de obtenerPresentacion, evita llamadas duplicadas a Google)
 * Fallback: nuestro proxy /api/google/slides/thumbnails solo para diapositivas sin urlImagen
 */
export function useThumbnails(diapositivas: VistaPreviaDiapositiva[], idPresentacion?: string) {
  const [thumbnails, setThumbnails] = useState<ThumbnailsMap>({});
  const [cargandoThumbnails, setCargandoThumbnails] = useState(false);

  useEffect(() => {
    if (!diapositivas.length || !idPresentacion) {
      setThumbnails({});
      return;
    }

    // Usar urlImagen cuando ya existe (viene de obtenerPresentacion - una sola llamada a Google)
    const conUrlImagen = diapositivas.filter(d => (d as VistaPreviaDiapositiva & { urlImagen?: string }).urlImagen);
    const sinUrlImagen = diapositivas.filter(d => !(d as VistaPreviaDiapositiva & { urlImagen?: string }).urlImagen);

    const initialMap: ThumbnailsMap = {};
    conUrlImagen.forEach(d => {
      const url = (d as VistaPreviaDiapositiva & { urlImagen: string }).urlImagen;
      if (url) initialMap[d.id] = url;
    });

    if (sinUrlImagen.length === 0) {
      setThumbnails(initialMap);
      setCargandoThumbnails(false);
      return;
    }

    setCargandoThumbnails(true);
    (async () => {
      try {
        const thumbnailsMap = { ...initialMap };
        for (const diapositiva of sinUrlImagen) {
          try {
            const response = await fetch(`/api/google/slides/thumbnails?presentacionId=${idPresentacion}&diapositivaId=${diapositiva.id}`);
            if (response.ok) {
              thumbnailsMap[diapositiva.id] = `/api/google/slides/thumbnails?presentacionId=${idPresentacion}&diapositivaId=${diapositiva.id}`;
            }
          } catch {
            // Ignorar errores individuales
          }
        }
        setThumbnails(thumbnailsMap);
      } finally {
        setCargandoThumbnails(false);
      }
    })();
  }, [diapositivas, idPresentacion]);

  return {
    thumbnails,
    cargandoThumbnails
  };
} 