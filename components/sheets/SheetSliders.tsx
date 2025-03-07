import React, { 
  useCallback, 
  useEffect, 
  useState, 
  useMemo, 
  useRef 
} from 'react';
import { Loader2, Link, AlertCircle, RefreshCw, AlertTriangle, ImageOff, Presentation, Layers, X, Info } from 'lucide-react';
import { SheetSlidersProps, SlideElement, SlideElementUpdate } from './types';
import { formatCellValue } from './utils';
import { getCacheKey, getCacheItem, setCacheItem, batchGetElements, batchSetElements, shouldRefreshCache } from '@/lib/cache-service';
import { canMakeRequest, recordRequest } from '@/lib/rate-limiter';
import { SlidesService } from '@/lib/slides-service';
import { SlidePreview } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { SliderDropZone } from './DragDropField';

// Componente para precargar imágenes
const ImagePreloader = ({ urls, onLoad }: { 
  urls: string[],
  onLoad?: (loadedUrls: string[]) => void 
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Procesar y precargar todas las URLs válidas
    const processedUrls = urls
      .filter(url => url && typeof url === 'string' && !preloadedUrlsRef.current.has(url))
      .map(url => {
        // Asegurarse de que las URLs de Google tengan el parámetro de tamaño
        if (url.includes('googleusercontent.com') && !url.includes('=s')) {
          return `${url}=s1600`;
        }
        return url;
      });
    
    if (processedUrls.length === 0) {
      // Si todas las URLs ya están precargadas, notificar
      if (urls.length > 0 && urls.every(url => preloadedUrlsRef.current.has(url))) {
        console.log('[DEBUG] Todas las URLs ya están precargadas');
        onLoad?.(Array.from(preloadedUrlsRef.current));
      }
      return;
    }
    
    console.log('[DEBUG] Iniciando precarga de nuevas imágenes:', processedUrls);
    
    const loadedUrls: string[] = [];
    let loadedCount = 0;
    
    // Precargar imágenes en segundo plano con manejo de errores
    processedUrls.forEach(url => {
      const img = new Image();
      
      const handleLoad = () => {
        console.log(`[DEBUG] Imagen precargada exitosamente: ${url}`);
        loadedUrls.push(url);
        loadedCount++;
        preloadedUrlsRef.current.add(url);
        setLoadedImages(prev => new Set([...prev, url]));
        
        if (loadedCount === processedUrls.length) {
          console.log('[DEBUG] Todas las nuevas imágenes precargadas');
          onLoad?.([...Array.from(preloadedUrlsRef.current), ...loadedUrls]);
        }
      };
      
      const handleError = () => {
        console.warn(`[DEBUG] Error al precargar imagen: ${url}`);
        loadedCount++;
        
        if (loadedCount === processedUrls.length) {
          console.log('[DEBUG] Proceso de precarga completado con errores');
          onLoad?.([...Array.from(preloadedUrlsRef.current), ...loadedUrls]);
        }
      };
      
      // Establecer un timeout más corto para la precarga
      const timeout = setTimeout(() => {
        console.warn(`[DEBUG] Timeout al cargar imagen: ${url}`);
        img.src = '';
        loadedCount++;
        
        if (loadedCount === processedUrls.length) {
          console.log('[DEBUG] Proceso de precarga completado con timeouts');
          onLoad?.([...Array.from(preloadedUrlsRef.current), ...loadedUrls]);
        }
      }, 5000); // 5 segundos de timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        handleLoad();
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        handleError();
      };
      
      // Usar fetch para precarga más rápida
      fetch(url, { mode: 'cors' })
        .then(response => response.blob())
        .then(() => {
          img.src = url;
        })
        .catch(() => {
          img.src = url;
        });
    });
    
    // Cleanup
    return () => {
      processedUrls.forEach(url => {
        const img = new Image();
        img.src = '';
      });
    };
  }, [urls, onLoad]);
  
  return null;
};

