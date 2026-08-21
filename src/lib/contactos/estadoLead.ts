export function isEstadoTerminal(nombre: string): boolean {
  const normalized = nombre.trim().toLowerCase();
  return normalized === 'ganado' || normalized === 'perdido';
}
