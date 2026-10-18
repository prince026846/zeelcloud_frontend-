import { usePdfStore } from '../store/usePdfStore';
import { formatCurrency } from './currency';
import { toDDMMYYYY } from './formatDate';
import { formatPdfFileName } from './pdfFileName';
import { isOpeningBalanceRecord } from './ledgerUtils';

export interface LedgerPdfData {
  partyName: string;
  partyAddress?: string;
  companyName: string;
  gstNo?: string;
  address?: string; // Company address (legacy field)
  companyAddress?: string; // Company address (explicit alias)
  fromDate: string; // DD/MM/YYYY or ISO
  toDate: string; // DD/MM/YYYY or ISO
  openingBalance: number;
  closingBalance: number;
  transactions: {
    date: string; 
    voucherNo?: string;
    vchNo?: string;
    particulars: string;
    narration?: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
}

const escapeHtml = (str?: string | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const generateLedgerPdf = (data: LedgerPdfData) => {
  const formatAmount = (num: number) => num ? Math.abs(num).toFixed(2) : '0';
  const formatDc = (num: number) => Math.abs(num) < 0.005 ? '' : num > 0 ? 'DR' : 'CR';
  
  // Defensively exclude opening balance rows from the transaction list to prevent duplicates
  const genuineTransactions = (data.transactions || []).filter((t) => !isOpeningBalanceRecord(t));

  let totalDebit = 0;
  let totalCredit = 0;
  genuineTransactions.forEach(t => {
    totalDebit += t.debit;
    totalCredit += t.credit;
  });

  const rawGst = (data.gstNo || '').trim();
  const formattedGst = rawGst
    ? rawGst.toLowerCase().startsWith('gst')
      ? rawGst
      : `GST No : ${rawGst}`
    : '';
  const companyAddress = (data.companyAddress || data.address || '').trim();
  const partyAddress = (data.partyAddress || '').trim();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
        }

        body { 
          font-family: 'Inter', Helvetica, Arial, sans-serif; 
          margin: 0; 
          padding: 24px; 
          font-size: 13px; /* Increased from 11px */
          color: #2A2758;
          background-color: #FFFFFF;
        }
        
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        #pdf-page {
          width: 100%;
          max-width: 794px;
          margin: 0 auto;
          background: white;
        }

