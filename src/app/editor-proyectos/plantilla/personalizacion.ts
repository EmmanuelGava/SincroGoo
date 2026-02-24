/**
 * Configuración de personalización para plantillas.
 * Se aplica antes de la generación de slides.
 */

export const FUENTES_DISPONIBLES = [
  { id: 'Roboto', nombre: 'Roboto', fontFamily: 'Roboto, sans-serif' },
  { id: 'Montserrat', nombre: 'Montserrat', fontFamily: '"Montserrat", sans-serif' },
  { id: 'Playfair Display', nombre: 'Playfair Display', fontFamily: '"Playfair Display", serif' },
  { id: 'Lato', nombre: 'Lato', fontFamily: 'Lato, sans-serif' },
  { id: 'Oswald', nombre: 'Oswald', fontFamily: 'Oswald, sans-serif' }
] as const

export type FontId = (typeof FUENTES_DISPONIBLES)[number]['id']

export const PALETAS_COLOR = [
  {
    id: 'oscuro_profesional',
    nombre: 'Oscuro profesional',
    fondo: '#1a1a2e',
    texto: '#ffffff',
    acento: '#7c3aed'
  },
  {
    id: 'blanco_limpio',
    nombre: 'Blanco limpio',
    fondo: '#ffffff',
    texto: '#1f2937',
    acento: '#2563eb'
  },
  {
    id: 'verde_naturaleza',
    nombre: 'Verde naturaleza',
    fondo: '#f0fdf4',
    texto: '#14532d',
    acento: '#16a34a'
  },
  {
    id: 'naranja_energia',
    nombre: 'Naranja energía',
    fondo: '#fff7ed',
    texto: '#431407',
    acento: '#ea580c'
  },
  {
    id: 'azul_corporativo',
    nombre: 'Azul corporativo',
    fondo: '#eff6ff',
    texto: '#1e3a5f',
    acento: '#1d4ed8'
  },
  {
    id: 'rosa_moderno',
    nombre: 'Rosa moderno',
    fondo: '#fdf2f8',
    texto: '#500724',
    acento: '#db2777'
  },
  {
    id: 'gris_minimalista',
    nombre: 'Gris minimalista',
    fondo: '#f9fafb',
    texto: '#111827',
    acento: '#374151'
  },
  {
    id: 'negro_premium',
    nombre: 'Negro premium',
    fondo: '#0f0f0f',
    texto: '#f5f5f5',
    acento: '#fbbf24'
  }
] as const

export type PosicionLogo = 'superior_izquierda' | 'superior_derecha' | 'inferior_izquierda' | 'inferior_derecha'

export type CondicionFiltro = 'contiene' | 'igual' | 'mayor_que' | 'menor_que'

export interface PersonalizacionState {
  fontFamily: FontId
  paletaId: string
  logo?: {
    url: string
    posicion: PosicionLogo
  }
  portada?: {
    activa: boolean
    titulo: string
    subtitulo: string
  }
  ordenamiento?: {
    columna: string
    direccion: 'ASC' | 'DESC'
  }
  filtro?: {
    activo: boolean
    columna: string
    condicion: CondicionFiltro
    valor: string
  }
}

export const PERSONALIZACION_DEFAULT: PersonalizacionState = {
  fontFamily: 'Roboto',
  paletaId: 'blanco_limpio',
  portada: { activa: false, titulo: '', subtitulo: '' },
  filtro: { activo: false, columna: '', condicion: 'igual', valor: '' }
}

export function getColoresFromPaleta(paletaId: string) {
  const p = PALETAS_COLOR.find((x) => x.id === paletaId)
  return p ?? PALETAS_COLOR[1] // blanco_limpio
}
