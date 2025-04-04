import { slides_v1 } from 'googleapis';
import { VistaPreviaDiapositiva } from '../types';
import { extraerTitulo, extraerElementos } from './elements';

export interface OpcionesMiniaturas {
  presentacionId: string;
  diapositivaIds?: string[];
  tamaño?: {
    ancho?: number;
    alto?: number;
  };
}

export async function obtenerMiniaturas(
  slides: slides_v1.Slides,
  opciones: OpcionesMiniaturas
): Promise<VistaPreviaDiapositiva[]> {
  const { presentacionId, diapositivaIds, tamaño } = opciones;

  // Obtener la presentación para acceder a las diapositivas
  const presentacion = await slides.presentations.get({
    presentationId: presentacionId
  });

  if (!presentacion.data.slides) {
    return [];
  }

  // Filtrar diapositivas si se especificaron IDs
  const diapositivasFiltradas = diapositivaIds 
    ? presentacion.data.slides.filter(slide => 
        diapositivaIds.includes(slide.objectId || ''))
    : presentacion.data.slides;

  // Obtener las miniaturas
  const thumbnailRequests = diapositivasFiltradas.map(slide => ({
    presentationId: presentacionId,
    pageObjectId: slide.objectId || '',
    thumbnailProperties: {
      thumbnailSize: 'LARGE',
      ...tamaño && {
        mimeType: 'PNG',
        width: tamaño.ancho,
        height: tamaño.alto
      }
    }
  }));

  const miniaturas = await Promise.all(
    thumbnailRequests.map(request => 
      slides.presentations.pages.getThumbnail(request)
    )
  );

  // Mapear los resultados
  return diapositivasFiltradas.map((slide, index) => ({
    id: slide.objectId || `slide-${index}`,
    titulo: extraerTitulo(slide) || `Diapositiva ${index + 1}`,
    urlImagen: miniaturas[index].data.contentUrl || '',
    indice: index,
    elementos: extraerElementos(slide)
  }));
}

export function construirUrlMiniatura(
  presentacionId: string, 
  diapositivaId: string,
  opciones: { ancho?: number; alto?: number } = {}
): string {
  const baseUrl = 'https://docs.google.com/presentation/d';
  const { ancho = 1600, alto = 900 } = opciones;
  
  return `${baseUrl}/${presentacionId}/export/png?id=${presentacionId}&pageid=${diapositivaId}&w=${ancho}&h=${alto}`;
}

export function construirUrlVistaPrevia(presentacionId: string): string {
  return `https://docs.google.com/presentation/d/${presentacionId}/preview`;
}

export function construirUrlEdicion(presentacionId: string): string {
  return `https://docs.google.com/presentation/d/${presentacionId}/edit`;
} 