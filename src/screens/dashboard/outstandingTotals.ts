export interface OutstandingTotals {
  totalPurchase: number;
  totalSales: number;
  totalGp: number;
}

/** Bookmark keys that show the selected company's outstanding balance. */
const MODULE_TOTAL: Record<string, keyof OutstandingTotals> = {
  SalesOsStack: 'totalSales',
  PurchaseOsStack: 'totalPurchase',
  GpOsStack: 'totalGp',
};

/**
 * Amount for one dashboard card.
 * null means this module does not show a currency amount.
 * 0 is a real zero balance and must be displayed.
 */
export function outstandingForModule(
  moduleKey: string,
  totals: OutstandingTotals | null | undefined,
): number | null {
  const field = MODULE_TOTAL[moduleKey];
  if (!field || totals == null) return null;
  const value = totals[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
