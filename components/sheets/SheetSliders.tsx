import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, ImageOff, Presentation, X } from 'lucide-react';
import { SheetSlidersProps, SlideElement } from './types';
import { getCacheKey, getCacheItem, setCacheItem, shouldRefreshCache } from '@/lib/cache-service';
import { canMakeRequest, recordRequest } from '@/lib/rate-limiter';
import { SlidesService } from '@/lib/slides-service';
import { Button } from '@/components/ui/button';
import { SlidePreview } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectedRow } from './types';

// Componente de imagen con fallback para manejar errores de carga
const ImageWithFallback = ({ 
  src, 
  alt, 
  onError, 
  ...props 
}: React.ImgHTMLAttributes<HTMLImageElement> & { 
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void 
}) => {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const imageUrl = useMemo(() => {
    if (!src || src === '') return null;
    if (!src.includes('googleusercontent.com')) return null;
    // Añadir parámetros para evitar el bloqueo CORS
    const baseUrl = src.includes('=s') ? src : `${src}=s800`;
    return `${baseUrl}&access_token=${localStorage.getItem('googleAccessToken')}`;
  }, [src]);
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      const img = e.target as HTMLImageElement;
      img.src = imageUrl + '&retry=' + Date.now();
    } else {
      setHasError(true);
      if (onError) onError(e);
    }
  };
  
  if (!imageUrl || hasError) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <Image
          src="/placeholder-slide.png"
          alt="Placeholder"
          width={400}
          height={225}
          className="w-full h-full object-contain opacity-50"
        />
      </div>
    );
  }
  
  return (
    <Image
      src={imageUrl}
      alt={alt || 'Miniatura de diapositiva'}
      width={400}
      height={225}
      className="w-full h-full object-contain"
      onError={handleError}
      priority={true}
      unoptimized={true}
    />
  );
};

interface SlidePreviewCardProps {
  slide: { id: string; title: string; imageUrl: string };
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
      className={`relative rounded-md overflow-hidden cursor-pointer transition-all ${
        selected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="aspect-[16/9] bg-slate-800 relative max-h-[160px]">
        <ImageWithFallback
          src={slide.imageUrl}
          alt={slide.title}
          className="w-full h-full object-contain"
        />
        
        {elements.length > 0 && (
          <div className="absolute top-1 right-1 bg-primary/80 text-white text-xs px-1.5 py-0.5 rounded-full">
            {elements.length}
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="p-2 bg-slate-800">
        <h4 className="text-xs font-medium text-white truncate">{slide.title}</h4>
      </div>
    </div>
  );
};

interface SheetSlidersProps {
  token: string;
  selectedSlide?: SlidePreview;
  slideElements: SlideElement[];
  selectedElements: string[];
  onSelectSlide: (slideId: string, elementId: string | null) => Promise<void>;
  onUpdateElements: (elements: SlideElement[]) => Promise<void>;
  onUpdateSlideElements: (elements: SlideElement[]) => void;
  selectedRow?: SelectedRow;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export default function SheetSliders({
  token,
  selectedSlide,
  slideElements,
  selectedElements,
  onSelectSlide,
  onUpdateElements,
  onUpdateSlideElements,
  selectedRow,
  isOpen,
  onOpenChange,
  className
}: SheetSlidersProps) {
  const [slides, setSlides] = React.useState<SlidePreview[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchSlides = async () => {
      try {
        setLoading(true);
        const presentationId = localStorage.getItem('connectedSlides');
        if (!presentationId) return;

        const response = await fetch(
          `https://slides.googleapis.com/v1/presentations/${presentationId}?fields=slides.objectId,slides.slideProperties.title`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) throw new Error('Error al obtener slides');

        const data = await response.json();
        if (!data.slides) return;

        const slidesWithImages = data.slides.map((slide: any) => ({
          id: slide.objectId,
          title: slide.slideProperties?.title || 'Sin título',
          imageUrl: `https://docs.google.com/presentation/d/${presentationId}/export/png?pageid=${slide.objectId}&access_token=${token}`
        }));

        setSlides(slidesWithImages);
      } catch (error) {
        console.error('Error cargando slides:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchSlides();
  }, [token]);

  const handleElementSelect = (elementId: string) => {
    if (!selectedSlide) return;
    onSelectSlide(selectedSlide.id, elementId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={`w-[400px] p-0 ${className || ''}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-2 p-4">
                {slides.map((slide) => (
                  <Card
                    key={slide.id}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                      selectedSlide?.id === slide.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => onSelectSlide(slide.id, null)}
                  >
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate">{slide.title}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {selectedSlide && slideElements && (
            <div className="border-t">
              <div className="p-4">
                <h3 className="font-medium mb-2">Elementos Editables</h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {slideElements.map((element) => (
                      <div
                        key={element.id}
                        className="flex items-start space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => handleElementSelect(element.id)}
                      >
                        <Checkbox
                          checked={selectedElements?.includes(element.id)}
                          onCheckedChange={() => handleElementSelect(element.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm break-words">{element.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 