// Función para generar SVG seguro con caracteres especiales
const generateSafeSvg = (title: string) => {
  // Escapar caracteres especiales para SVG
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  // Crear SVG como string con mejor formato y tamaño de texto
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#1e293b"/>
      <text x="400" y="225" font-family="Arial" font-size="20" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">
        <tspan x="400" dy="-12">${safeTitle}</tspan>
      </text>
    </svg>
  `.trim();
  
  // Convertir a URL de datos
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
};

// Componente de imagen con fallback para manejar errores de carga
const ImageWithFallback = ({ 
  src, 
  alt, 
  onError, 
  ...props 
}: React.ImgHTMLAttributes<HTMLImageElement> & { 
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Procesar la URL
  const imageUrl = useMemo(() => {
    console.log('[DEBUG] Procesando URL de imagen:', { src, alt });
    
    if (!src || src === '') {
      console.log('[DEBUG] No hay URL de origen');
      return null;
    }
    
    // Solo procesar URLs de Google
    if (!src.includes('googleusercontent.com')) {
      console.log('[DEBUG] URL no es de Google, ignorando:', src);
      return null;
    }
    
    // Asegurarse de que la URL tenga el parámetro de tamaño
    const finalUrl = src.includes('=s') ? src : `${src}=s1600`;
    console.log('[DEBUG] URL de Google procesada:', finalUrl);
    return finalUrl;
  }, [src]);
  
  // Manejar errores de carga
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[DEBUG] Error al cargar imagen:', { 
      src, 
      processedUrl: imageUrl, 
      error: e,
      retryCount,
      alt 
    });
    
    if (retryCount < maxRetries) {
      console.log(`[DEBUG] Reintentando carga (${retryCount + 1}/${maxRetries})...`);
      setRetryCount(prev => prev + 1);
      // Forzar recarga de la imagen
      const img = e.target as HTMLImageElement;
      img.src = imageUrl + '&retry=' + Date.now();
    } else {
      setIsLoading(false);
      setHasError(true);
      
      if (onError) {
        onError(e);
      }
    }
  };
  
  // Manejar carga exitosa
  const handleLoad = () => {
    console.log('[DEBUG] Imagen cargada exitosamente:', {
      src,
      processedUrl: imageUrl,
      alt
    });
    setIsLoading(false);
    setHasError(false);
  };
  
  // Si no hay URL válida o hubo un error, mostrar el estado de error
  if (!imageUrl || hasError) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="w-6 h-6 text-slate-600" />
          <span className="text-xs text-slate-600">No se pudo cargar la imagen</span>
          {hasError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setRetryCount(0);
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <img
        src={imageUrl + (retryCount > 0 ? `&retry=${Date.now()}` : '')}
        alt={alt || 'Imagen'}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        loading="eager"
        crossOrigin="anonymous"
        {...props}
      />
    </div>
  );
};

interface SlidePreviewCardProps {
  slide: SlidePreview;
  selected: boolean;
  elements: SlideElement[];
  onSelect: () => void;
  loading?: boolean;
}

const SlidePreviewCard: React.FC<SlidePreviewCardProps> = ({
  slide,
  selected,
  elements,
  onSelect,
  loading = false
}) => {
  return (
    <div
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
        selected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'
      }`}
      onClick={onSelect}
    >
      {/* Imagen de la diapositiva */}
      <div className="aspect-video bg-slate-800 relative">
        <ImageWithFallback
          src={slide.imageUrl}
          alt={slide.title}
          className="w-full h-full object-cover"
        />
        
        {/* Contador de elementos */}
        {elements.length > 0 && (
          <div className="absolute top-2 right-2 bg-primary/80 text-white text-xs px-2 py-1 rounded-full">
            {elements.length}
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Título de la diapositiva */}
      <div className="p-3 bg-slate-800">
        <h4 className="text-sm font-medium text-white truncate">{slide.title}</h4>
      </div>
    </div>
  );
};

