import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { toDDMMYYYY } from './formatDate';
import type { BillDetail } from '../types';
import type { BillModule } from '../components/BillDetailView';
import { usePdfStore } from '../store/usePdfStore';
import { useCompanyStore } from '../store/companyStore';
import { Colors } from '../theme';

export const generateInvoicePDF = async (detail: BillDetail, module: BillModule, reportType: string = 'Tax Invoice') => {
  const money = (n: number | undefined) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const num3 = (n: number | undefined) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  
  const isSales = module === 'sales';
  
  // Calculate grid totals
  let totalTaka = 0, totalPallu = 0, totalMeter = 0, totalWeight = 0;
  let totalNos = 0, totalQty = 0, totalCut = 0;
  
  detail.items.forEach(item => {
    totalTaka += (item.taka || 0);
    totalPallu += (item.pallu || 0);
    totalMeter += (item.meter || 0);
    totalWeight += (item.weight || 0);
    totalNos += (item.nos || 0);
    totalQty += (item.qty || 0);
    totalCut += (item.cut || 0);
  });

  const renderNumCell = (valStr: string | number, align: string = 'center', extraClass: string = '') => {
    const str = String(valStr);
    let shrinkClass = '';
    if (str.length >= 13) {
      shrinkClass = 'shrink-9';
    } else if (str.length >= 10) {
      shrinkClass = 'shrink-7';
    }
    return `<td class="${align} ${extraClass} ${shrinkClass}" style="white-space: nowrap;">${str}</td>`;
  };

  const getRows = () => {
    const rows = detail.items.map((item) => {
      if (reportType === 'Multi GST Tax Invoice' && isSales) {
        return `
          <tr>
            <td class="left">${item.name || ''}</td>
            <td class="center">${item.hsnCode || ''}</td>
            ${renderNumCell(item.taka || 0)}
            ${renderNumCell(item.pallu || 0)}
            ${renderNumCell(num3(item.weight), 'right')}
            ${renderNumCell(num3(item.meter), 'right')}
            ${renderNumCell(money(item.amount), 'right')}
            ${renderNumCell(item.sgstRate ? num3(item.sgstRate) : '0.00')}
            ${renderNumCell(item.cgstRate ? num3(item.cgstRate) : '0.00')}
            ${renderNumCell(item.igstRate ? num3(item.igstRate) : '0.00')}
            ${renderNumCell(money(item.amount / ((item.meter || item.weight) || 1)), 'right')}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      } else if (isSales) {
        return `
          <tr>
            <td class="left">${item.name || ''}</td>
            <td class="center">${item.design || ''}</td>
            <td class="center">${item.hsnCode || ''}</td>
            ${renderNumCell(item.taka || 0)}
            ${renderNumCell(item.pallu || 0)}
            ${renderNumCell(num3(item.meter))}
            ${renderNumCell(num3(item.weight))}
            ${renderNumCell(money(item.amount / ((item.meter || item.weight) || 1)))}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      } else {
        return `
          <tr>
            <td class="left">${item.name || ''}</td>
            <td class="center">${item.design || ''}</td>
            <td class="center">${item.hsnCode || ''}</td>
            ${renderNumCell(item.nos || 0)}
            ${renderNumCell(num3(item.qty))}
            ${renderNumCell(item.cut || 0)}
            ${renderNumCell(money(item.amount / (item.qty || 1)))}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      }
    }).join('');
    // Filler expands inside the items table so Total stays page-bottom
    // when there are few lines (keeps vertical column rules through the gap).
    const itemCount = detail.items.length;
    const fillerMinMm = Math.max(18, Math.min(100, 108 - itemCount * 12));
    const emptyCells =
      reportType === 'Multi GST Tax Invoice' && isSales
        ? '<td class="left"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="right amount"></td>'
        : isSales
          ? '<td class="left"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="right amount"></td>'
          : '<td class="left"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="right amount"></td>';
    const fillerRow = `
      <tr class="filler-row" style="height: ${fillerMinMm}mm;">
        ${emptyCells}
      </tr>
    `;
    return rows + fillerRow;
  };

  const getGridHeader = () => {
    if (reportType === 'Multi GST Tax Invoice' && isSales) {
      return `
        <tr>
          <th class="left">Item Name</th>
          <th class="center">HSN</th>
          <th class="center">Crtn</th>
          <th class="center">Pallu</th>
          <th class="right">Weight</th>
          <th class="right">Cops</th>
          <th class="right">Total</th>
          <th class="center">% SGST</th>
          <th class="center">% CGST</th>
          <th class="center">% IGST</th>
          <th class="right">Rate</th>
          <th class="right">Amount</th>
        </tr>
      `;
    } else if (isSales) {
      return `
        <tr>
          <th class="left">Item Name</th>
          <th class="center">Design</th>
          <th class="center">HSN</th>
          <th class="center">Crtn</th>
          <th class="center">Pallu</th>
          <th class="center">Weight</th>
          <th class="center">Cops</th>
          <th class="center">Rate</th>
          <th class="right">Amount</th>
        </tr>
      `;
    } else {
      return `
        <tr>
          <th class="left">Item Name</th>
          <th class="center">Design</th>
          <th class="center">HSN</th>
          <th class="center">Nos</th>
          <th class="center">Qty</th>
          <th class="center">Cut</th>
          <th class="center">Rate</th>
          <th class="right">Amount</th>
        </tr>
      `;
    }
  };

  const getGridFooter = () => {
    if (reportType === 'Multi GST Tax Invoice' && isSales) {
      return `
        <tr class="footer-row">
          <td colspan="2" class="right" style="font-weight: bold;">Total</td>
          ${renderNumCell(totalTaka, 'center', 'fw-bold')}
          ${renderNumCell(totalPallu, 'center', 'fw-bold')}
          ${renderNumCell(num3(totalWeight), 'right', 'fw-bold')}
          ${renderNumCell(num3(totalMeter), 'right', 'fw-bold')}
          ${renderNumCell(money(detail.grandTotal), 'right', 'fw-bold')}
          <td class="center"></td>
          <td class="center"></td>
          <td class="center"></td>
          <td class="center"></td>
          ${renderNumCell(money(detail.grandTotal), 'right', 'amount fw-bold')}
        </tr>
      `;
    } else if (isSales) {
      return `
        <tr class="footer-row">
          <td colspan="3" class="right" style="font-weight: bold;">Total</td>
          ${renderNumCell(totalTaka, 'center', 'fw-bold')}
          ${renderNumCell(totalPallu, 'center', 'fw-bold')}
          ${renderNumCell(num3(totalMeter), 'center', 'fw-bold')}
          ${renderNumCell(num3(totalWeight), 'center', 'fw-bold')}
          <td class="center"></td>
          ${renderNumCell(money(detail.grandTotal), 'right', 'amount fw-bold')}
        </tr>
      `;
    } else {
      return `
        <tr class="footer-row">
          <td colspan="3" class="right" style="font-weight: bold;">Total</td>
          ${renderNumCell(totalNos, 'center', 'fw-bold')}
          ${renderNumCell(num3(totalQty), 'center', 'fw-bold')}
          ${renderNumCell(totalCut, 'center', 'fw-bold')}
          <td class="center"></td>
          ${renderNumCell(money(detail.grandTotal), 'right', 'amount fw-bold')}
        </tr>
      `;
    }
  };

  const company = useCompanyStore.getState().selectedCompany;
  const companyName = company?.name || 'COMPANY NAME';
  const gstNo = company?.gstinNo ? `GST No : ${company.gstinNo}` : '';
  const companyAddress = company?.city || '';
  
  const bank = company?.banks?.[0];
  const bankName = bank?.name || company?.bankName || '';
  const branchName = company?.branchName || '';
  const accountNo = company?.accountNo || '';
  const ifscCode = company?.ifscCode || '';

  const title = reportType.toUpperCase();
  
  
  const getTaxRate = (taxType: 'sgst' | 'cgst') => {
      const item = detail.items.find(i => taxType === 'sgst' ? i.sgstRate : i.cgstRate);
      if (item) {
          const r = taxType === 'sgst' ? item.sgstRate : item.cgstRate;
          return r ? `${num3(r)} %` : '0.00 %';
      }
      return '0.00 %';
  };

  const renderTaxRow = (label: string, value: number | undefined, withRate: boolean = false) => {
    if (value == null || value === 0) return '';
    if (withRate) {
        const rateLabel = getTaxRate(label.toLowerCase() as any);
        return `
          <div class="tot-row" style="padding-right: 0;">
             <div style="flex: 1; display: flex;">
                 <div class="tot-lbl" style="width: 50%;">${label}</div>
                 <div class="tot-lbl" style="width: 50%; border-right: 1px solid ${Colors.primary}; text-align: center;">${rateLabel}</div>
             </div>
             <div class="tot-val" style="width: 80px; text-align: right; padding-right: 10px;">${money(value)}</div>
          </div>
        `;
    }

    if (value == null || value === 0) return '';
    return `
      <div class="tot-row"><div class="tot-lbl">${label}</div><div class="tot-val">${money(value)}</div></div>
    `;
  };

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=794, initial-scale=1.0, user-scalable=yes" />
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
            -webkit-user-select: none;
            user-select: none;
            caret-color: transparent;
            background: #fff;
          }
          #pdf-page {
            width: 100%;
            max-width: 100%;
            padding: 0;
            background: #fff;
          }
          .container {
            border: 1px solid ${Colors.primary};
            display: flex;
            flex-direction: column;
            /* Fill at least one A4 content height; grow if many line items */
            min-height: 297mm;
            width: 100%;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid ${Colors.primary};
            padding: 10px;
            background-color: ${Colors.infoLight};
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          .company-address {
            font-size: 11px;
            margin-bottom: 2px;
            word-break: break-word;
            line-height: 1.35;
          }
          .gst-row {
            font-size: 11px;
            font-weight: bold;
            margin-top: 4px;
          }
          .title {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            padding: 8px 0;
            border-bottom: 1px solid ${Colors.primary};
            text-transform: uppercase;
          }
          .meta-row {
            padding: 5px 10px;
            border-bottom: 1px solid ${Colors.primary};
            font-size: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }
          .info-row {
            display: flex;
            border-bottom: 1px solid ${Colors.primary};
          }
          .info-col {
            flex: 1;
            min-width: 0;
            padding: 8px;
            border-right: 1px solid ${Colors.primary};
          }
          .info-col:last-child {
            border-right: none;
          }
          .info-label {
            font-size: 10px;
            color: #555555;
            margin-bottom: 2px;
            font-weight: bold;
          }
          .info-value {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 6px;
            word-break: break-word;
          }
          .info-address {
            font-size: 10px;
            word-break: break-word;
            line-height: 1.35;
          }
          .info-meta {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            font-size: 9px;
            background-color: ${Colors.infoLight};
            color: #1a1a1a;
            padding: 6px 2px;
            border-bottom: 1px solid ${Colors.primary};
            border-right: 1px solid ${Colors.primary};
            line-height: 1.15;
            white-space: nowrap;
          }
          th:last-child {
            border-right: none;
          }
          td {
            font-size: 11px;
            padding: 5px 2px;
            border-right: 1px solid ${Colors.primary};
            border-bottom: 1px solid #E6E6E6;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          td:last-child {
            border-right: none;
          }
          td.shrink-7 { font-size: 9px; }
          td.shrink-9 { font-size: 8px; letter-spacing: -0.2px; }
          .items-table.cols-12 td.shrink-7 { font-size: 6.5px; }
          .items-table.cols-12 td.shrink-9 { font-size: 5.5px; letter-spacing: -0.2px; }
          /* Sales: Auto-layout ensures columns precisely fit data, Item Name expands to fill */
          .items-table th, .items-table td {
            white-space: nowrap;
          }
          .items-table th:first-child, .items-table td:first-child {
            width: 100%;
            white-space: normal;
          }
          
          .items-table.cols-12 th, .items-table.cols-12 td { font-size: 8px; padding: 4px 2px; }
          
          /* Expandable blank band between last item and Total */
          .filler-row {
            height: 100%;
          }
          .filler-row td {
            height: 100%;
            border-bottom: none !important;
            vertical-align: top;
            padding-top: 0;
            padding-bottom: 0;
          }
          .grid-container table.items-table {
            height: 100%;
            flex: 1 1 auto;
          }
          .grid-container tbody {
            height: 100%;
          }
          .footer-row td {
            border-top: 1px solid ${Colors.primary};
            border-bottom: 1px solid ${Colors.primary};
            background: #fff;
          }
          .items-table.cols-9 th:nth-child(1),
          .items-table.cols-9 td:nth-child(1) { width: 24%; }
          .items-table.cols-9 th:nth-child(2),
          .items-table.cols-9 td:nth-child(2) { width: 13%; }
          .items-table.cols-9 th:nth-child(3),
          .items-table.cols-9 td:nth-child(3) { width: 8%; }
          .items-table.cols-9 th:nth-child(4),
          .items-table.cols-9 td:nth-child(4) { width: 6%; }
          .items-table.cols-9 th:nth-child(5),
          .items-table.cols-9 td:nth-child(5) { width: 6%; }
          .items-table.cols-9 th:nth-child(6),
          .items-table.cols-9 td:nth-child(6) { width: 10%; }
          .items-table.cols-9 th:nth-child(7),
          .items-table.cols-9 td:nth-child(7) { width: 10%; }
          .items-table.cols-9 th:nth-child(8),
          .items-table.cols-9 td:nth-child(8) { width: 9%; }
          .items-table.cols-9 th:nth-child(9),
          .items-table.cols-9 td:nth-child(9) { width: 14%; }
          /* Purchase / GP */
          .items-table.cols-8 th:nth-child(1),
          .items-table.cols-8 td:nth-child(1) { width: 26%; }
          .items-table.cols-8 th:nth-child(2),
          .items-table.cols-8 td:nth-child(2) { width: 16%; }
          .items-table.cols-8 th:nth-child(3),
          .items-table.cols-8 td:nth-child(3) { width: 8%; }
          .items-table.cols-8 th:nth-child(4),
          .items-table.cols-8 td:nth-child(4) { width: 7%; }
          .items-table.cols-8 th:nth-child(5),
          .items-table.cols-8 td:nth-child(5) { width: 10%; }
          .items-table.cols-8 th:nth-child(6),
          .items-table.cols-8 td:nth-child(6) { width: 8%; }
          .items-table.cols-8 th:nth-child(7),
          .items-table.cols-8 td:nth-child(7) { width: 10%; }
          .items-table.cols-8 th:nth-child(8),
          .items-table.cols-8 td:nth-child(8) { width: 15%; }
          .items-table td.amount,
          .items-table th:last-child,
          .items-table td:last-child {
            white-space: nowrap;
            overflow-wrap: normal;
            word-break: keep-all;
            padding-left: 4px;
            padding-right: 6px;
          }
          .grid-container {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            border-bottom: 1px solid ${Colors.primary};
          }
          .right { text-align: right; }
          .center { text-align: center; }
          .left { text-align: left; }
          .fw-bold { font-weight: bold !important; }
          
          .totals-block {
            display: flex;
            border-bottom: 1px solid ${Colors.primary};
          }
          .totals-left {
            flex: 1.5;
            border-right: 1px solid ${Colors.primary};
          }
          .totals-right {
            flex: 1;
            min-width: 0;
          }
          .tot-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 5px 10px;
            border-bottom: 1px solid #E6E6E6;
          }
          .tot-lbl {
            font-weight: bold;
            font-size: 11px;
          }
          .tot-val {
            font-size: 11px;
            white-space: nowrap;
          }
          .tot-grand {
            background-color: ${Colors.infoLight};
            border-bottom: none;
            padding: 8px 10px;
          }
          .tot-grand .tot-lbl, .tot-grand .tot-val {
            font-size: 13px;
            color: #1a1a1a;
          }
          
          .footer {
            display: flex;
            margin-top: auto;
            gap: 8px;
          }
          .bank-details, .signatory {
            flex: 1;
            min-width: 0;
            padding: 10px;
          }
          .signatory {
            text-align: right;
          }
          .bank-title, .sign-title {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 12px;
          }
          .bank-row {
            font-size: 11px;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .bank-lbl {
            display: inline-block;
            width: 90px;
          }
          .sign-note {
            font-size: 10px;
            margin-top: 10px;
          }
          .auth-sign {
            font-weight: bold;
            font-size: 12px;
            margin-top: 36px;
          }
        </style>
      </head>
      <body>
        <div id="pdf-page">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${companyName}</div>
            ${gstNo ? `<div class="gst-row">${gstNo}</div>` : ''}
            <div class="company-address">${companyAddress}</div>
          </div>
          <div class="title">${title}</div>
          
                    <div class="meta-row" style="flex-direction: column; gap: 4px;">
            <div style="width: 100%;">Ack No : ${detail.ackNo || ''}</div>
            <div style="width: 100%; word-break: break-all;">IRN : ${detail.irn || ''}</div>
          </div>

                    <div class="info-row">
            <div class="info-col">
              <div class="info-label">Bill To:</div>
              <div class="info-value">${detail.partyName}</div>
              <div class="info-address">ADD:- ${detail.partyAddress || ''}</div>
              <br/>
              <div class="info-address">Broker : ${detail.brokerName || 'DIRECT'}</div>
              <div class="info-address">GST No : ${detail.gstNo || ''}</div>
              <div class="info-address">Mo : ${detail.mobileNo || ''}</div>
            </div>
            <div class="info-col">
              <div class="info-label">Delivery At:</div>
              <div class="info-value">${detail.deliveryPartyName || detail.partyName}</div>
              <div class="info-address">ADD:- ${detail.partyAddress || ''}</div>
              <br/>
              <div class="info-address">GST No : ${detail.gstNo || ''}</div>
              <div class="info-address">Mo : ${detail.mobileNo || ''}</div>
            </div>
            <div class="info-col" style="flex: 0.6;">
              <div class="info-meta">Invoice No: ${detail.invoiceNo}</div>
              <div class="info-meta">Date: ${toDDMMYYYY(detail.date)}</div>
            </div>
          </div>

          <div class="meta-row">
            <div style="margin-right: 20px;">| Vehical No: ${detail.vehicalNo || ''}</div>
            <div>| Eway Bill No: ${detail.ewayBillNo || ''}</div>
          </div>

          <!-- Grid: items + expandable filler + Total -->
          <div class="grid-container">
            <table class="items-table ${reportType === 'Multi GST Tax Invoice' && isSales ? 'cols-12' : isSales ? 'cols-9' : 'cols-8'}">
              <thead>
                ${getGridHeader()}
              </thead>
              <tbody>
                ${getRows()}
                ${getGridFooter()}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="totals-block">
            <div class="totals-left"></div>
            <div class="totals-right">
              <div class="tot-row"><div class="tot-lbl">Grant Total</div><div class="tot-val">${money(detail.grandTotal)}</div></div>
              ${renderTaxRow('Discount', detail.discount)}
              ${renderTaxRow('Add Other', detail.addOther1)}
              ${renderTaxRow('Freight', detail.freight)}
              ${renderTaxRow('IGST', detail.igst)}
              ${renderTaxRow('SGST', detail.sgst, true)}
              ${renderTaxRow('CGST', detail.cgst, true)}
              ${renderTaxRow('Freight', detail.bFreight)}
              ${renderTaxRow('Add Other', detail.addOther2)}
              ${renderTaxRow('Add Less', detail.addLess)}
              ${renderTaxRow('TCS', detail.tcs)}
              ${renderTaxRow('Round Off', detail.roundOf)}
              <div class="tot-row" style="border-bottom: none;"><div class="tot-lbl" style="border-right: 1px solid ${Colors.primary};">Net Amount</div><div class="tot-val">${money(detail.netAmount)}</div></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="bank-details">
              <div class="bank-title">Bank Details</div>
              <div class="bank-row"><span class="bank-lbl">Bank Name</span><span>: ${bankName}</span></div>
              <div class="bank-row"><span class="bank-lbl">Branch</span><span>: ${branchName}</span></div>
              <div class="bank-row"><span class="bank-lbl">Account No</span><span>: ${accountNo}</span></div>
              <div class="bank-row"><span class="bank-lbl">IFSC Code</span><span>: ${ifscCode}</span></div>
            </div>
            <div class="signatory">
              <div class="sign-title">For, ${companyName}</div>
              <div class="sign-note">* This is computer generated Invoice. Signature Not Required</div>
              <div class="auth-sign">Authorised Signatory</div>
            </div>
          </div>
          
        </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Instead of using native print preview, we dispatch the HTML to our custom in-app global modal
    usePdfStore.getState().openPreview(html);
  } catch (error) {
    console.error("Failed to generate or share Invoice PDF", error);
  }
};
