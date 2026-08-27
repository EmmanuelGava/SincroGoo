import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  extractStockDeduction,
  stripStockDeduction,
  toastStockDeduction,
} from '../stockDeductionToast';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('extractStockDeduction', () => {
  it('extrae stock_deduction del payload', () => {
    const payload = { id: 'lead-1', stock_deduction: { applied: true, deductions: [] } };
    expect(extractStockDeduction(payload)).toEqual({ applied: true, deductions: [] });
  });
});

describe('stripStockDeduction', () => {
  it('quita stock_deduction del lead', () => {
    const payload = { id: 'lead-1', nombre: 'X', stock_deduction: { applied: true } };
    expect(stripStockDeduction(payload)).toEqual({ id: 'lead-1', nombre: 'X' });
  });
});

describe('toastStockDeduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra info si no hay presupuesto', () => {
    toastStockDeduction({ applied: false, skippedReason: 'no_items' });
    expect(toast.info).toHaveBeenCalledOnce();
  });

  it('muestra success si todo ok', () => {
    toastStockDeduction({
      applied: true,
      deductions: [{ id: 'a', deducted: 1, ok: true }],
    });
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it('muestra warning si falta stock', () => {
    toastStockDeduction({
      applied: true,
      deductions: [
        { id: 'a', deducted: 0, ok: false, reason: 'insufficient_stock' },
        { id: 'b', deducted: 1, ok: true },
      ],
    });
    expect(toast.warning).toHaveBeenCalledOnce();
  });
});
