// Dynamic period ranges computed at runtime — no hard-coded dates/years.
// Used by register/report filters so defaults always track "now" (and real API data).

export type PeriodKey = 'All' | 'This Week' | 'This Month' | 'This Quarter' | 'This Year';

export const PERIOD_OPTIONS: PeriodKey[] = ['All', 'This Week', 'This Month', 'This Quarter', 'This Year'];

const iso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Returns null for "All" (no date restriction → show everything, latest-first).
export const rangeFor = (period: PeriodKey, ref: Date = new Date()): { from: string; to: string } | null => {
  const to = iso(ref);
  switch (period) {
    case 'All':
      return null;
    case 'This Week': {
      const from = new Date(ref);
      from.setDate(from.getDate() - 6);
      return { from: iso(from), to };
    }
    case 'This Month':
      return { from: iso(new Date(ref.getFullYear(), ref.getMonth(), 1)), to };
    case 'This Quarter': {
      const q = Math.floor(ref.getMonth() / 3) * 3;
      return { from: iso(new Date(ref.getFullYear(), q, 1)), to };
    }
    case 'This Year':
      return { from: iso(new Date(ref.getFullYear(), 0, 1)), to };
  }
};

// Keep only entries within [from,to]; a null range means "no filter".
export const withinRange = (dateISO: string, range: { from: string; to: string } | null): boolean =>
  !range || (dateISO >= range.from && dateISO <= range.to);

// ─── Ledger & Quick Date Range Utilities ─────────────────────────────────────

export type QuickDateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';

export interface QuickDateRangeOption {
  key: QuickDateRange;
  label: string;
  badgeLabel: string;
  description: string;
  icon: string;
}

export const QUICK_DATE_RANGES: QuickDateRangeOption[] = [
  { key: 'week', label: 'Week', badgeLabel: 'Week', description: 'Past 7 days', icon: 'calendar-week' },
  { key: 'month', label: 'Month', badgeLabel: 'Month', description: 'Past 1 month', icon: 'calendar-month' },
  { key: '3months', label: '3 Months', badgeLabel: '3M', description: 'Past 3 months', icon: 'calendar-range' },
  { key: '6months', label: '6 Months', badgeLabel: '6M', description: 'Past 6 months', icon: 'calendar-range' },
  { key: 'year', label: 'Year', badgeLabel: 'Year', description: 'Past 1 year', icon: 'calendar-star' },
];

const pad = (n: number): string => String(n).padStart(2, '0');

export const toIsoDateString = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseIsoDate = (isoString: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoString);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Calculates the From Date (ISO YYYY-MM-DD) relative to a given To Date (ISO YYYY-MM-DD)
 * based on the selected quick range.
 */
export const calculateFromDateForRange = (range: QuickDateRange, toDateIso: string): string => {
  const to = parseIsoDate(toDateIso);
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  switch (range) {
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month': {
      const targetMonth = from.getMonth() - 1;
      from.setMonth(targetMonth);
      if (from.getMonth() > (targetMonth + 12) % 12) {
        from.setDate(0);
      }
      break;
    }
    case '3months': {
      const targetMonth = from.getMonth() - 3;
      from.setMonth(targetMonth);
      if (from.getMonth() > (targetMonth + 12) % 12) {
        from.setDate(0);
      }
      break;
    }
    case '6months': {
      const targetMonth = from.getMonth() - 6;
      from.setMonth(targetMonth);
      if (from.getMonth() > (targetMonth + 12) % 12) {
        from.setDate(0);
      }
      break;
    }
    case 'year': {
      from.setFullYear(from.getFullYear() - 1);
      break;
    }
    default:
      return toDateIso;
  }

  return toIsoDateString(from);
};

export const getRangeBadgeLabel = (range: QuickDateRange): string => {
  if (range === 'custom') return 'Custom';
  const match = QUICK_DATE_RANGES.find((r) => r.key === range);
  return match ? match.badgeLabel : 'Custom';
};

/**
 * Returns default initial dates when opening the Ledger screen:
 * - To Date: Current local date
 * - From Date: Current local date - 7 days
 * - Selected Range: 'week'
 */
export const getDefaultLedgerDates = (): {
  fromDate: string;
  toDate: string;
  selectedRange: QuickDateRange;
} => {
  const now = new Date();
  const toDate = toIsoDateString(now);
  const fromDate = calculateFromDateForRange('week', toDate);
  return {
    fromDate,
    toDate,
    selectedRange: 'week',
  };
};
