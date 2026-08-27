import { toast } from 'sonner';

export type StockDeductionApiPayload = {
  applied?: boolean;
  skippedReason?: 'already_deducted' | 'not_ganado' | 'no_items';
  deductions?: Array<{
    id: string;
    deducted?: number;
    stock_after?: number | null;
    ok?: boolean;
    reason?: string | null;
  }>;
};

export function extractStockDeduction(payload: Record<string, unknown>): StockDeductionApiPayload | null {
  const raw = payload.stock_deduction;
  if (!raw || typeof raw !== 'object') return null;
  return raw as StockDeductionApiPayload;
}

export function stripStockDeduction<T extends Record<string, unknown>>(payload: T): Omit<T, 'stock_deduction'> {
  const { stock_deduction: _ignored, ...rest } = payload;
  return rest;
}

/** Muestra toast según el resultado del descuento de stock al marcar Ganado. */
export function toastStockDeduction(stockDeduction: StockDeductionApiPayload | null | undefined): void {
  if (!stockDeduction) return;

  if (!stockDeduction.applied) {
    if (stockDeduction.skippedReason === 'no_items') {
      toast.info('Marcado como Ganado. No había presupuesto en el chat para descontar stock.');
    }
    return;
  }

  const deductions = stockDeduction.deductions || [];
  const failed = deductions.filter((row) => !row.ok);
  const totalDeducted = deductions.reduce((sum, row) => sum + Number(row.deducted ?? 0), 0);

  if (failed.length > 0) {
    toast.warning(
      failed.length === 1
        ? 'Stock descontado parcialmente: 1 producto no tenía stock suficiente.'
        : `Stock descontado parcialmente: ${failed.length} productos no tenían stock suficiente.`,
    );
    return;
  }

  if (totalDeducted > 0) {
    toast.success('Stock descontado según el último presupuesto del chat.');
  }
}
