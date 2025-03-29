import { ServicioApi } from '@/app/servicios/google/api';
import { getSession } from 'next-auth/react';

export interface Lugar {
  id: string;
  nombre: string;
  direccion: string;
  telefono?: string;
  sitioWeb?: string;
  horarios?: string[];
  puntuacion?: number;
  totalPuntuaciones?: number;
  nivelPrecio?: number;
  fotos?: string[];
  latitud: number;
  longitud: number;
  completitud: number;
}

export class GooglePlacesService extends ServicioApi {
  private static instance: GooglePlacesService;
  private apiKey: string;

  private constructor() {
    super();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn('Google Places API Key no configurada. El explorador no funcionará correctamente.');
    }
    this.apiKey = apiKey || '';
  }

  public static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
    }
    return GooglePlacesService.instance;
  }

  private validateApiKey() {
    if (!this.apiKey) {
      throw new Error('La API key de Google Places no está configurada. Por favor, configura NEXT_PUBLIC_GOOGLE_PLACES_API_KEY en las variables de entorno.');
    }
  }

  public async buscarEstablecimientos(query: string, lat: number, lng: number, radio: number): Promise<Lugar[]> {
    this.validateApiKey();
    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(query)}&lat=${lat}&lng=${lng}&radius=${radio}`);
      if (!response.ok) {
        throw new Error('Error al buscar establecimientos');
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error en buscarEstablecimientos:', error);
      throw error;
    }
  }

  public async obtenerDetallesLugar(placeId: string): Promise<Lugar> {
    this.validateApiKey();
    try {
      const response = await fetch(`/api/places/details?place_id=${placeId}`);
      if (!response.ok) {
        throw new Error('Error al obtener detalles del lugar');
      }
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error en obtenerDetallesLugar:', error);
      throw error;
    }
  }

  private transformarLugarBasico(lugar: any): Lugar {
    const puntuacion = this.calcularPuntuacionCompletitud(lugar);

    return {
      id: lugar.place_id,
      nombre: lugar.name || 'Sin nombre',
      direccion: lugar.formatted_address || 'Dirección no disponible',
      latitud: lugar.geometry.location.lat,
      longitud: lugar.geometry.location.lng,
      puntuacion: lugar.rating,
      totalPuntuaciones: lugar.user_ratings_total,
      telefono: lugar.formatted_phone_number || lugar.international_phone_number || 'No disponible',
      sitioWeb: lugar.website || '',
      horarios: lugar.opening_hours?.weekday_text || [],
      completitud: puntuacion
    };
  }

  private transformarLugarDetallado(lugar: any): Lugar {
    const puntuacion = this.calcularPuntuacionCompletitud(lugar);
    const horarios = lugar.opening_hours?.weekday_text || [];

    // Obtener el teléfono en el formato correcto
    let telefono = lugar.formatted_phone_number;
    if (!telefono && lugar.international_phone_number) {
      telefono = lugar.international_phone_number;
    }
    if (!telefono && lugar.phone_number) {
      telefono = lugar.phone_number;
    }
    // Si no hay teléfono, usar 'No disponible'
    if (!telefono) {
      telefono = 'No disponible';
    }

    // Obtener el sitio web
    let sitioWeb = lugar.website;
    if (!sitioWeb && lugar.url) {
      sitioWeb = lugar.url;
    }
    // Si no hay sitio web, usar 'No disponible'
    if (!sitioWeb) {
      sitioWeb = 'No disponible';
    }

    const lugarTransformado = {
      id: lugar.place_id,
      nombre: lugar.name || 'Sin nombre',
      direccion: lugar.formatted_address || 'Dirección no disponible',
      telefono,
      sitioWeb,
      horarios,
      puntuacion: lugar.rating,
      totalPuntuaciones: lugar.user_ratings_total,
      nivelPrecio: lugar.price_level,
      fotos: lugar.photos?.map((foto: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${foto.photo_reference}&key=${this.apiKey}`
      ),
      latitud: lugar.geometry.location.lat,
      longitud: lugar.geometry.location.lng,
      completitud: puntuacion
    };

    console.log('Lugar transformado final:', lugarTransformado);
    return lugarTransformado;
  }

  private calcularPuntuacionCompletitud(lugar: any): number {
    let puntuacion = 0;
    const maxPuntuacion = 6; // Puntuación máxima posible

    // Datos básicos (3 puntos cada uno)
    if (lugar.name) puntuacion += 2;
    if (lugar.formatted_address) puntuacion += 2;
    if (lugar.geometry?.location) puntuacion += 2;

    // Datos adicionales (0.5 puntos cada uno)
    if (lugar.formatted_phone_number || lugar.international_phone_number) puntuacion += 0.5;
    if (lugar.website) puntuacion += 0.5;
    if (lugar.opening_hours?.weekday_text?.length > 0) puntuacion += 0.5;
    if (lugar.rating) puntuacion += 0.5;
    if (lugar.photos?.length > 0) puntuacion += 0.5;
    if (lugar.price_level !== undefined) puntuacion += 0.5;

    // Asegurar que no exceda el 100%
    return Math.min((puntuacion / maxPuntuacion) * 100, 100);
  }
} 