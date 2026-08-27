export function isEstadoTerminal(nombre: string): boolean {
  const normalized = nombre.trim().toLowerCase();
  return normalized === 'ganado' || normalized === 'perdido';
}

export function isEstadoGanado(nombre: string): boolean {
  return nombre.trim().toLowerCase() === 'ganado';
}

export function isEstadoPerdido(nombre: string): boolean {
  return nombre.trim().toLowerCase() === 'perdido';
}

export const MOTIVOS_PERDIDO = [
  'competencia',
  'no_contesto',
  'precio',
  'no_era_momento',
  'otro',
] as const;

export type MotivoPerdido = (typeof MOTIVOS_PERDIDO)[number];

export const MOTIVO_PERDIDO_LABEL: Record<MotivoPerdido, string> = {
  competencia: 'Competencia',
  no_contesto: 'No contestó',
  precio: 'Precio',
  no_era_momento: 'No era el momento',
  otro: 'Otro',
};

export function isMotivoPerdido(value: unknown): value is MotivoPerdido {
  return MOTIVOS_PERDIDO.includes(String(value) as MotivoPerdido);
}
