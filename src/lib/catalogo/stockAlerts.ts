/** Umbral por defecto cuando el ítem no define stock_minimo. */
export const DEFAULT_STOCK_ALERT_UMBRAL = 5;

/** Alerta cuando hay stock pero está en o por debajo del umbral. */
export function isLowStock(
  stock: number,
  stockMinimo?: number | null,
  defaultUmbral = DEFAULT_STOCK_ALERT_UMBRAL,
): boolean {
  if (!Number.isFinite(stock) || stock <= 0) return false;
  const umbral = stockMinimo ?? defaultUmbral;
  if (!Number.isFinite(umbral) || umbral < 0) return false;
  return stock <= umbral;
}

export function parseStockMinimo(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return Number.NaN;
  }
  return n;
}
