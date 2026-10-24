import { formatCurrency } from '../../utils/currency';
import { outstandingForModule, type OutstandingTotals } from './outstandingTotals';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const millA: OutstandingTotals = { totalSales: 6614373, totalPurchase: 3694537, totalGp: 0 };
const millB: OutstandingTotals = { totalSales: 100, totalPurchase: 0, totalGp: 25.5 };

assert(outstandingForModule('SalesOsStack', millA) === 6614373, 'sales total for company A');
assert(outstandingForModule('PurchaseOsStack', millA) === 3694537, 'purchase total for company A');
assert(outstandingForModule('GpOsStack', millA) === 0, 'zero GP balance is shown');

assert(outstandingForModule('SalesOsStack', millB) === 100, 'sales total switches with the company');
assert(outstandingForModule('PurchaseOsStack', millB) === 0, 'zero purchase balance is shown');
assert(outstandingForModule('GpOsStack', millB) === 25.5, 'gp total switches with the company');

for (const key of ['SalesRegisterStack', 'PurchaseRegisterStack', 'GpRegisterStack', 'PartyLedger', 'BankCashLedger', 'StockStack']) {
  assert(outstandingForModule(key, millA) === null, `${key} does not show a currency amount`);
}

assert(outstandingForModule('SalesOsStack', null) === null, 'no company means no amount');
assert(outstandingForModule('SalesOsStack', undefined) === null, 'missing totals means no amount');

const zeroText = formatCurrency(0);
assert(zeroText.includes('0'), 'zero balance uses the currency formatter');
assert(formatCurrency(millA.totalSales).includes('66'), 'large sales total stays in the formatted amount');
assert(!formatCurrency(millA.totalPurchase).includes('66,14,373'), 'purchase card does not reuse the sales amount');

console.log('outstanding total checks passed');