export default function SheetSliders({
  token,
  selectedSlide,
  slideElements: currentSlideElements,
  selectedElements,
  onSelectSlide,
  onUpdateElements,
  onUpdateSlideElements,
  loading = false,
  precachedSlides
}: SheetSlidersProps) {
  const [slides, setSlides] = useState<SlidePreview[]>(precachedSlides || []);
  const [loadingSlides, setLoadingSlides] = useState(!precachedSlides);
  const [error, setError] = useState<string | null>(null);
  const [localElements, setLocalElements] = useState<SlideElement[]>(currentSlideElements || []);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const initialLoadRef = useRef(false);

  // Extraer URLs de las imágenes para precargar
  const imageUrls = useMemo(() => {
    return slides
      .map(slide => slide.imageUrl)
      .filter((url): url is string => 
        typeof url === 'string' && 
        url.includes('googleusercontent.com')
      );
  }, [slides]);

  // Manejar la carga exitosa de imágenes
  const handleImagesPreloaded = useCallback((loadedUrls: string[]) => {
    console.log('[DEBUG] Imágenes precargadas:', loadedUrls);
    setPreloadedImages(new Set(loadedUrls));
  }, []);

  // Cargar slides y precargar imágenes inmediatamente
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const loadSlides = async () => {
      try {
        const presentationId = localStorage.getItem('connectedSlides');
        if (!presentationId) return;

        const slidesService = new SlidesService(token);
        const result = await slidesService.fetchSlidePreviews(presentationId);
        
        if (result.success && result.data) {
          // Iniciar precarga de imágenes inmediatamente
          const urls = result.data
            .map(slide => slide.imageUrl)
            .filter((url): url is string => 
              typeof url === 'string' && 
              url.includes('googleusercontent.com')
            );
          
          console.log('[DEBUG] Iniciando precarga anticipada de imágenes:', urls);
          urls.forEach(url => {
            const img = new Image();
            img.src = url;
          });
        }
      } catch (error) {
        console.warn('[DEBUG] Error en precarga anticipada:', error);
      }
    };

    loadSlides();
  }, [token]);

  // Log inicial para depuración
  useEffect(() => {
    console.log('[DEBUG] SheetSliders montado con:', {
      precachedSlides,
      currentSlideElements,
      selectedSlide,
      imageUrls,
      preloadedImages: Array.from(preloadedImages)
    });
  }, [precachedSlides, currentSlideElements, selectedSlide, imageUrls, preloadedImages]);

  // Actualizar elementos locales cuando cambien los props
  useEffect(() => {
    console.log('Actualizando elementos locales:', currentSlideElements);
    setLocalElements(currentSlideElements);
  }, [currentSlideElements]);

  // Cargar slides al montar el componente
  useEffect(() => {
    const loadSlides = async () => {
      console.log('Iniciando carga de slides...', {
        hasPrecachedSlides: !!precachedSlides?.length,
        token: !!token
      });

      try {
        setLoadingSlides(true);
        setError(null);
        
        const presentationId = localStorage.getItem('connectedSlides');
        if (!presentationId) {
          console.error('No hay presentación conectada');
          setError('No hay presentación conectada');
          setLoadingSlides(false);
          return;
        }

        // Siempre obtener los slides de la API para asegurar que tenemos las URLs de las imágenes
        console.log('Obteniendo slides de la API para presentación:', presentationId);
        const slidesService = new SlidesService(token);
        const result = await slidesService.fetchSlidePreviews(presentationId);
        
        if (!result.success || !result.data) {
          console.error('Error al cargar slides:', result.error);
          setError(result.error || 'Error al cargar diapositivas');
          setLoadingSlides(false);
          return;
        }
        
        const apiSlides = result.data;
        console.log('Slides obtenidos exitosamente:', apiSlides);
        
        // Si tenemos slides precargados, mantener sus propiedades pero actualizar las URLs
        if (precachedSlides && precachedSlides.length > 0) {
          const updatedSlides = precachedSlides.map(cachedSlide => {
            const apiSlide = apiSlides.find(s => s.id === cachedSlide.id);
            return {
              ...cachedSlide,
              imageUrl: apiSlide?.imageUrl || ''
            };
          });
          console.log('Slides actualizados con URLs:', updatedSlides);
          setSlides(updatedSlides);
        } else {
          setSlides(apiSlides);
        }
        
        setLoadingSlides(false);
      } catch (error) {
        console.error('Error al cargar slides:', error);
        setError('Error al cargar diapositivas');
        setLoadingSlides(false);
      }
    };
    
    loadSlides();
  }, [token, precachedSlides]);

  // Agrupar elementos por slide
  const elementsBySlide = useMemo(() => {
    const map = new Map<string, SlideElement[]>();
    slides.forEach(slide => {
      const elements = localElements.filter(el => el.slideId === slide.id);
      console.log(`Elementos para slide ${slide.id}:`, elements);
      map.set(slide.id, elements);
    });
    return map;
  }, [slides, localElements]);

  // Manejar la selección de una diapositiva
  const handleSlideSelect = useCallback(async (slideId: string) => {
    try {
      const presentationId = localStorage.getItem('connectedSlides');
      if (!presentationId) return;

      console.log('Seleccionando slide:', slideId);

      // Verificar caché primero
      const elementsCacheKey = getCacheKey('elements', slideId);
      let elements = getCacheItem<SlideElement[]>(elementsCacheKey);

      // Si no hay caché o necesita refrescarse, cargar de la API
      if (!elements || shouldRefreshCache(elementsCacheKey)) {
        if (!canMakeRequest()) {
          console.warn('Límite de tasa alcanzado, usando caché existente');
          if (elements) {
            onUpdateSlideElements(elements);
            setLocalElements(prevElements => {
              const filtered = prevElements.filter(el => el.slideId !== slideId);
              return [...filtered, ...elements!];
            });
            onSelectSlide(slideId, null);
        return;
      }
      }
      
      recordRequest();
        const slidesService = new SlidesService(token);
        elements = await slidesService.getSlideElements(presentationId, slideId);
        console.log('Elementos obtenidos de la API:', elements);

        if (Array.isArray(elements)) {
          const elementsWithSlideId = elements.map(element => ({
            ...element,
            slideId
          }));
          setCacheItem(elementsCacheKey, elementsWithSlideId);
          onUpdateSlideElements(elementsWithSlideId);
          setLocalElements(prevElements => {
            const filtered = prevElements.filter(el => el.slideId !== slideId);
            return [...filtered, ...elementsWithSlideId];
          });
        }
      } else {
        console.log('Usando elementos en caché:', elements);
        onUpdateSlideElements(elements);
        setLocalElements(prevElements => {
          const filtered = prevElements.filter(el => el.slideId !== slideId);
          return [...filtered, ...elements!];
        });
      }

      onSelectSlide(slideId, null);
    } catch (error) {
      console.error('Error al cargar elementos de la diapositiva:', error);
    }
  }, [token, onSelectSlide, onUpdateSlideElements]);

  if (error) {
    return (
      <div className="text-center p-4 text-red-400">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (loadingSlides) {
    return (
      <div className="text-center p-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-slate-400">Cargando diapositivas...</p>
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="text-center p-4">
        <Presentation className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-slate-400">No hay diapositivas disponibles</p>
      </div>
    );
  }

  return (
    <>
      <ImagePreloader urls={imageUrls} onLoad={handleImagesPreloaded} />
      <div className="grid grid-cols-2 gap-4 p-4 max-h-[600px] overflow-y-auto">
        {slides.map((slide) => (
          <SlidePreviewCard
            key={slide.id}
            slide={{
              ...slide,
              imageUrl: slide.imageUrl && preloadedImages.has(slide.imageUrl) ? slide.imageUrl : ''
            }}
            selected={selectedSlide === slide.id}
            elements={elementsBySlide.get(slide.id) || []}
            onSelect={() => handleSlideSelect(slide.id)}
            loading={loading && selectedSlide === slide.id}
          />
        ))}
      </div>
    </>
  );
}
