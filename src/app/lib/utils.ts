import { type ClassValue, clsx } from "clsx"

/**
 * Combina nombres de clase para usarlos con Material UI
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formatea un valor en formato de moneda
 */
export function formatCurrency(value: number, currency: string = "USD") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Formatea una fecha en formato legible
 */
export function formatDate(date: Date | string) {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Trunca un texto a una longitud específica
 */
export function truncateText(text: string, maxLength: number) {
  if (!text) return "";
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + "...";
}

/**
 * Genera un ID único
 */
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Retorna una versión con retraso (debounced) de una función
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

/**
 * Obtiene un valor de cookie por nombre
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return undefined;
}

/**
 * Convierte un objeto a parámetros de URL
 */
export function objectToQueryParams(obj: Record<string, any>): string {
  return Object.entries(obj)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}
