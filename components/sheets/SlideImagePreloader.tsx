import { useEffect, useState } from 'react';
import { SlidesService } from '@/lib/slides-service';

interface SlideImagePreloaderProps {
  token: string;
  onPreloadComplete?: (success: boolean) => void;
}

const SlideImagePreloader = ({ token, onPreloadComplete }: SlideImagePreloaderProps) => {
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    const preloadImages = async () => {
      try {
        setIsPreloading(true);
        const presentationId = localStorage.getItem('connectedSlides');
        if (!presentationId) {
          onPreloadComplete?.(false);
          return;
        }

        const slidesService = new SlidesService(token);
        const result = await slidesService.fetchSlidePreviews(presentationId);
        
        if (!result.success || !result.data) {
          console.error('[DEBUG] Error al obtener slides para precarga:', result.error);
          onPreloadComplete?.(false);
          return;
        }

        const urls = result.data
          .map(slide => slide.imageUrl)
          .filter((url): url is string => 
            typeof url === 'string' && 
            url.includes('googleusercontent.com')
          )
          .map(url => url.includes('=s') ? url : `${url}=s1600`);

        console.log('[DEBUG] Iniciando precarga de imágenes:', urls);

        const preloadPromises = urls.map(url => {
          return new Promise<boolean>((resolve) => {
            const img = new Image();
            
            img.onload = () => {
              console.log('[DEBUG] Imagen precargada exitosamente:', url);
              resolve(true);
            };
            
            img.onerror = () => {
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

        setIsPreloading(false);
        onPreloadComplete?.(allSuccess);
      } catch (error) {
        console.error('[DEBUG] Error durante la precarga:', error);
        setIsPreloading(false);
        onPreloadComplete?.(false);
      }
    };

    if (token) {
      preloadImages();
    }
  }, [token, onPreloadComplete]);

  // Este componente no renderiza nada visualmente
  return null;
};

export default SlideImagePreloader; 