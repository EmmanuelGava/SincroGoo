import { Establecimiento, FiltrosBusqueda } from '../tipos';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:suburb'?: string;
    'contact:phone'?: string;
    phone?: string;
    'contact:website'?: string;
    website?: string;
    opening_hours?: string;
    [key: string]: string | undefined;
  };
}

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Mapeo de rubros a etiquetas de OSM con búsqueda más flexible
const RUBROS_OSM: { [key: string]: string[] } = {
  restaurant: ['amenity=restaurant'],
  cafe: ['amenity=cafe'],
  pharmacy: ['amenity=pharmacy'],
  supermarket: ['shop=supermarket'],
  bank: ['amenity=bank'],
  soccer: ['leisure=pitch', 'sport=soccer'],
  tennis: ['leisure=pitch', 'sport=tennis'],
  paddle: ['leisure=pitch', 'sport=padel'],
  sports_club: ['leisure=sports_centre']
};

export class PlacesService {
  static async buscarEstablecimientos(filtros: FiltrosBusqueda): Promise<Establecimiento[]> {
    try {
      const rubroTags = RUBROS_OSM[filtros.rubro] || [];
      const radio = filtros.radio * 1000; // convertir a metros
      
      // Construir la consulta Overpass QL con una sintaxis más robusta
      let query = `
        [out:json][timeout:25];
        (`;
      
      // Agregar múltiples condiciones para deportes
      if (filtros.rubro.startsWith('soccer') || filtros.rubro.startsWith('tennis') || filtros.rubro.startsWith('paddle')) {
        query += `
          nwr["leisure"="pitch"]["sport"="${rubroTags[1].split('=')[1]}"](around:${radio},${filtros.latitud},${filtros.longitud});
          nwr["leisure"="sports_centre"]["sport"="${rubroTags[1].split('=')[1]}"](around:${radio},${filtros.latitud},${filtros.longitud});
        `;
      } else if (filtros.rubro === 'sports_club') {
        query += `
          nwr["leisure"="sports_centre"](around:${radio},${filtros.latitud},${filtros.longitud});
        `;
      } else {
        query += `
          nwr[${rubroTags[0]}](around:${radio},${filtros.latitud},${filtros.longitud});
        `;
      }
      
      query += `
        );
        out body center;
      `.trim();

      console.log('Query Overpass:', query);

      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta de Overpass API: ${response.status}`);
      }

      const data = await response.json();
      console.log('Respuesta de Overpass:', data);

      if (!data.elements || data.elements.length === 0) {
        console.log('No se encontraron resultados para la búsqueda');
        return [];
      }

      // Filtrar por texto si se especificó
      let elementos = data.elements as OverpassElement[];
      if (filtros.texto) {
        const textoLower = filtros.texto.toLowerCase();
        elementos = elementos.filter((element: OverpassElement) => 
          element.tags?.name?.toLowerCase().includes(textoLower) ||
          element.tags?.['addr:street']?.toLowerCase().includes(textoLower)
        );
      }

      // Ordenar elementos por completitud de datos
      elementos.sort((a, b) => {
        const puntuacionA = this.calcularPuntuacionCompletitud(a);
        const puntuacionB = this.calcularPuntuacionCompletitud(b);
        return puntuacionB - puntuacionA; // Orden descendente
      });

      // Transformar los resultados al formato de nuestra aplicación
      return elementos.map((element: any) => {
        const nombre = element.tags?.name || element.tags?.['operator'] || element.tags?.['brand'] || 'Establecimiento sin nombre';
        const direccion = this.obtenerDireccion(element.tags);
        const telefono = element.tags?.['contact:phone'] || element.tags?.phone || element.tags?.['phone'] || 'Teléfono no disponible';
        const puntuacionCompletitud = this.calcularPuntuacionCompletitud(element);
        
        return {
          id: element.id.toString(),
          nombre,
          direccion,
          telefono,
          latitud: element.lat || element.center?.lat,
          longitud: element.lon || element.center?.lon,
          sitioWeb: element.tags?.['contact:website'] || element.tags?.website || element.tags?.['website'] || '',
          horarios: element.tags?.opening_hours ? this.parseOpeningHours(element.tags.opening_hours) : {},
          puntuacionCompletitud
        };
      });
    } catch (error) {
      console.error('Error al buscar establecimientos:', error);
      return [];
    }
  }

  private static obtenerDireccion(tags: any): string {
    if (!tags) return 'Dirección no disponible';

    const calle = tags['addr:street'] || '';
    const numero = tags['addr:housenumber'] || '';
    const ciudad = tags['addr:city'] || '';
    const barrio = tags['addr:suburb'] || '';

    if (calle && numero) {
      return `${calle} ${numero}${ciudad ? `, ${ciudad}` : ''}${barrio ? ` (${barrio})` : ''}`;
    } else if (calle) {
      return `${calle}${ciudad ? `, ${ciudad}` : ''}${barrio ? ` (${barrio})` : ''}`;
    } else if (barrio) {
      return `${barrio}${ciudad ? `, ${ciudad}` : ''}`;
    } else if (ciudad) {
      return ciudad;
    }

    return 'Dirección no disponible';
  }

  static async obtenerDetallesEstablecimiento(id: string): Promise<Establecimiento> {
    try {
      const query = `
        [out:json][timeout:25];
        (
          node(${id});
          way(${id});
          relation(${id});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        body: query
      });

      const data = await response.json();
      const element = data.elements[0];

      return {
        id: element.id.toString(),
        nombre: element.tags.name || 'Sin nombre',
        direccion: element.tags['addr:street'] 
          ? `${element.tags['addr:street']} ${element.tags['addr:housenumber'] || ''}`
          : 'Dirección no disponible',
        telefono: element.tags.phone || 'Teléfono no disponible',
        latitud: element.lat,
        longitud: element.lon,
        sitioWeb: element.tags.website || '',
        horarios: element.tags.opening_hours ? this.parseOpeningHours(element.tags.opening_hours) : {},
        puntuacionCompletitud: this.calcularPuntuacionCompletitud(element)
      };
    } catch (error) {
      console.error('Error al obtener detalles del establecimiento:', error);
      throw error;
    }
  }

  private static parseOpeningHours(openingHours: string): { [key: string]: string } {
    // Formato de ejemplo: "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off"
    const days: { [key: string]: string } = {
      Mo: 'Lunes',
      Tu: 'Martes',
      We: 'Miércoles',
      Th: 'Jueves',
      Fr: 'Viernes',
      Sa: 'Sábado',
      Su: 'Domingo'
    };

    const horarios: { [key: string]: string } = {};
    const partes = openingHours.split(';');

    partes.forEach(parte => {
      const [dias, horas] = parte.trim().split(' ');
      if (dias.includes('-')) {
        const [inicio, fin] = dias.split('-');
        const diasArray = Object.keys(days);
        const inicioIndex = diasArray.indexOf(inicio);
        const finIndex = diasArray.indexOf(fin);

        for (let i = inicioIndex; i <= finIndex; i++) {
          horarios[days[diasArray[i]]] = horas;
        }
      } else {
        horarios[days[dias]] = horas;
      }
    });

    return horarios;
  }

  private static calcularPuntuacionCompletitud(element: any): number {
    let puntuacion = 0;
    const tags = element.tags || {};

    // Nombre (3 puntos)
    if (tags.name) puntuacion += 3;
    else if (tags.operator || tags.brand) puntuacion += 2;

    // Dirección (3 puntos)
    if (tags['addr:street']) puntuacion += 2;
    if (tags['addr:housenumber']) puntuacion += 1;
    if (tags['addr:city']) puntuacion += 1;
    if (tags['addr:suburb']) puntuacion += 1;

    // Contacto (2 puntos)
    if (tags.phone || tags['contact:phone']) puntuacion += 1;
    if (tags.website || tags['contact:website']) puntuacion += 1;

    // Horarios (2 puntos)
    if (tags.opening_hours) puntuacion += 2;

    // Detalles adicionales
    if (tags.description) puntuacion += 1;
    if (tags.email || tags['contact:email']) puntuacion += 1;
    if (tags.wheelchair) puntuacion += 1;
    if (tags.capacity) puntuacion += 1;

    return puntuacion;
  }
} 