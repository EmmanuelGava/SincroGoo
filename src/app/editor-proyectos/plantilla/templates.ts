/**
 * Definiciones de plantillas predefinidas para el modo "Crear plantilla desde Sheet".
 * Cada plantilla incluye placeholders sugeridos, colores y layout.
 */

export interface PlantillaDef {
  id: string
  nombre: string
  descripcion: string
  placeholders: string[]
  /** Color de fondo en hex (ej: #FFFFFF) */
  bgColor: string
  /** Color de acento en hex */
  accentColor: string
  /** Color del texto principal */
  textColor: string
}

export const PLANTILLAS: PlantillaDef[] = [
  {
    id: 'catalogo_productos',
    nombre: 'Catálogo de productos',
    descripcion: 'Imagen grande arriba, nombre, precio y descripción. Ideal para productos.',
    placeholders: ['Nombre', 'Precio', 'Imagen', 'Descripción'],
    bgColor: '#FFFFFF',
    accentColor: '#22C55E',
    textColor: '#1F2937'
  },
  {
    id: 'ficha_cliente',
    nombre: 'Ficha de cliente / contacto',
    descripcion: 'Nombre destacado, datos de contacto a la izquierda, notas a la derecha.',
    placeholders: ['Nombre', 'Teléfono', 'Email', 'Dirección', 'Notas'],
    bgColor: '#FFFFFF',
    accentColor: '#3B82F6',
    textColor: '#1F2937'
  },
  {
    id: 'ficha_local',
    nombre: 'Ficha de local / establecimiento',
    descripcion: 'Nombre, dirección, teléfono, sitio web, calificación, reseñas, horarios e imagen.',
    placeholders: ['Nombre', 'Dirección', 'Teléfono', 'Sitio Web', 'Calificación', 'Total Reseñas', 'Horarios', 'imagen'],
    bgColor: '#1E1E2E',
    accentColor: '#FFFFFF',
    textColor: '#FFFFFF'
  },
  {
    id: 'propuesta_comercial',
    nombre: 'Propuesta comercial',
    descripcion: 'Logo/empresa arriba, servicio, precio y condiciones.',
    placeholders: ['Empresa', 'Servicio', 'Precio', 'Condiciones'],
    bgColor: '#FFFFFF',
    accentColor: '#8B5CF6',
    textColor: '#1F2937'
  },
  {
    id: 'reporte_simple',
    nombre: 'Reporte simple',
    descripcion: 'Título, datos clave en tabla y observaciones.',
    placeholders: ['Título', 'Dato1', 'Dato2', 'Observaciones'],
    bgColor: '#F8F9FA',
    accentColor: '#1F2937',
    textColor: '#1F2937'
  },
  {
    id: 'tarjeta_minimalista',
    nombre: 'Tarjeta minimalista',
    descripcion: 'Imagen a la izquierda, título y descripción a la derecha. Diseño limpio.',
    placeholders: ['Título', 'Subtítulo', 'Descripción', 'Imagen'],
    bgColor: '#FAFAFA',
    accentColor: '#0EA5E9',
    textColor: '#1E293B'
  },
  {
    id: 'portada',
    nombre: 'Portada',
    descripcion: 'Título centrado y subtítulo. Ideal como primera diapositiva.',
    placeholders: ['Título', 'Subtítulo'],
    bgColor: '#1E293B',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC'
  },
  {
    id: 'blanco',
    nombre: 'Plantilla en blanco',
    descripcion: 'Sin diseño. Diseñas desde cero en Google Slides.',
    placeholders: [],
    bgColor: '#FFFFFF',
    accentColor: '#6B7280',
    textColor: '#1F2937'
  }
]
