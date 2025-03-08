import { useEffect, useState, useRef } from 'react';
import { SlidesService } from '@/lib/slides-service';
import { SlidePreview } from '@/lib/types';

interface EditPagePreloaderProps {
  token: string;
  onPreloadComplete?: (slides: SlidePreview[], success: boolean) => void;
}

const EditPagePreloader = ({ token, onPreloadComplete }: EditPagePreloaderProps) => {
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadAttempted = useRef(false);

  useEffect(() => {
    const preloadContent = async () => {
      // Evitar múltiples intentos de precarga
      if (preloadAttempted.current || !token) return;
      preloadAttempted.current = true;

      try {
        setIsPreloading(true);
        const presentationId = localStorage.getItem('connectedSlides');
        if (!presentationId) {
          console.warn('[DEBUG] No hay presentación conectada');
          onPreloadComplete?.([], false);
          return;
        }

        // 1. Obtener los slides
        const slidesService = new SlidesService(token);
        const result = await slidesService.fetchSlidePreviews(presentationId);
        
        if (!result.success || !result.data) {
          console.error('[DEBUG] Error al obtener slides para precarga:', result.error);
          onPreloadComplete?.([], false);
          return;
        }

        // 2. Precargar las imágenes
        const slides = result.data;
        const urls = slides
          .map(slide => slide.imageUrl)
          .filter((url): url is string => 
            typeof url === 'string' && 
            url.includes('googleusercontent.com')
          )
          .map(url => url.includes('=s') ? url : `${url}=s1600`);

        console.log('[DEBUG] Iniciando precarga de imágenes:', urls);

        if (urls.length === 0) {
          console.warn('[DEBUG] No se encontraron URLs de imágenes para precargar');
          onPreloadComplete?.(slides, true);
          return;
        }

        const preloadPromises = urls.map(url => {
          return new Promise<boolean>((resolve) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
              console.warn('[DEBUG] Timeout al precargar imagen:', url);
              resolve(false);
            }, 10000); // 10 segundos de timeout
            
            img.onload = () => {
              clearTimeout(timeoutId);
              console.log('[DEBUG] Imagen precargada exitosamente:', url);
              resolve(true);
            };
            
            img.onerror = () => {
              clearTimeout(timeoutId);
              console.warn('[DEBUG] Error al precargar imagen:', url);
              resolve(false);
            };

            img.src = url;
          });
        });

        const results = await Promise.all(preloadPromises);
        const allSuccess = results.every(success => success);
        
        console.log('[DEBUG] Precarga completada:', {
          total: urls.length,
          successful: results.filter(r => r).length
        });

        onPreloadComplete?.(slides, allSuccess);
      } catch (error) {
        console.error('[DEBUG] Error durante la precarga:', error);
        onPreloadComplete?.([], false);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadContent();
  }, [token, onPreloadComplete]);

  // Este componente no renderiza nada visualmente
  return null;
};

export default EditPagePreloader; 