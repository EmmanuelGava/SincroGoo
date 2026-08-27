import { describe, expect, it } from 'vitest';
import { leadTagsStockAlreadyDeducted, mergeLeadTagsWithStockDeduction } from '../descontarStockAlGanado';

describe('leadTagsStockAlreadyDeducted', () => {
  it('detecta flag en tags', () => {
    expect(leadTagsStockAlreadyDeducted({ stock_descontado: true })).toBe(true);
    expect(leadTagsStockAlreadyDeducted({})).toBe(false);
    expect(leadTagsStockAlreadyDeducted(null)).toBe(false);
  });
});

describe('mergeLeadTagsWithStockDeduction', () => {
  it('conserva tags previos y marca descontado', () => {
    const merged = mergeLeadTagsWithStockDeduction(
      { vip: true },
      [{ id: 'a', deducted: 1, stock_after: 4, ok: true }],
    );
    expect(merged.vip).toBe(true);
    expect(merged.stock_descontado).toBe(true);
    expect(merged.stock_deductions).toHaveLength(1);
    expect(typeof merged.stock_descontado_at).toBe('string');
  });
});
