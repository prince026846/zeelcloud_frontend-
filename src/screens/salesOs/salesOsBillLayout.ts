/**
 * Widths for the Sales O/s (Party Wise) bill grid.
 *
 * Comfortable minimums are chosen so a 360dp phone fits every default column
 * (checkbox, book, bill number, date, term, total due, due days, amount)
 * without horizontal scrolling. Yoga's default box is border-box and this
 * screen uses 2px of horizontal cell padding, so the text area is width - 4.
 * Those text areas fit 10px headers and 11px cells when font scaling is capped
 * at 1x for this grid only.
 *
 * Company and interest are optional. Interest is kept readable and may extend
 * past the first screen; the amount column stays inside the initial viewport
 * whenever the column floors allow it. Horizontal scrolling is used only when
 * even those floors are wider than the window.
 */

export interface SalesOsBillLayoutInput {
  windowWidth: number;
  showCompanyRef: boolean;
  showInterest: boolean;
  interestOnBasic: boolean;
}

export interface SalesOsBillLayout {
  widths: Record<string, number>;
  tableWidth: number;
  scrolls: boolean;
}

interface ColumnSpec {
  key: string;
  min: number;
  floor: number;
  preferred: number;
  /** Higher values give up width first when the amount must stay on screen. */
  shrinkPriority: number;
  /** Share of spare width once every column is at least its minimum. */
  grow: number;
}

function columnSpecs(input: SalesOsBillLayoutInput): ColumnSpec[] {
  const interestMin = input.interestOnBasic ? 76 : 70;
  const specs: ColumnSpec[] = [
    { key: 'sel', min: 24, floor: 24, preferred: 24, shrinkPriority: 0, grow: 0 },
  ];
  if (input.showCompanyRef) {
    specs.push({ key: 'companyRef', min: 34, floor: 30, preferred: 42, shrinkPriority: 1, grow: 0.1 });
  }
  specs.push(
    { key: 'bookCode', min: 34, floor: 32, preferred: 44, shrinkPriority: 1, grow: 0.12 },
    { key: 'number', min: 66, floor: 42, preferred: 124, shrinkPriority: 5, grow: 1.45 },
    { key: 'date', min: 58, floor: 56, preferred: 68, shrinkPriority: 1, grow: 0.15 },
    // "Terms" is one word. Keep this column at the width that fits it on one
    // line (10px header + 2px cell padding each side) and do not give it away.
    { key: 'termDays', min: 46, floor: 46, preferred: 54, shrinkPriority: 0, grow: 0.12 },
    { key: 'totalDueDays', min: 42, floor: 42, preferred: 56, shrinkPriority: 0, grow: 0.12 },
    { key: 'dueDays', min: 38, floor: 36, preferred: 48, shrinkPriority: 1, grow: 0.12 },
    { key: 'outstanding', min: 64, floor: 56, preferred: 136, shrinkPriority: 2, grow: 1.7 },
  );
  if (input.showInterest) {
    specs.push({
      key: 'interest',
      min: interestMin,
      floor: interestMin,
      preferred: Math.max(interestMin, 120),
      shrinkPriority: 0,
      grow: 1.3,
    });
  }
  return specs;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The column floor is wide enough for the full word, so the header never splits. */
export function salesOsTermHeader(_width: number): string {
  return 'Terms';
}

function shrink(widths: number[], specs: ColumnSpec[], indexes: number[], overflow: number): number {
  const order = indexes
    .map((index) => ({ index, priority: specs[index].shrinkPriority }))
    .filter((item) => item.priority > 0)
    .sort((a, b) => b.priority - a.priority || a.index - b.index);

  for (const item of order) {
    if (overflow <= 0) break;
    const slack = widths[item.index] - specs[item.index].floor;
    if (slack <= 0) continue;
    const cut = Math.min(slack, overflow);
    widths[item.index] -= cut;
    overflow -= cut;
  }
  return overflow;
}

function distributeSpare(
  specs: ColumnSpec[],
  widths: number[],
  spare: number,
  capAtPreferred: boolean,
): number {
  if (spare <= 0.01) return Math.max(0, spare);
  const open = specs
    .map((spec, index) => ({
      index,
      spec,
      room: capAtPreferred ? spec.preferred - widths[index] : Number.POSITIVE_INFINITY,
    }))
    .filter((item) => item.spec.grow > 0 && item.room > 0.01);
  const weight = open.reduce((total, item) => total + item.spec.grow, 0);
  if (weight <= 0 || open.length === 0) return spare;

  let consumed = 0;
  open.forEach((item, index) => {
    const fair = (spare * item.spec.grow) / weight;
    const share = index === open.length - 1
      ? Math.min(item.room, Math.max(0, spare - consumed))
      : Math.min(item.room, fair);
    widths[item.index] += share;
    consumed += share;
  });
  return spare - consumed;
}

export function layoutSalesOsBillColumns(input: SalesOsBillLayoutInput): SalesOsBillLayout {
  const windowWidth = Number.isFinite(input.windowWidth) ? Math.max(0, input.windowWidth) : 0;
  const specs = columnSpecs({ ...input, windowWidth });
  const widths = specs.map((spec) => spec.min);
  const headIndexes = specs
    .map((spec, index) => (spec.key === 'interest' ? -1 : index))
    .filter((index) => index >= 0);

  const headWidth = () => headIndexes.reduce((total, index) => total + widths[index], 0);
  // Keep every column through Amount inside the window when the floors allow it.
  shrink(widths, specs, headIndexes, headWidth() - windowWidth);

  // Interest is the last column. When it does not fit, pull it back until about
  // 48px is on screen so the header is discoverable, without pushing Amount off.
  const interestIndex = specs.findIndex((spec) => spec.key === 'interest');
  if (interestIndex >= 0) {
    const peek = Math.min(48, widths[interestIndex]);
    const hiddenBeforePeek = headWidth() - (windowWidth - peek);
    if (hiddenBeforePeek > 0) shrink(widths, specs, headIndexes, hiddenBeforePeek);
  }

  let contentWidth = sum(widths);
  // A few pixels of overflow is not worth a horizontal scrollbar.
  const hairline = contentWidth - windowWidth;
  if (hairline > 0 && hairline <= 8) {
    const shaveIndex = interestIndex >= 0 ? interestIndex : specs.findIndex((spec) => spec.key === 'outstanding');
    if (shaveIndex >= 0) widths[shaveIndex] -= hairline;
    contentWidth = sum(widths);
  }
  const scrolls = contentWidth > windowWidth + 0.5;

  if (!scrolls) {
    let spare = windowWidth - contentWidth;
    spare = distributeSpare(specs, widths, spare, true);
    spare = distributeSpare(specs, widths, spare, false);
    const amountIndex = specs.findIndex((spec) => spec.key === 'outstanding');
    if (amountIndex >= 0) widths[amountIndex] += windowWidth - sum(widths);
  }

  const widthMap: Record<string, number> = {};
  specs.forEach((spec, index) => {
    widthMap[spec.key] = widths[index];
  });

  return {
    widths: widthMap,
    tableWidth: scrolls ? contentWidth : windowWidth,
    scrolls,
  };
}
