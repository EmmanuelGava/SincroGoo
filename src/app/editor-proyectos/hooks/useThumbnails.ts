"use client"

import { useState, useEffect } from 'react';
import { VistaPreviaDiapositiva } from '../types';

interface ThumbnailsMap {
  [key: string]: string;
}

/**
 * Devuelve las URLs de thumbnails para las diapositivas.
 * Siempre usa el proxy /api/google/slides/thumbnails para evitar CORS con contentUrl de Google.
 * El proxy devuelve la imagen servida desde nuestro backend y usa APICache.
 */
export function useThumbnails(diapositivas: VistaPreviaDiapositiva[], idPresentacion?: string) {
  const [thumbnails, setThumbnails] = useState<ThumbnailsMap>({});
  const [cargandoThumbnails, setCargandoThumbnails] = useState(false);

  useEffect(() => {
    if (!diapositivas.length || !idPresentacion) {
      setThumbnails({});
      setCargandoThumbnails(false);
      return;
    }

    // Usar siempre el proxy para evitar CORS (contentUrl de Google falla en img)
    const thumbnailsMap: ThumbnailsMap = {};
    diapositivas.forEach(d => {
      thumbnailsMap[d.id] = `/api/google/slides/thumbnails?presentacionId=${idPresentacion}&diapositivaId=${d.id}`;
    });
    setThumbnails(thumbnailsMap);
    setCargandoThumbnails(false);
  }, [diapositivas, idPresentacion]);

  return {
    thumbnails,
    cargandoThumbnails
  };
} 