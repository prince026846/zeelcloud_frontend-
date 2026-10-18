/**
 * Ledger balance and transaction processing utilities.
 * Handles accounting sign conventions and opening-balance reconciliation.
 */

import { formatCurrency } from './currency';

export interface ProcessedLedgerData<T> {
  effectiveOpeningBalance: number;
  genuineTransactions: T[];
}

export interface FormattedLedgerBalance {
  text: string;
  isZero: boolean;
  isDr: boolean;
}

/**
 * Format balance with Dr / Cr indicator.
 * Displays "₹0.00" without Dr/Cr when balance is 0.
 * Accounting sign convention: Positive = Debit (Dr), Negative = Credit (Cr), 0 = Neutral.
 */
export const formatLedgerBalance = (balance: number): FormattedLedgerBalance => {
  if (Math.abs(balance) < 0.005) {
    return { text: formatCurrency(0), isZero: true, isDr: false };
  }
  const isDr = balance > 0;
  return {
    text: `${formatCurrency(Math.abs(balance))} ${isDr ? 'Dr' : 'Cr'}`,
    isZero: false,
    isDr,
  };
};

/**
 * Checks whether a raw or normalized ledger item represents an Opening Balance record.
 */
export const isOpeningBalanceRecord = (item: any): boolean => {
  if (!item || typeof item !== 'object') return false;

  const type = String(item.vv_type || item.voucherType || '').trim().toUpperCase();
  if (type === 'OB' || type === 'OPENING' || type === 'OPENING BALANCE') {
    return true;
  }

  const perticular = String(item.vv_perticular || item.particulars || '').trim().toUpperCase();
  if (perticular === 'OPENING BALANCE' || perticular.startsWith('OPENING BALANCE')) {
    return true;
  }

  const details = String(item.vv_details || '').trim().toUpperCase();
  if (details === 'OPENING BALANCE' || details.startsWith('OPENING BALANCE')) {
    return true;
  }

  return false;
};

/**
 * Extracts net amount from an opening balance record.
 * Accounting sign convention: Positive = Debit (Dr), Negative = Credit (Cr).
 */
export const extractRecordNetAmount = (item: any): number => {
  const dr = typeof item.vn_debit_amt === 'number'
    ? item.vn_debit_amt
    : (typeof item.debit === 'number' ? item.debit : 0);
  const cr = typeof item.vn_credit_amt === 'number'
    ? item.vn_credit_amt
    : (typeof item.credit === 'number' ? item.credit : 0);

  if (dr !== 0 || cr !== 0) {
    return dr - cr;
  }

  // Fallback for records having only balance/dc fields
  const balance = typeof item.vn_balance === 'number'
    ? item.vn_balance
    : (typeof item.balance === 'number' ? item.balance : 0);
  const dc = String(item.vv_dc || '').trim().toUpperCase();
  if (dc === 'CR' || balance < 0) {
    return -Math.abs(balance);
  }
  return Math.abs(balance);
};

/**
 * Separates opening-balance records from in-period transactions,
 * absorbing in-period opening-balance amounts into the effective opening balance.
 *
 * @param rawItems The transactions list returned by backend API (res.data)
 * @param backendOpeningBalance The opening balance returned by backend API (res.opening_balance)
 */
export const processOpeningBalance = <T extends Record<string, any>>(
  rawItems: T[],
  backendOpeningBalance: number = 0
): ProcessedLedgerData<T> => {
  let effectiveOpeningBalance = backendOpeningBalance;
  const genuineTransactions: T[] = [];

  for (const item of rawItems) {
    if (isOpeningBalanceRecord(item)) {
      effectiveOpeningBalance += extractRecordNetAmount(item);
    } else {
      genuineTransactions.push(item);
    }
  }

  return {
    effectiveOpeningBalance,
    genuineTransactions,
  };
};
