import { PostgrestFilterBuilder, PostgrestBuilder, PostgrestTransformBuilder } from '@supabase/postgrest-js';
import { QueryOptions, FilterOptions } from '../types/common';
import { createServiceError, ErrorType } from './error-handler';

/**
 * Operadores de filtro soportados
 */
export type FilterOperator = 
  | 'eq'    // igual
  | 'neq'   // no igual
  | 'gt'    // mayor que
  | 'gte'   // mayor o igual que
  | 'lt'    // menor que
  | 'lte'   // menor o igual que
  | 'like'  // coincidencia de texto
  | 'ilike' // coincidencia de texto (case insensitive)
  | 'in'    // dentro de array
  | 'contains' // contiene
  | 'containedBy' // contenido por
  | 'overlap' // superposición de arrays
  | 'textSearch' // búsqueda de texto completo
  | 'match'  // coincidencia exacta de objeto;

/**
 * Tipo para valores de filtro
 */
export type FilterValue = string | number | boolean | Array<any> | Record<string, any>;

/**
 * Tipo para operadores de filtro
 */
export type FilterCondition = {
  operator: FilterOperator;
  value: FilterValue;
};

/**
 * Aplica un filtro individual a una consulta
 */
function applyFilter<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  field: string,
  condition: FilterCondition | FilterValue
): PostgrestFilterBuilder<any, any, T[]> {
  // Si es un valor directo, usar eq
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    return query.eq(field, condition === null ? '' : String(condition));
  }

  // Si es una condición con operador
  const { operator, value } = condition as FilterCondition;

  switch (operator) {
    case 'eq':
      return query.eq(field, String(value));
    case 'neq':
      return query.neq(field, String(value));
    case 'gt':
      return query.gt(field, String(value));
    case 'gte':
      return query.gte(field, String(value));
    case 'lt':
      return query.lt(field, String(value));
    case 'lte':
      return query.lte(field, String(value));
    case 'like':
      return query.like(field, `%${value}%`);
    case 'ilike':
      return query.ilike(field, `%${value}%`);
    case 'in':
      if (!Array.isArray(value)) {
        throw createServiceError(
          `El valor para el operador 'in' debe ser un array`,
          ErrorType.VALIDATION
        );
      }
      return query.in(field, value.map(String));
    case 'contains':
      return query.contains(field, String(value));
    case 'containedBy':
      return query.containedBy(field, value as any[]);
    case 'overlap':
      if (!Array.isArray(value)) {
        throw createServiceError(
          `El valor para el operador 'overlap' debe ser un array`,
          ErrorType.VALIDATION
        );
      }
      return query.overlaps(field, value);
    case 'textSearch':
      return query.textSearch(field, String(value));
    case 'match':
      return query.match({ [field]: value });
    default:
      throw createServiceError(
        `Operador de filtro '${operator}' no soportado`,
        ErrorType.VALIDATION
      );
  }
}

/**
 * Aplica opciones de consulta estándar a una consulta de Supabase
 * @param query Consulta base de Supabase
 * @param options Opciones de consulta
 * @returns Consulta con opciones aplicadas
 */
export function applyQueryOptions<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  options?: QueryOptions
): PostgrestFilterBuilder<any, any, T[]> {
  let modifiedQuery = query;
  
  // Aplicar filtros si existen
  if (options?.filters) {
    Object.entries(options.filters).forEach(([field, condition]) => {
      if (condition !== undefined) {
        modifiedQuery = applyFilter(modifiedQuery, field, condition);
      }
    });
  }
  
  // Aplicar búsqueda de texto si está definida
  if (options?.search?.trim()) {
    const searchFields = ['nombre', 'titulo', 'descripcion']; // Campos por defecto para búsqueda
    const searchTerm = options.search.trim();
    
    // Crear condición OR para cada campo
    const searchConditions = searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(',');
    modifiedQuery = modifiedQuery.or(searchConditions) as PostgrestFilterBuilder<any, any, T[]>;
  }
  
  // Aplicar ordenamiento
  if (options?.orderBy) {
    const direction = options?.orderDirection || 'asc';
    modifiedQuery = modifiedQuery.order(options.orderBy, { ascending: direction === 'asc' });
  }
  
  // Aplicar paginación
  if (options?.page !== undefined && options?.pageSize !== undefined) {
    if (options.page < 1 || options.pageSize < 1) {
      throw createServiceError(
        'Los valores de paginación deben ser mayores a 0',
        ErrorType.VALIDATION
      );
    }
    modifiedQuery = applyPagination(modifiedQuery, options.page, options.pageSize);
  }
  
  return modifiedQuery;
}

/**
 * Función auxiliar para crear un rango de páginas
 * @param query Consulta base de Supabase
 * @param page Número de página (empezando en 1)
 * @param pageSize Tamaño de página
 * @returns Consulta con rango aplicado
 */
export function applyPagination<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  page: number,
  pageSize: number
): PostgrestFilterBuilder<any, any, T[]> {
  const start = (page - 1) * pageSize;
  return query.range(start, start + pageSize - 1);
}

/**
 * Función auxiliar para ordenar resultados
 * @param query Consulta base de Supabase
 * @param field Campo por el que ordenar
 * @param ascending Dirección de ordenamiento (true para ascendente)
 * @returns Consulta con ordenamiento aplicado
 */
export function applyOrder<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  field: string,
  ascending: boolean = true
): PostgrestFilterBuilder<any, any, T[]> {
  return query.order(field, { ascending });
}

/**
 * Función auxiliar para contar resultados
 */
export async function getCount<T>(
  query: PostgrestFilterBuilder<any, any, T[]>
): Promise<number> {
  const { data } = await query.select();
  return data?.length || 0;
}

/**
 * Función auxiliar para seleccionar campos específicos
 * @param query Consulta base de Supabase
 * @param fields Campos a seleccionar
 * @returns Consulta con select aplicado
 */
export function selectFields<T>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  fields: string[]
): PostgrestTransformBuilder<any, any, T[]> {
  return query.select(fields.join(','));
} 