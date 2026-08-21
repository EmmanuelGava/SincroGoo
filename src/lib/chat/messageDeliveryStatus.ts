export type DeliveryEstado = 'enviando' | 'enviado' | 'entregado' | 'leido' | 'error';

const DELIVERY_RANK: Record<string, number> = {
  enviando: 0,
  pendiente: 0,
  enviado: 1,
  entregado: 2,
  leido: 3,
  error: 99,
};

export function mapBaileysAckToEstado(
  status: number | undefined | null
): Exclude<DeliveryEstado, 'enviando'> | null {
  switch (status) {
    case 0:
      return 'error';
    case 2:
      return 'enviado';
    case 3:
      return 'entregado';
    case 4:
    case 5:
      return 'leido';
    default:
      return null;
  }
}

export function canAdvanceDeliveryStatus(
  current: string | null | undefined,
  next: string
): boolean {
  const from = DELIVERY_RANK[current || 'enviando'] ?? 0;
  const to = DELIVERY_RANK[next] ?? 0;
  if (from >= 99) return false;
  if (next === 'error') return from < 2;
  return to > from;
}

export function resolveDisplayEstado(
  estado: string | undefined,
  messageId?: string
): string {
  if (String(messageId || '').startsWith('temp-')) {
    return estado && estado !== 'enviado' ? estado : 'enviando';
  }
  return estado || 'enviado';
}

