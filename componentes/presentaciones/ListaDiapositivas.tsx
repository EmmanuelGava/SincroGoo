"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GripVertical, Eye, Edit2, Copy, Trash2 } from 'lucide-react';
import { VistaPreviaDiapositiva } from '@/tipos/diapositivas';

// Clave para el almacenamiento local de miniaturas
const THUMBNAIL_CACHE_KEY = 'thumbnail_cache';

// Función para obtener la caché de miniaturas
const getThumbnailCache = () => {
  if (typeof window === 'undefined') return {};
  
  try {
    const cache = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (cache) {
      return JSON.parse(cache);
    }
  } catch (error) {
    console.error('Error al obtener caché de miniaturas:', error);
  }
  
  return {};
};

// Definir tipos para drag and drop
// Nota: Necesitarás instalar @hello-pangea/dnd con: npm install @hello-pangea/dnd
interface DragStart {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
}

interface DropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
}

interface DraggableProvided {
  draggableProps: any;
  dragHandleProps: any;
  innerRef: (element: HTMLElement | null) => void;
}

interface DroppableProvided {
  droppableProps: any;
  innerRef: (element: HTMLElement | null) => void;
  placeholder: React.ReactNode;
}

interface DraggableStateSnapshot {
  isDragging: boolean;
  isDropAnimating: boolean;
  draggingOver: string | null;
  dropAnimation: any | null;
}

interface ListaDiapositivasProps {
  diapositivas: VistaPreviaDiapositiva[];
  diapositivaSeleccionada: string | null;
  alSeleccionar: (id: string) => void;
  cargando?: boolean;
}

export function ListaDiapositivas({
  diapositivas,
  diapositivaSeleccionada,
  alSeleccionar,
  cargando = false
}: ListaDiapositivasProps) {
  // Estado para la caché de miniaturas
  const [thumbnailCache, setThumbnailCache] = useState<{[key: string]: {dataUrl: string, timestamp: number}}>({});

  // Cargar caché de miniaturas al montar el componente
  useEffect(() => {
    setThumbnailCache(getThumbnailCache());
  }, []);

  // Memorizar las diapositivas para evitar re-renderizaciones innecesarias
  const diapositivasMemoizadas = useMemo(() => {
    return diapositivas.map(diapositiva => {
      // Verificar si la miniatura está en caché
      const cacheKey = diapositiva.urlImagen;
      const cachedThumbnail = thumbnailCache[cacheKey];
      
      return {
        ...diapositiva,
        // Usar la versión en caché si está disponible
        urlImagenCached: cachedThumbnail?.dataUrl || diapositiva.urlImagen
      };
    });
  }, [diapositivas, thumbnailCache]);

  // Función para manejar la carga de imágenes
  const manejarCargaImagen = (id: string) => {
    // Solo registrar la carga exitosa sin actualizar el estado para evitar re-renderizaciones
    console.log(`Imagen cargada correctamente: ${id}`);
  }

  // Función para manejar errores de carga de imágenes
  const manejarErrorImagen = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: string) => {
    console.warn(`Error al cargar la imagen para la diapositiva ${id}`);
    // Establecer una imagen de fallback sin actualizar el estado
    const target = e.target as HTMLImageElement;
    if (target.src !== '/placeholder-slide.png') {
      target.src = '/placeholder-slide.png';
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (diapositivas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No hay diapositivas disponibles</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[65vh]">
      <div className="grid grid-cols-2 gap-3 p-1">
        {diapositivasMemoizadas.map((diapositiva) => (
          <div
            key={diapositiva.id}
            className={`
              rounded-lg border p-2 cursor-pointer transition-all
              ${diapositivaSeleccionada === diapositiva.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}
            `}
            onClick={() => alSeleccionar(diapositiva.id)}
          >
            <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
              {diapositiva.urlImagen && (
                <img
                  src={diapositiva.urlImagenCached || diapositiva.urlImagen}
                  alt={diapositiva.titulo}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={() => manejarCargaImagen(diapositiva.id)}
                  onError={(e) => manejarErrorImagen(e, diapositiva.id)}
                />
              )}
            </div>
            <p className="text-sm font-medium truncate">{diapositiva.titulo}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
} 