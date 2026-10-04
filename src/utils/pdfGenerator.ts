import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { toDDMMYYYY, toDDMMYY } from './formatDate';
import { usePdfStore } from '../store/usePdfStore';
import { Colors } from '../theme';

export interface PDFPartySection {
  name: string;
  address?: string;
  invoices: any[];
  totalOs: number;
}

export interface PDFReportData {
  title: string;
  companyName: string;
  companyAddress: string;
  partyName: string;
  partyAddress: string;
  partyBroker: string;
  /** When set (e.g. broker-wise), shown as a metadata line above the bill table. */
  brokerName?: string;
  /** When present, render party-wise sections instead of a single party block. */
  parties?: PDFPartySection[];
  periodFrom?: string;
  periodTo?: string;
  date: string;
  invoices: any[]; // The bills to show (flat fallback / totals source)
  showInterest: boolean;
  totals: {
    totalOs: number; // party total
    selectedBillAmount: number;
    interestAmount: number;
    gst: number;
    tds: number;
    netInterest: number;
    totalSelectedOs: number;
  };
  calculateInterest?: (amount: number, days: number) => number;
}

export const generateOutstandingReportPDF = async (data: PDFReportData) => {
  const {
    title,
    companyName,
    companyAddress,
    partyName,
    partyAddress,
    partyBroker,
    brokerName,
    parties,
    periodFrom,
    periodTo,
    date,
    invoices,
    showInterest,
    totals,
    calculateInterest
  } = data;

  // Column + summary interest only when the Interest toggle is on
  const withInterest = Boolean(showInterest && calculateInterest);
  const balanceAmount = withInterest
    ? totals.totalOs + totals.interestAmount
    : totals.totalOs;

  const getInvoiceRow = (inv: any) => {
    // Map invoice object properties based on typical keys (abstracted for cross-screen usage)
    const billNo = inv.number || inv.billNo || inv.id || '';
    const billDate = toDDMMYY(inv.date || inv.billDate || '') || '';
    const bookCode = inv.bookCode || '';
    const amount = inv.outstanding ?? inv.balance ?? inv.netBalance ?? 0;
    const termDays = inv.termDays ?? inv.creditDays ?? 0;
    const totalDueDays = inv.totalDueDays ?? 0;
    // Days left might be negative if overdue in Sales OS, or dueDays in GP OS
    const dueDays = inv.dueDays ?? (inv.daysLeft ? -inv.daysLeft : 0);
    
    let interestStr = '';
    if (withInterest && calculateInterest) {
      const intAmt = calculateInterest(amount, totalDueDays);
      interestStr = `<td class="right">${intAmt.toFixed(2)}</td>`;
    }

    return `
      <tr>
        <td class="center">${bookCode}</td>
        <td class="center">${billNo}</td>
        <td class="center">${billDate}</td>
        <td class="right">${amount.toFixed(2)}</td>
        <td class="center">${termDays}</td>
        <td class="center">${totalDueDays}</td>
        <td class="center ${dueDays > 0 ? 'red' : ''}">${dueDays}</td>
        <td class="right">${amount.toFixed(2)}</td>
        ${interestStr}
      </tr>
    `;
  };

  const colCount = withInterest ? 9 : 8;

  const renderPartyBlock = (name: string, address: string, broker: string, billRows: string) => `
              <tr>
                <td colspan="${colCount}">
                  <div class="party-info">
                    <div class="party-name">${name}</div>
                    <div class="party-details">${[address, broker ? `BROKER: ${broker}` : ''].filter(Boolean).join(' | ')}</div>
                  </div>
                </td>
              </tr>
              ${billRows}
  `;

  const renderPartyTotalRow = (amount: number) => {
    if (withInterest) {
      return `
              <tr>
                <td colspan="${colCount - 2}" class="right" style="font-weight: bold; color: #1a1a1a; padding-top: 6px; padding-bottom: 6px;">Party Total</td>
                <td class="right" style="font-weight: bold; padding-top: 6px; padding-bottom: 6px;">${amount.toFixed(2)}</td>
                <td></td>
              </tr>
      `;
    }
    return `
              <tr>
                <td colspan="${colCount - 1}" class="right" style="font-weight: bold; color: #1a1a1a; padding-top: 6px; padding-bottom: 6px;">Party Total</td>
                <td class="right" style="font-weight: bold; padding-top: 6px; padding-bottom: 6px;">${amount.toFixed(2)}</td>
              </tr>
    `;
  };

  let tbodyContent: string;
  if (parties && parties.length > 0) {
    tbodyContent = parties.map((section) => {
      const billRows = section.invoices.map(getInvoiceRow).join('');
      return (
        renderPartyBlock(section.name, section.address || '', '', billRows) +
        renderPartyTotalRow(section.totalOs)
      );
    }).join('');
  } else {
    tbodyContent =
      renderPartyBlock(partyName, partyAddress, partyBroker, invoices.map(getInvoiceRow).join(''));
  }

  const brokerMetaRow = brokerName
    ? `<div class="period-row" style="border-top: none;"><div>Broker: ${brokerName}</div></div>`
    : '';

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page {
            size: A4;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            overflow-x: hidden;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            font-size: 12px;
            background: #fff;
          }
          #pdf-page {
            width: 100%;
            max-width: 100%;
            padding: 0;
            background: #fff;
          }
          .container {
            border: 1px solid #424096;
            padding: 2px;
            width: 100%;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #424096;
            padding-bottom: 8px;
            position: relative;
          }
          .year {
            position: absolute;
            top: 4px;
            right: 8px;
            font-weight: bold;
            font-size: 11px;
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
            margin-top: 14px;
            margin-bottom: 4px;
          }
          .company-address {
            font-size: 11px;
            margin-bottom: 8px;
            line-height: 1.35;
            word-break: break-word;
          }
          .report-title {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            border-top: 1px solid #424096;
            border-bottom: 1px solid #424096;
            padding: 8px 0;
          }
          .period-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 8px;
            font-weight: bold;
            border-bottom: 1px solid #424096;
            font-size: 11px;
            flex-wrap: wrap;
          }
          .party-info {
            padding: 8px;
          }
          .party-name {
            font-size: 13px;
            font-weight: bold;
          }
          .party-details {
            font-size: 10px;
            text-transform: uppercase;
            margin-top: 3px;
            word-break: break-word;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            table-layout: fixed;
          }
          th {
            font-size: 9px;
            border-top: 1px solid #424096;
            border-bottom: 1px solid #424096;
            padding: 6px 1px;
            color: #1a1a1a;
            word-break: break-word;
            line-height: 1.15;
          }
          td {
            padding: 5px 1px;
            font-size: 11px;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          /* Narrow day cols; give amount/interest room so digits stay readable */
          .bill-table th:nth-child(1) { width: 7%; }
          .bill-table th:nth-child(2) { width: 9%; }
          .bill-table th:nth-child(3) { width: 10%; }
          .bill-table th:nth-child(4) { width: 14%; }
          .bill-table th:nth-child(5) { width: 8%; }
          .bill-table th:nth-child(6) { width: 8%; }
          .bill-table th:nth-child(7) { width: 8%; }
          .bill-table th:nth-child(8) { width: 18%; }
          .bill-table th:nth-child(9) { width: 18%; }
          .bill-table td.right {
            white-space: nowrap;
            overflow-wrap: normal;
            word-break: keep-all;
            padding-right: 3px;
          }
          .right { text-align: right; }
          .center { text-align: center; }
          .left { text-align: left; }
          .red { color: red; }
          .dotted-line {
            border-top: 1px dotted #424096;
            margin: 5px 0;
          }
          .summary-section {
            background-color: #E6E6E6;
            padding: 8px;
            margin-top: 8px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            font-size: 12px;
          }
          .summary-table {
            width: 100%;
          }
          .summary-table td {
            padding: 4px 5px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
          }
          .green-header {
            background-color: #424096;
            color: white;
            padding: 6px 10px;
            text-align: right;
            font-weight: bold;
            font-size: 12px;
          }
          .green-footer {
            background-color: #424096;
            color: white;
            padding: 8px 10px;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 13px;
          }
          .summary-line {
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            margin: 4px 0;
            font-size: 12px;
          }
          .summary-line span {
            min-width: 110px;
            text-align: right;
            white-space: nowrap;
          }
          .summary-line .lbl {
            text-align: right;
            margin-right: 10px;
            width: auto;
          }
          .border-bottom { border-bottom: 1px solid #424096; padding-bottom: 4px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div id="pdf-page">
        <div class="container">
          <div class="header">
            <div class="year">2026 - 2027</div>
            <div class="company-name">${companyName}</div>
            <div class="company-address">${companyAddress}</div>
          </div>
          
          <div class="report-title">${title}</div>
          
          <div class="period-row">
            <div>Period From : ${periodFrom ? toDDMMYYYY(periodFrom) : ''} To ${periodTo ? toDDMMYYYY(periodTo) : ''}</div>
            <div>Date : ${toDDMMYYYY(date)}</div>
          </div>
          ${brokerMetaRow}

          <table class="bill-table">
            <thead>
              <tr>
                <th class="center">BOOK</th>
                <th class="center">BILL NO</th>
                <th class="center">BILL DATE</th>
                <th class="right">BILL AMOUNT</th>
                <th class="center">TERMS DAYS</th>
                <th class="center">TOTAL DUE</th>
                <th class="center">DUE DAYS</th>
                <th class="right">O/S AMOUNT</th>
                ${withInterest ? '<th class="right">INTEREST</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${tbodyContent}
            </tbody>
          </table>
          
          <div class="dotted-line"></div>

          <table class="summary-table">
            ${withInterest ? `
            <tr>
              <td></td>
              <td></td>
              <td class="right" style="color: #1a1a1a; font-weight: bold;">Interest</td>
              <td class="right">${totals.interestAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td></td>
              <td></td>
              <td class="right" style="color: #1a1a1a; font-weight: bold;">${parties && parties.length > 0 ? 'Grand Total' : 'Party Total'}</td>
              <td class="right">${totals.totalOs.toFixed(2)}</td>
            </tr>
            ${withInterest ? `
            <tr>
              <td></td>
              <td></td>
              <td class="right" style="color: #1a1a1a; font-weight: bold;">Net Amount</td>
              <td class="right">${balanceAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>

          <div class="summary-section">
            <div class="summary-row">
              <div style="color: #1a1a1a; font-weight: bold;">Last Pay.Received</div>
              <div style="color: #1a1a1a; font-weight: bold;">-</div>
              <div style="color: #1a1a1a; font-weight: bold;">-</div>
              <div style="color: #1a1a1a; font-weight: bold; margin-left: auto; margin-right: 20px;">Balance</div>
              <div style="color: #1a1a1a; font-weight: bold;">${balanceAmount.toFixed(2)}</div>
            </div>
          </div>

          ${totals.selectedBillAmount > 0 ? `
          <div style="border: 1px solid #424096; margin-top: 12px;">
            <div class="green-header">Bills Total O/s</div>
            <div style="padding: 10px; background-color: #9C8DCE22;">
              ${withInterest ? `
              <div class="summary-line"><div class="lbl">Bills Interest Amount:</div><span>${totals.interestAmount.toFixed(2)}</span></div>
              <div class="summary-line"><div class="lbl">GST(5%):</div><span>+ ${totals.gst.toFixed(2)}</span></div>
              <div class="summary-line border-bottom"><div class="lbl">TDS(10%):</div><span>- ${totals.tds.toFixed(2)}</span></div>
              <div class="summary-line"><div class="lbl">Net Interest Amount After TDS:</div><span>${totals.netInterest.toFixed(2)}</span></div>
              ` : ''}
              <div class="summary-line border-bottom"><div class="lbl">Bill Amount:</div><span>${totals.selectedBillAmount.toFixed(2)}</span></div>
              <div class="summary-line"><div class="lbl" style="font-weight: bold;">Total Selected Bill O/s:</div><span style="font-weight: bold;">${(withInterest ? totals.totalSelectedOs : totals.selectedBillAmount).toFixed(2)}</span></div>
            </div>
            <div class="green-footer">
              <div>Grand Total</div>
              <div>${(withInterest ? totals.totalSelectedOs : totals.selectedBillAmount).toFixed(2)}</div>
            </div>
          </div>
          ` : ''}

        </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Instead of using native print preview, we dispatch the HTML to our custom in-app global modal
    usePdfStore.getState().openPreview(html);
  } catch (error) {
    console.error("Failed to generate or share PDF", error);
  }
};
