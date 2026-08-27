import { describe, expect, it } from 'vitest';
import { DEFAULT_STOCK_ALERT_UMBRAL, isLowStock, parseStockMinimo } from '../stockAlerts';

describe('isLowStock', () => {
  it('alerta cuando stock está en el umbral', () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(6, 5)).toBe(false);
  });

  it('usa umbral por defecto si stock_minimo es null', () => {
    expect(isLowStock(DEFAULT_STOCK_ALERT_UMBRAL, null)).toBe(true);
    expect(isLowStock(DEFAULT_STOCK_ALERT_UMBRAL + 1, null)).toBe(false);
  });

  it('sin stock no es bajo stock (ya hay chip sin stock)', () => {
    expect(isLowStock(0, 5)).toBe(false);
  });
});

describe('parseStockMinimo', () => {
  it('normaliza vacío a null', () => {
    expect(parseStockMinimo('')).toBeNull();
    expect(parseStockMinimo(null)).toBeNull();
  });

  it('rechaza valores inválidos', () => {
    expect(parseStockMinimo(-1)).toBeNaN();
    expect(parseStockMinimo('x')).toBeNaN();
  });
});
