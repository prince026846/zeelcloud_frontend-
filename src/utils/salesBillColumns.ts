import type { BillDetailItem } from '../types';

export type SalesQtyKey = 'taka' | 'pallu' | 'weight' | 'meter';

export interface SalesQtyColumn {
  key: SalesQtyKey;
  label: string;
  /** Meter and Weight stay at three decimal places. Taka and Pallu stay whole numbers. */
  fractionDigits: 0 | 3;
  value: (item: Pick<BillDetailItem, SalesQtyKey>) => number;
}

/**
 * Null, undefined, empty, and whitespace-only API labels are blank.
 * A blank label uses the fallback. Any other label is kept after trimming.
 */
export function resolveSalesFieldLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : fallback;
}

/** Standard Sales columns: Item Name is added by the caller, then these, then Amount. */
export function standardSalesQtyColumns(detail?: {
  field1?: string | null;
  field2?: string | null;
  field3?: string | null;
} | null): SalesQtyColumn[] {
  return [
    {
      key: 'taka',
      label: resolveSalesFieldLabel(detail?.field1, 'Qty1'),
      fractionDigits: 0,
      value: (item) => item.taka ?? 0,
    },
    {
      key: 'pallu',
      label: 'Pallu',
      fractionDigits: 0,
      value: (item) => item.pallu ?? 0,
    },
    {
      key: 'weight',
      label: resolveSalesFieldLabel(detail?.field2, 'Qty2'),
      fractionDigits: 3,
      value: (item) => item.weight ?? 0,
    },
    {
      key: 'meter',
      label: resolveSalesFieldLabel(detail?.field3, 'Qty3'),
      fractionDigits: 3,
      value: (item) => item.meter ?? 0,
    },
  ];
}

export function isCartonSalesLayout(detail?: {
  field1?: string | null;
  field2?: string | null;
  field3?: string | null;
} | null): boolean {
  return [detail?.field1, detail?.field2, detail?.field3].some((field) => {
    const label = field?.toLowerCase();
    return !!label && (label.includes('crtn') || label.includes('carton'));
  });
}

/** Carton / combination 2 grid. Labels and order stay fixed. */
export function cartonSalesQtyColumns(): SalesQtyColumn[] {
  return [
    { key: 'taka', label: 'Crtn', fractionDigits: 0, value: (item) => item.taka ?? 0 },
    { key: 'pallu', label: 'Pallu', fractionDigits: 0, value: (item) => item.pallu ?? 0 },
    { key: 'weight', label: 'Weight', fractionDigits: 3, value: (item) => item.weight ?? 0 },
    { key: 'meter', label: 'Cops', fractionDigits: 3, value: (item) => item.meter ?? 0 },
  ];
}
