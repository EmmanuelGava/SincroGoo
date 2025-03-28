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
  private readonly apiKey: string;

  private constructor() {
    super();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('API key no configurada');
    }
    this.apiKey = apiKey;
  }

  public static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
    }
    return GooglePlacesService.instance;
  }

  async buscarEstablecimientos(query: string, lat: number, lng: number, radio: number): Promise<Lugar[]> {
    try {
      let todosLosResultados: any[] = [];
      let pageToken: string | undefined;
      let intentos = 0;
      const maxIntentos = 3; // Máximo 3 páginas (60 resultados)

      do {
        const url = new URL('/api/places/search', window.location.origin);
        url.searchParams.append('query', query);
        url.searchParams.append('lat', lat.toString());
        url.searchParams.append('lng', lng.toString());
        url.searchParams.append('radius', radio.toString());
        if (pageToken) {
          url.searchParams.append('pageToken', pageToken);
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al buscar establecimientos');
        }

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error('Error en la respuesta de Google Places');
        }

        if (data.results) {
          // Obtener detalles completos para cada resultado
          const resultadosDetallados = await Promise.all(
            data.results.map(async (lugar: any) => {
              try {
                const detallesResponse = await fetch(`/api/places/details?placeId=${lugar.place_id}`);
                const detallesData = await detallesResponse.json();
                
                if (detallesData.status === 'OK') {
                  return detallesData.result;
                }
                return lugar; // Si falla, usar el resultado básico
              } catch (error) {
                console.error('Error al obtener detalles del lugar:', error);
                return lugar; // Si falla, usar el resultado básico
              }
            })
          );
          
          todosLosResultados = todosLosResultados.concat(resultadosDetallados);
        }

        pageToken = data.next_page_token;
        intentos++;

        // Si hay más páginas, esperamos 2 segundos antes de la siguiente llamada
        if (pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (pageToken && intentos < maxIntentos);

      console.log('Total de resultados encontrados:', todosLosResultados.length);

      return todosLosResultados.map((lugar: any) => this.transformarLugarDetallado(lugar));
    } catch (error) {
      console.error('Error al buscar establecimientos:', error);
      throw error;
    }
  }

  async obtenerDetallesLugar(placeId: string): Promise<Lugar> {
    try {
      const response = await fetch(`/api/places/details?placeId=${placeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener detalles del lugar');
      }

      if (data.status !== 'OK') {
        throw new Error('Error en la respuesta de Google Places');
      }

      console.log('Detalles del lugar:', data);

      // Asegurarnos de que tenemos todos los datos necesarios
      const lugarDetallado = this.transformarLugarDetallado(data.result);
      console.log('Lugar transformado:', lugarDetallado);

      return lugarDetallado;
    } catch (error) {
      console.error('Error al obtener detalles del lugar:', error);
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