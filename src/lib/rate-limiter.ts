// Rate limiter simple en memoria
const requests = new Map<string, number[]>();

// Configuración del rate limiter
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 60; // 60 requests por minuto

export function canMakeRequest(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  
  // Limpiar requests antiguos
  const timestamps = requests.get(key) || [];
  const recentTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
  requests.set(key, recentTimestamps);
  
  return recentTimestamps.length < MAX_REQUESTS;
}

export function recordRequest(key: string): void {
  const timestamps = requests.get(key) || [];
  timestamps.push(Date.now());
  requests.set(key, timestamps);
}

export async function waitForRateLimit(key: string): Promise<void> {
  while (!canMakeRequest(key)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  recordRequest(key);
} 