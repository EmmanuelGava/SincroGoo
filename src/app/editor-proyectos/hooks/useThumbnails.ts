"use client"

import { useState, useEffect } from 'react';
import { VistaPreviaDiapositiva } from '../types';

interface ThumbnailsMap {
  [key: string]: string;
}

export function useThumbnails(diapositivas: VistaPreviaDiapositiva[], idPresentacion?: string) {
  const [thumbnails, setThumbnails] = useState<ThumbnailsMap>({});
  const [cargandoThumbnails, setCargandoThumbnails] = useState(false);

  useEffect(() => {
    async function cargarThumbnails() {
      if (!diapositivas.length || !idPresentacion) {
        setThumbnails({});
        return;
      }

      setCargandoThumbnails(true);
      console.log('🖼️ [useThumbnails] Iniciando carga de thumbnails para', diapositivas.length, 'diapositivas');

      try {
        const thumbnailsMap: ThumbnailsMap = {};

        await Promise.all(
          diapositivas.map(async (diapositiva) => {
            try {
              // Hacer la petición a nuestra API
              const response = await fetch(`/api/google/slides/thumbnails?presentacionId=${idPresentacion}&diapositivaId=${diapositiva.id}`);
              
              if (!response.ok) {
                throw new Error(`Error al obtener thumbnail: ${response.statusText}`);
              }
              
              // La respuesta es la imagen directamente, usamos la URL del endpoint
              thumbnailsMap[diapositiva.id] = `/api/google/slides/thumbnails?presentacionId=${idPresentacion}&diapositivaId=${diapositiva.id}`;
              console.log(`✅ [useThumbnails] Thumbnail verificado para diapositiva ${diapositiva.id}`);
            } catch (error) {
              console.error(`❌ [useThumbnails] Error al verificar thumbnail para diapositiva ${diapositiva.id}:`, error);
            }
          })
        );

        console.log('✅ [useThumbnails] Thumbnails cargados exitosamente');
        setThumbnails(thumbnailsMap);
      } catch (error) {
        console.error('❌ [useThumbnails] Error al cargar thumbnails:', error);
      } finally {
        setCargandoThumbnails(false);
      }
    }

    cargarThumbnails();
  }, [diapositivas, idPresentacion]);

  return {
    thumbnails,
    cargandoThumbnails
  };
} 