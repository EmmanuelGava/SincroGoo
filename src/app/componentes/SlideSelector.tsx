import { useEffect, useState } from 'react';
import { SlidePreview, SlideElementUpdate } from '@/lib/types';
import { SlidesService } from '@/lib/slides-service';
import { Badge } from './ui/badge';
import { AlertCircle, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SlideElement {
  id: string;
  slideId: string;
  content: string;
  type?: string;
}

interface SlideSelectorProps {
  token: string;
  presentationId: string;
  selectedSlideId?: string;
  selectedElements: SlideElementUpdate[];
  onSelect: (slideId: string, element: string) => void;
}

export function SlideSelector({ 
  token, 
  presentationId, 
  selectedSlideId,
  selectedElements,
  onSelect 
}: SlideSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [slides, setSlides] = useState<SlidePreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [slideElements, setSlideElements] = useState<SlideElement[]>([])

  const slidesService = new SlidesService(token)

  useEffect(() => {
    const loadSlides = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!presentationId) {
          setError("No hay presentación conectada. Por favor, seleccione una presentación en la página principal.");
          return;
        }

        if (!token) {
          setError("No hay token de acceso. Por favor, inicie sesión nuevamente.");
          return;
        }

        const result = await slidesService.fetchSlidePreviews(presentationId);
        
        if (result.success && result.data) {
          setSlides(result.data);
        } else {
          throw new Error(result.error || 'Error desconocido');
        }
      } catch (err) {
        let errorMessage = 'Error al cargar las diapositivas. ';
        if (err instanceof Error && err.message.includes('404')) {
          errorMessage += 'La presentación no existe o no tiene acceso a ella.';
        } else {
          errorMessage += err instanceof Error ? err.message : String(err);
        }
        
        setError(errorMessage);
        
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(loadSlides, 1000 * (retryCount + 1));
        }
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, [token, presentationId, retryCount]);

  // Cargar elementos cuando se selecciona un slide
  useEffect(() => {
    const loadSlideElements = async () => {
      if (!selectedSlideId || !presentationId) return;
      
      try {
        const elements = await slidesService.getSlideElements(presentationId, selectedSlideId);
        console.log('Elementos del slide cargados:', elements);
        
        if (elements.success && elements.data) {
          // Asegurar que los elementos tienen la estructura correcta
          setSlideElements(elements.data.map(el => ({
            id: el.id,
            slideId: el.slideId,
            content: el.content,
            type: 'Texto' // Agregar un tipo por defecto
          })));
        } else {
          setSlideElements([]);
        }
      } catch (err) {
        console.error('Error cargando elementos del slide:', err);
        setSlideElements([]);
      }
    };

    loadSlideElements();
  }, [selectedSlideId, presentationId]);

  const handleRetry = () => {
    setRetryCount(0);
  };

  const filteredSlides = slides.filter(slide => 
    slide.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectSlide = (slideId: string) => {
    if (selectedSlideId !== slideId) {
      onSelect(slideId, '');
      setSlideElements([]); // Limpiar elementos al cambiar de slide
    }
  };

  const handleSelectElement = (slideId: string, elementId: string) => {
    // Verificar si el elemento ya está seleccionado
    const isAlreadySelected = selectedElements.some(el => 
      el.elementId === elementId && slideId === selectedSlideId
    );

    if (!isAlreadySelected) {
      onSelect(slideId, elementId);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        {retryCount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Intento {retryCount} de 3...
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center mb-2">{error}</p>
        <div className="text-xs text-muted-foreground mb-4">
          ID de presentación: {presentationId}
        </div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Reintentar carga
        </button>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>No se encontraron slides</p>
        <button
          onClick={handleRetry}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar slides..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
        {filteredSlides.map((slide) => (
          <div
            key={slide.id}
            className={`rounded-lg border p-2 transition-all ${
              selectedSlideId === slide.id ? "border-primary ring-2 ring-primary ring-offset-2" : ""
            }`}
          >
            <div 
              className="aspect-video relative cursor-pointer"
              onClick={() => handleSelectSlide(slide.id)}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                  <p className="text-sm text-muted-foreground">Vista previa no disponible</p>
                </div>
              )}
              {selectedSlideId === slide.id && (
                <div className="absolute top-2 right-2">
                  <Badge>Seleccionado</Badge>
                </div>
              )}
            </div>
            
            <div className="mt-2 space-y-2">
              <p className="text-sm text-center">
                {slide.title}
              </p>
              
              {selectedSlideId === slide.id && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Selecciona el elemento a actualizar:
                  </p>
                  
                  {slideElements.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {slideElements.map((element) => (
                        <Button
                          key={element.id}
                          variant={selectedElements.some(el => el.elementId === element.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectElement(slide.id, element.id)}
                          className="text-left"
                        >
                          <div className="flex flex-col items-start w-full">
                            <span className="text-xs text-muted-foreground w-full truncate">{element.type || 'Texto'}</span>
                            <span className="w-full truncate">{element.content}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      Cargando elementos del slide...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 