import {
  cartonSalesQtyColumns,
  isCartonSalesLayout,
  resolveSalesFieldLabel,
  standardSalesQtyColumns,
} from './salesBillColumns';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const item = { taka: 11, pallu: 22, weight: 3.5, meter: 4.25 };

const valid = standardSalesQtyColumns({ field1: '  Taka  ', field2: 'Kgs', field3: 'Mtr' });
assert(valid.map((col) => col.label).join('|') === 'Taka|Pallu|Kgs|Mtr', 'valid API labels');
assert(valid.map((col) => col.key).join('|') === 'taka|pallu|weight|meter', 'weight before meter');
assert(valid.map((col) => col.value(item)).join('|') === '11|22|3.5|4.25', 'values stay on their columns');
const format3 = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatted = valid.map((col) =>
  col.fractionDigits === 3 ? format3(col.value(item)) : String(col.value(item) || 0),
);
assert(formatted.join('|') === '11|22|3.500|4.250', 'three-decimal weight then meter');
assert(valid[2].key === 'weight' && valid[2].label === 'Kgs' && valid[2].value(item) === 3.5, 'field2 aligns to weight');
assert(valid[3].key === 'meter' && valid[3].label === 'Mtr' && valid[3].value(item) === 4.25, 'field3 aligns to meter');
assert(valid[2].fractionDigits === 3 && valid[3].fractionDigits === 3, 'meter and weight keep 3 decimals');
assert(valid[0].fractionDigits === 0 && valid[1].fractionDigits === 0, 'taka and pallu stay unscaled');

assert(resolveSalesFieldLabel(null, 'Qty1') === 'Qty1', 'null label');
assert(resolveSalesFieldLabel(undefined, 'Qty2') === 'Qty2', 'undefined label');
assert(resolveSalesFieldLabel('', 'Qty3') === 'Qty3', 'empty label');
assert(resolveSalesFieldLabel('   ', 'Qty1') === 'Qty1', 'whitespace-only label');
assert(resolveSalesFieldLabel('Pcs', 'Qty1') === 'Pcs', 'do not replace a valid label');

const blank = standardSalesQtyColumns({ field1: null, field2: '', field3: ' \t ' });
assert(blank.map((col) => col.label).join('|') === 'Qty1|Pallu|Qty2|Qty3', 'blank labels use Qty fallbacks');
assert(blank.map((col) => col.value(item)).join('|') === '11|22|3.5|4.25', 'fallbacks do not move values');

const carton = cartonSalesQtyColumns();
assert(carton.map((col) => `${col.label}:${col.key}`).join('|') === 'Crtn:taka|Pallu:pallu|Weight:weight|Cops:meter', 'carton layout preserved');
assert(isCartonSalesLayout({ field1: 'Crtn', field2: 'Weight', field3: 'Cops' }) === true, 'carton detection');
assert(isCartonSalesLayout({ field1: 'Taka', field2: 'Weight', field3: 'Meter' }) === false, 'standard detection');
assert(isCartonSalesLayout({ field1: '  ', field2: null, field3: undefined }) === false, 'blank fields are not carton');

console.log('sales bill column checks passed');
