import { BaseGoogleService } from '../core/BaseGoogleService';

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

export interface UbicacionSugerida {
  description: string;
  place_id: string;
}

export class ExplorerPlacesService extends BaseGoogleService {
  private static _instance: ExplorerPlacesService;
  private apiKey: string;
  protected serviceName = 'Places API';
  protected requiredScopes = ['https://www.googleapis.com/auth/places'];

  private constructor(accessToken?: string) {
    super(accessToken || '');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn('Google Places API Key no configurada. El explorador no funcionará correctamente.');
    }
    this.apiKey = apiKey || '';
  }

  public static getInstance(accessToken?: string): ExplorerPlacesService {
    if (!ExplorerPlacesService._instance || accessToken) {
      ExplorerPlacesService._instance = new ExplorerPlacesService(accessToken);
    }
    return ExplorerPlacesService._instance;
  }

  private validateApiKey() {
    if (!this.apiKey) {
      throw new Error('La API key de Google Places no está configurada. Por favor, configura NEXT_PUBLIC_GOOGLE_PLACES_API_KEY en las variables de entorno.');
    }
  }

  public async buscarEstablecimientos(query: string, lat: number, lng: number, radio: number): Promise<Lugar[]> {
    this.validateApiKey();
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radio}&key=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al buscar establecimientos');
      }

      const data = await response.json();
      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Error al buscar establecimientos');
      }

      return data.results.map((lugar: any) => this.transformarLugarBasico(lugar));
    } catch (error) {
      console.error('Error en buscarEstablecimientos:', error);
      throw error;
    }
  }

  public async obtenerDetallesLugar(placeId: string): Promise<Lugar> {
    this.validateApiKey();
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}&` +
        `key=${this.apiKey}&` +
        `fields=name,formatted_address,geometry,formatted_phone_number,international_phone_number,` +
        `website,url,opening_hours,rating,user_ratings_total,price_level,photos,types`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener detalles del lugar');
      }

      const data = await response.json();
      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Error al obtener detalles del lugar');
      }

      console.log('Datos recibidos de la API:', data.result); // Para debugging
      return this.transformarLugarDetallado(data.result);
    } catch (error) {
      console.error('Error en obtenerDetallesLugar:', error);
      throw error;
    }
  }

  public async obtenerSugerenciasUbicacion(input: string): Promise<UbicacionSugerida[]> {
    this.validateApiKey();
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener sugerencias de ubicación');
      }

      const data = await response.json();
      if (data.status !== 'OK') {
        throw new Error(data.error_message || 'Error al obtener sugerencias de ubicación');
      }

      return data.predictions.map((prediction: any) => ({
        description: prediction.description,
        place_id: prediction.place_id
      }));
    } catch (error) {
      console.error('Error en obtenerSugerenciasUbicacion:', error);
      throw error;
    }
  }

  protected async fetch(url: string) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Google-Api-Key': this.apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error HTTP: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error en fetch:', error);
      throw new Error('Error al realizar la petición a Places API');
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
    console.log('Transformando lugar:', lugar); // Para debugging

    // Manejar el teléfono
    let telefono = lugar.formatted_phone_number;
    if (!telefono && lugar.international_phone_number) {
      telefono = lugar.international_phone_number;
    }

    // Manejar el sitio web
    let website = lugar.website;
    if (!website && lugar.url) {
      website = lugar.url;
    }

    // Manejar los horarios
    let horarios: string[] = [];
    if (lugar.opening_hours?.weekday_text) {
      horarios = lugar.opening_hours.weekday_text;
    }

    // Manejar los tipos
    let tipos: string[] = [];
    if (lugar.types) {
      tipos = lugar.types.map((tipo: string) => {
        // Convertir snake_case a palabras
        return tipo.split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      });
    }

    const lugarTransformado = {
      id: lugar.place_id,
      nombre: lugar.name || 'Sin nombre',
      direccion: lugar.formatted_address || 'Dirección no disponible',
      telefono: telefono || 'No disponible',
      website: website || 'No disponible',
      horarios,
      rating: lugar.rating,
      totalRatings: lugar.user_ratings_total,
      tipos,
      nivelPrecio: lugar.price_level,
      fotos: lugar.photos?.map((foto: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${foto.photo_reference}&key=${this.apiKey}`
      ),
      latitud: lugar.geometry.location.lat,
      longitud: lugar.geometry.location.lng,
      completitud: this.calcularPuntuacionCompletitud(lugar)
    };

    console.log('Lugar transformado:', lugarTransformado); // Para debugging
    return lugarTransformado;
  }

  private calcularPuntuacionCompletitud(lugar: any): number {
    let puntuacion = 0;
    const maxPuntuacion = 6;

    if (lugar.name) puntuacion += 2;
    if (lugar.formatted_address) puntuacion += 2;
    if (lugar.geometry?.location) puntuacion += 2;

    if (lugar.formatted_phone_number || lugar.international_phone_number) puntuacion += 0.5;
    if (lugar.website) puntuacion += 0.5;
    if (lugar.opening_hours?.weekday_text?.length > 0) puntuacion += 0.5;
    if (lugar.rating) puntuacion += 0.5;
    if (lugar.photos?.length > 0) puntuacion += 0.5;
    if (lugar.price_level !== undefined) puntuacion += 0.5;

    return Math.min((puntuacion / maxPuntuacion) * 100, 100);
  }
} 