        /* --- Header Section --- */
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
        }
        .company-name { 
          font-size: 24px; /* Increased from 20px */
          font-weight: 700; 
          color: #424096; 
          margin-bottom: 6px;
        }
        .company-meta { 
          font-size: 13px; /* Increased from 11px */
          color: #6B648F; 
          margin-top: 3px; 
        }
        .report-title { 
          font-size: 18px; /* Increased from 15px */
          font-weight: 600;
          margin-top: 16px; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* --- Meta Information --- */
        .meta-container {
          background-color: #F3F0FA;
          border: 1px solid #9C8DCE40;
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }
        .meta-table { 
          width: 100%; 
        }
        .meta-table td { 
          font-size: 14px; /* Increased from 12px */
          vertical-align: top;
          padding-bottom: 4px;
        }
        .meta-label {
          font-weight: 600;
          color: #6B648F;
          width: 90px;
        }
        .meta-value {
          font-weight: 700;
          color: #2A2758;
        }

        /* --- Data Table --- */
        table.data-table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 13px; /* Increased from 11px */
          border: 1px solid #E6E6E6;
        }
        .data-table th, .data-table td { 
          border: 1px solid #E6E6E6; 
          padding: 8px 10px; /* Increased padding */
          vertical-align: top;
        }
        .data-table th { 
          background-color: #424096;
          color: white; 
          text-align: left; 
          font-weight: 600; 
          text-transform: uppercase;
          font-size: 12px; /* Increased from 10px */
          letter-spacing: 0.5px;
        }
        
        /* Column Widths & Alignment */
        .col-date { width: 90px; white-space: nowrap; }
        .col-vch { width: 75px; word-break: break-word; }
        .col-part { width: auto; line-height: 1.5; }
        .col-amt { width: 95px; text-align: right; white-space: nowrap; }
        .col-dc { width: 45px; text-align: center; font-weight: 600; }
        
        .right { text-align: right; }
        .center { text-align: center; }
        
        /* Specific Row Styles */
        .opening-row td {
          background-color: #F8F9FA;
          font-weight: 600;
        }
        .total-row td {
          background-color: #F3F0FA;
          font-weight: 700;
          border-top: 2px solid #9C8DCE;
          padding-top: 12px;
          padding-bottom: 12px;
        }
        
        .particulars-text {
          font-weight: 500;
        }
        .narration-text {
          color: #6B648F;
          font-size: 11px; /* Increased from 10px */
          margin-top: 4px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div id="pdf-page">
        <!-- Header -->
        <div class="header">
          <div class="company-name">${escapeHtml(data.companyName)}</div>
          ${formattedGst ? `<div class="company-meta">${escapeHtml(formattedGst)}</div>` : ''}
          ${companyAddress ? `<div class="company-meta">${escapeHtml(companyAddress)}</div>` : ''}
          <div class="report-title">LEDGER REPORT</div>
        </div>
        
        <!-- Meta Info -->
        <div class="meta-container">
          <table class="meta-table">
            <tr>
              <td class="meta-label">Party Name:</td>
              <td class="meta-value">${escapeHtml(data.partyName)}</td>
            </tr>
            ${partyAddress ? `
            <tr>
              <td class="meta-label">Address:</td>
              <td class="meta-value">${escapeHtml(partyAddress)}</td>
            </tr>
            ` : ''}
            <tr>
              <td class="meta-label">Period:</td>
              <td class="meta-value">From ${escapeHtml(toDDMMYYYY(data.fromDate))} To ${escapeHtml(toDDMMYYYY(data.toDate))}</td>
            </tr>
          </table>
        </div>
        
        <!-- Transactions Table -->
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-date">Date</th>
              <th class="col-vch">Vch No</th>
              <th class="col-part">Particular</th>
              <th class="col-amt">Debit</th>
              <th class="col-amt">Credit</th>
              <th class="col-amt">Balance</th>
              <th class="col-dc">D/C</th>
            </tr>
          </thead>
          <tbody>
            <!-- Opening Balance -->
            <tr class="opening-row">
              <td class="col-date">${escapeHtml(toDDMMYYYY(data.fromDate))}</td>
              <td class="col-vch"></td>
              <td class="col-part">OPENING BALANCE</td>
              <td class="col-amt">${data.openingBalance > 0 ? formatAmount(data.openingBalance) : ''}</td>
              <td class="col-amt">${data.openingBalance < 0 ? formatAmount(data.openingBalance) : ''}</td>
              <td class="col-amt">${formatAmount(data.openingBalance)}</td>
              <td class="col-dc">${formatDc(data.openingBalance)}</td>
            </tr>
            
            <!-- Transaction Rows -->
            ${genuineTransactions.map(t => `
              <tr>
                <td class="col-date">${escapeHtml(toDDMMYYYY(t.date))}</td>
                <td class="col-vch">${escapeHtml(t.voucherNo || t.vchNo || '')}</td>
                <td class="col-part">
                  <div class="particulars-text">${escapeHtml(t.particulars)}</div>
                  ${t.narration ? `<div class="narration-text">${escapeHtml(t.narration)}</div>` : ''}
                </td>
                <td class="col-amt">${t.debit > 0 ? formatAmount(t.debit) : ''}</td>
                <td class="col-amt">${t.credit > 0 ? formatAmount(t.credit) : ''}</td>
                <td class="col-amt">${formatAmount(t.runningBalance)}</td>
                <td class="col-dc">${formatDc(t.runningBalance)}</td>
              </tr>
            `).join('')}
            
            <!-- Footer / Total Row -->
            <tr class="total-row">
              <td colspan="3" class="right" style="padding-right: 16px;">TOTAL</td>
              <td class="col-amt">${formatAmount(totalDebit + (data.openingBalance > 0 ? data.openingBalance : 0))}</td>
              <td class="col-amt">${formatAmount(totalCredit + (data.openingBalance < 0 ? Math.abs(data.openingBalance) : 0))}</td>
              <td class="col-amt">${formatAmount(data.closingBalance)}</td>
              <td class="col-dc">${formatDc(data.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  const fileName = formatPdfFileName('ledger', data.partyName);
  usePdfStore.getState().openPreview(html, fileName);
};
