import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { toDDMMYYYY } from './formatDate';
import type { BillDetail, Company } from '../types';
import type { BillModule } from '../components/BillDetailView';
import { usePdfStore } from '../store/usePdfStore';
import { useCompanyStore } from '../store/companyStore';
import { formatPdfFileName } from './pdfFileName';
import { standardSalesQtyColumns } from './salesBillColumns';
import { Colors } from '../theme';

const escapeHtml = (str: string | number | undefined | null): string => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const generateInvoiceHTML = (detail: BillDetail, module: BillModule, reportType: string = 'Tax Invoice', company?: Company | null): string => {
  const money = (n: number | undefined) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const num3 = (n: number | undefined) => (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  
  const isSales = module === 'sales';
  const salesQtyColumns = standardSalesQtyColumns(detail);
  
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
    const cutVal = item.cut != null && item.cut > 0 
      ? item.cut 
      : (item.weight != null && item.weight > 0 ? item.weight : (item.taka ? (item.meter || 0) / item.taka : 0));
    totalCut += cutVal;
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

  // Short invoices keep the full-page frame. Long ones must grow in normal
  // flow: a fixed frame (max-height + a shrinking flex child) paints item
  // rows on top of the totals and footer instead of starting another page.
  const singlePage = (() => {
    const shown = (n: number | undefined) => n != null && n !== 0;
    const taxLines = [
      detail.discount, detail.addOther1, detail.freight, detail.igst, detail.sgst,
      detail.cgst, detail.bFreight, detail.addOther2, detail.addLess, detail.tcs, detail.roundOf,
    ].filter(shown).length;
    const addressLines = Math.max(1, Math.ceil(String(detail.partyAddress || '').length / 40));
    const nameChars = reportType === 'Multi GST Tax Invoice' && isSales ? 22 : isSales ? 42 : 30;
    const rowMm = 6.8;
    const itemsMm = detail.items.reduce((sum, item) => {
      const nameLines = Math.max(1, Math.ceil(String(item.name || '').length / nameChars));
      const designLines = !isSales ? Math.max(1, Math.ceil(String(item.design || '').length / 16)) : 1;
      return sum + rowMm * Math.max(nameLines, designLines);
    }, 0);
    const headerMm = 86 + Math.max(0, addressLines - 2) * 4.5 + (String(detail.irn || '').length > 60 ? 4 : 0);
    const totalsMm = 18 + taxLines * 6.5;
    const bankMm = 34;
    const tableChromeMm = 16;
    return headerMm + itemsMm + tableChromeMm + totalsMm + bankMm < 236;
  })();

  const getRows = () => {
    const rows = detail.items.map((item) => {
      if (reportType === 'Multi GST Tax Invoice' && isSales) {
        const itemRate = item.rate != null && item.rate > 0 
          ? item.rate 
          : (item.amount / ((item.meter || item.weight) || 1));
        return `
          <tr>
            <td class="left">${escapeHtml(item.name || '')}</td>
            <td class="center">${escapeHtml(item.hsnCode || '')}</td>
            ${renderNumCell(item.taka || 0)}
            ${renderNumCell(item.pallu || 0)}
            ${renderNumCell(num3(item.weight), 'right')}
            ${renderNumCell(num3(item.meter), 'right')}
            ${renderNumCell(money(item.amount), 'right')}
            ${renderNumCell(item.sgstRate ? num3(item.sgstRate) : '0.00')}
            ${renderNumCell(item.cgstRate ? num3(item.cgstRate) : '0.00')}
            ${renderNumCell(item.igstRate ? num3(item.igstRate) : '0.00')}
            ${renderNumCell(money(itemRate), 'right')}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      } else if (isSales) {
        const itemRate = item.rate != null && item.rate > 0 
          ? item.rate 
          : (item.amount / ((item.meter || item.weight) || 1));
        const qtyCells = salesQtyColumns.map((col) => renderNumCell(
          col.fractionDigits === 3 ? num3(col.value(item)) : (col.value(item) || 0),
          col.fractionDigits === 3 ? 'right' : 'center',
        )).join('');
        return `
          <tr>
            <td class="left">${escapeHtml(item.name || '')}</td>
            ${qtyCells}
            ${renderNumCell(money(itemRate), 'right')}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      } else {
        const itemRate = item.rate != null && item.rate > 0 
          ? item.rate 
          : (item.qty ? item.amount / item.qty : 0);
        return `
          <tr>
            <td class="left">${escapeHtml(item.name || '')}</td>
            <td class="center">${escapeHtml(item.design || '')}</td>
            <td class="center">${escapeHtml(item.hsnCode || '')}</td>
            ${renderNumCell(item.nos || 0)}
            ${renderNumCell(num3(item.qty))}
            ${renderNumCell(item.cut || 0)}
            ${renderNumCell(money(itemRate), 'right')}
            ${renderNumCell(money(item.amount), 'right', 'amount')}
          </tr>
        `;
      }
    }).join('');

    // Filler only on a short page, so the Total row can sit near the bottom.
    // Long invoices get no filler — an expanding row would push into the footer.
    const itemCount = detail.items.length;
    const fillerMinMm = singlePage && itemCount <= 4 ? Math.max(0, 24 - itemCount * 5) : 0;
    const emptyCells =
      reportType === 'Multi GST Tax Invoice' && isSales
        ? '<td class="left"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="right amount"></td>'
        : isSales
          ? `<td class="left"></td>${salesQtyColumns.map(() => '<td class="center"></td>').join('')}<td class="right"></td><td class="right amount"></td>`
          : '<td class="left"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td><td class="right amount"></td>';
    const fillerRow = fillerMinMm > 0 ? `
      <tr class="filler-row" style="height: ${fillerMinMm}mm;">
        ${emptyCells}
      </tr>
    ` : '';
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
      const qtyHeaders = salesQtyColumns.map((col) =>
        `<th class="${col.fractionDigits === 3 ? 'right' : 'center'}">${escapeHtml(col.label)}</th>`,
      ).join('');
      return `
        <tr>
          <th class="left">Item Name</th>
          ${qtyHeaders}
          <th class="right">Rate</th>
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
      const qtyTotals = { taka: totalTaka, pallu: totalPallu, weight: totalWeight, meter: totalMeter };
      const qtyFooter = salesQtyColumns.map((col) => renderNumCell(
        col.fractionDigits === 3 ? num3(qtyTotals[col.key]) : qtyTotals[col.key],
        col.fractionDigits === 3 ? 'right' : 'center',
        'fw-bold',
      )).join('');
      return `
        <tr class="footer-row">
          <td class="right" style="font-weight: bold;">Total</td>
          ${qtyFooter}
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

  const resolvedCompany = company ?? useCompanyStore.getState().selectedCompany;
  const companyName = resolvedCompany?.name || 'COMPANY NAME';
  const gstNo = resolvedCompany?.gstinNo ? `GST No : ${resolvedCompany.gstinNo}` : '';
  const companyAddress = resolvedCompany?.city || '';
  
  // Prioritize actual company bank name; avoid CASH A/C when valid bank name is available
  const nonCashBank = resolvedCompany?.banks?.find(b => b.name && !b.name.toUpperCase().includes('CASH'));
  const bankName = (resolvedCompany?.bankName && !resolvedCompany.bankName.toUpperCase().includes('CASH'))
    ? resolvedCompany.bankName
    : (nonCashBank?.name || resolvedCompany?.bankName || resolvedCompany?.banks?.[0]?.name || '');
  const branchName = resolvedCompany?.branchName || '';
  const accountNo = resolvedCompany?.accountNo || '';
  const ifscCode = resolvedCompany?.ifscCode || '';

  const title = reportType.toUpperCase();
  
  const getTaxRate = (taxType: 'sgst' | 'cgst' | 'igst') => {
    if (taxType === 'igst' && detail.igstPerc != null && detail.igstPerc > 0) {
      return `${detail.igstPerc.toFixed(2).padStart(5, '0')} %`;
    }
    if (taxType === 'sgst' && detail.sgstPerc != null && detail.sgstPerc > 0) {
      return `${detail.sgstPerc.toFixed(2).padStart(5, '0')} %`;
    }
    if (taxType === 'cgst' && detail.cgstPerc != null && detail.cgstPerc > 0) {
      return `${detail.cgstPerc.toFixed(2).padStart(5, '0')} %`;
    }
    const item = detail.items.find(i => taxType === 'sgst' ? i.sgstRate : taxType === 'cgst' ? i.cgstRate : i.igstRate);
    if (item) {
      const r = taxType === 'sgst' ? item.sgstRate : taxType === 'cgst' ? item.cgstRate : item.igstRate;
      return r ? `${(r).toFixed(2).padStart(5, '0')} %` : '00.00 %';
    }
    return '';
  };

  const renderTaxRow = (label: string, value: number | undefined, withRate: boolean = false) => {
    if (value == null || value === 0) return '';
    if (withRate) {
      const rateLabel = getTaxRate(label.toLowerCase() as any);
      return `
        <div class="tot-row" style="padding-right: 0;">
           <div style="flex: 1; display: flex;">
               <div class="tot-lbl" style="width: 50%;">${label}</div>
               <div class="tot-lbl" style="width: 50%; border-right: 1px solid #d0d0d0; text-align: center;">${rateLabel}</div>
           </div>
           <div class="tot-val" style="width: 90px; text-align: right; padding-right: 8px;">${money(value)}</div>
        </div>
      `;
    }

    return `
      <div class="tot-row"><div class="tot-lbl">${label}</div><div class="tot-val">${money(value)}</div></div>
    `;
  };

  const ackDateFormatted = detail.ackDate ? toDDMMYYYY(detail.ackDate) : (detail.date ? toDDMMYYYY(detail.date) : '');
  const ackText = detail.ackNo
    ? (detail.ackNo.includes(' - ') || !ackDateFormatted ? detail.ackNo : `${detail.ackNo} - ${ackDateFormatted}`)
    : '';

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=794, initial-scale=1.0, user-scalable=yes" />
        <style>
          @page {
            size: A4;
            margin: 6mm 7mm;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            font-size: 10.5px;
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
            border: 1px solid #2b5797;
            width: 100%;
            box-sizing: border-box;
            height: auto;
            max-height: none;
            overflow: visible;
          }
          /* Short invoices: stretch the items area so the Total row and
             footer sit at the bottom of a single A4 frame. */
          .container.fit-page {
            display: flex;
            flex-direction: column;
            min-height: 265mm;
          }
          .container.fit-page .header,
          .container.fit-page .title,
          .container.fit-page .meta-row,
          .container.fit-page .info-row,
          .container.fit-page .invoice-close {
            flex-shrink: 0;
          }
          /* Long invoices: block flow so the table can break onto the next
             page. A flex column with a fixed height overlaps the footer. */
          .container.flow-pages {
            display: block;
            min-height: 0;
            height: auto;
            max-height: none;
            overflow: visible;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #2b5797;
            padding: 8px 10px;
            background-color: ${Colors.infoLight};
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 3px;
          }
          .company-address {
            font-size: 10.5px;
            margin-bottom: 2px;
            word-break: break-word;
            line-height: 1.3;
          }
          .gst-row {
            font-size: 10.5px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .title {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            padding: 6px 0;
            border-bottom: 1px solid #2b5797;
            text-transform: uppercase;
            background-color: #f7f9fd;
          }
          .meta-row {
            padding: 4px 10px;
            border-bottom: 1px solid #2b5797;
            font-size: 9.5px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }
          .info-row {
            display: flex;
            border-bottom: 1px solid #2b5797;
          }
          .info-col {
            flex: 1;
            min-width: 0;
            padding: 6px 10px;
            border-right: 1px solid #2b5797;
          }
          .info-col:last-child {
            border-right: none;
          }
          .info-label {
            font-size: 9.5px;
            color: #555555;
            margin-bottom: 2px;
            font-weight: bold;
          }
          .info-value {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 3px;
            word-break: break-word;
          }
          .info-address {
            font-size: 9.5px;
            word-break: break-word;
            line-height: 1.3;
            margin-bottom: 6px;
          }
          .info-meta-sub {
            font-size: 9.5px;
            line-height: 1.35;
          }
          .info-invoice-box {
            flex: 0.7;
            padding: 0;
            display: flex;
            flex-direction: column;
          }
          .invoice-box-cell {
            padding: 6px 10px;
            font-weight: bold;
            font-size: 11px;
          }
          .invoice-box-no {
            border-bottom: 1px solid #2b5797;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .items-table {
            page-break-inside: auto;
            break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tbody {
            display: table-row-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: auto;
            break-after: auto;
          }
          th {
            font-size: 9.5px;
            background-color: #2b5797;
            color: #ffffff;
            font-weight: bold;
            padding: 5px 3px;
            border-bottom: 1px solid #2b5797;
            border-right: 1px solid #ffffff;
            line-height: 1.2;
            white-space: nowrap;
          }
          th:last-child {
            border-right: none;
          }
          td {
            font-size: 10px;
            padding: 4px 3px;
            border-right: 1px solid #d0d0d0;
            border-bottom: 1px solid #e0e0e0;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          td:last-child {
            border-right: none;
          }
          td.shrink-7 { font-size: 8.5px; }
          td.shrink-9 { font-size: 7.5px; letter-spacing: -0.2px; }
          .items-table.cols-12 th, .items-table.cols-12 td { font-size: 7.5px; padding: 3px 2px; }
          .items-table.cols-12 td.shrink-7 { font-size: 6px; }
          .items-table.cols-12 td.shrink-9 { font-size: 5px; letter-spacing: -0.2px; }
          .items-table th, .items-table td {
            white-space: nowrap;
          }
          .items-table th:first-child, .items-table td:first-child {
            width: 100%;
            white-space: normal;
          }
          .container.fit-page .filler-row {
            height: 100%;
          }
          .filler-row td {
            border-bottom: none !important;
            vertical-align: top;
            padding-top: 0;
            padding-bottom: 0;
          }
          .container.fit-page .filler-row td {
            height: 100%;
          }
          .container.fit-page .grid-container table.items-table {
            height: 100%;
            flex: 1 1 auto;
          }
          .container.fit-page .grid-container tbody {
            height: 100%;
          }
          .container.flow-pages .items-table,
          .container.flow-pages .filler-row {
            height: auto;
            max-height: none;
          }
          .footer-row td {
            border-top: 1px solid #2b5797;
            border-bottom: 1px solid #2b5797;
            background: #fff;
          }
          /* Sales 6 cols: Item | field1 | Pallu | field2/weight | field3/meter | Amount */
          .items-table.cols-6-sales th:nth-child(1),
          .items-table.cols-6-sales td:nth-child(1) { width: 38%; }
          .items-table.cols-6-sales th:nth-child(2),
          .items-table.cols-6-sales td:nth-child(2) { width: 10%; }
          .items-table.cols-6-sales th:nth-child(3),
          .items-table.cols-6-sales td:nth-child(3) { width: 10%; }
          .items-table.cols-6-sales th:nth-child(4),
          .items-table.cols-6-sales td:nth-child(4) { width: 13%; }
          .items-table.cols-6-sales th:nth-child(5),
          .items-table.cols-6-sales td:nth-child(5) { width: 14%; }
          .items-table.cols-6-sales th:nth-child(6),
          .items-table.cols-6-sales td:nth-child(6) { width: 15%; }

          /* Purchase / GP 8 cols */
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
            border-bottom: 1px solid #2b5797;
            overflow: visible;
            page-break-inside: auto;
            break-inside: auto;
          }
          .container.fit-page .grid-container {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: auto;
          }
          .container.flow-pages .grid-container {
            display: block;
            height: auto;
            min-height: auto;
            max-height: none;
            overflow: visible;
          }
          .right { text-align: right; }
          .center { text-align: center; }
          .left { text-align: left; }
          .fw-bold { font-weight: bold !important; }
          
          .totals-block {
            display: flex;
            border-bottom: 1px solid #2b5797;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .totals-left {
            flex: 1.4;
            border-right: 1px solid #2b5797;
          }
          .totals-right {
            flex: 1;
            min-width: 0;
          }
          .tot-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 3px 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          .tot-lbl {
            font-weight: bold;
            font-size: 10.5px;
          }
          .tot-val {
            font-size: 10.5px;
            white-space: nowrap;
          }
          .tot-net {
            background-color: ${Colors.infoLight};
            border-bottom: none;
            padding: 5px 8px;
          }
          .tot-net .tot-lbl, .tot-net .tot-val {
            font-size: 12px;
            font-weight: bold;
            color: #1a1a1a;
          }
          
          .invoice-close {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .footer {
            display: flex;
            margin-top: auto;
            gap: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .container.flow-pages .footer {
            margin-top: 0;
          }
          @media print {
            .container.flow-pages,
            .container.flow-pages .grid-container {
              display: block !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }
            .container.flow-pages .items-table {
              height: auto !important;
            }
          }
          .bank-details, .signatory {
            flex: 1;
            min-width: 0;
            padding: 6px 10px;
          }
          .signatory {
            text-align: right;
          }
          .bank-title, .sign-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 11px;
          }
          .bank-row {
            font-size: 10px;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .bank-lbl {
            display: inline-block;
            width: 85px;
          }
          .sign-note {
            font-size: 9.5px;
            margin-top: 6px;
          }
          .auth-sign {
            font-weight: bold;
            font-size: 11px;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div id="pdf-page">
        <div class="container ${singlePage ? 'fit-page' : 'flow-pages'}">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${escapeHtml(companyName)}</div>
            ${gstNo ? `<div class="gst-row">${escapeHtml(gstNo)}</div>` : ''}
            <div class="company-address">${escapeHtml(companyAddress)}</div>
          </div>
          <div class="title">${escapeHtml(title)}</div>
          
          <div class="meta-row" style="flex-direction: column; gap: 4px;">
            <div style="width: 100%;">Ack No : ${escapeHtml(ackText)}</div>
            <div style="width: 100%; word-break: break-all;">IRN : ${escapeHtml(detail.irn || '')}</div>
          </div>

          <div class="info-row">
            <div class="info-col">
              <div class="info-label">Bill To:</div>
              <div class="info-value">${escapeHtml(detail.partyName)}</div>
              <div class="info-address">${escapeHtml(detail.partyAddress || '')}</div>
              <div class="info-meta-sub">
                ${detail.brokerName ? `<div>Broker : ${escapeHtml(detail.brokerName)}</div>` : ''}
                ${detail.gstNo ? `<div>GST No : ${escapeHtml(detail.gstNo)}</div>` : ''}
                <div>Mo : ${escapeHtml(detail.mobileNo || '')}</div>
              </div>
            </div>
            <div class="info-col">
              <div class="info-label">Delivery At:</div>
              <div class="info-value">${escapeHtml(detail.deliveryPartyName || detail.partyName)}</div>
              <div class="info-address">${escapeHtml(detail.partyAddress || '')}</div>
              <div class="info-meta-sub">
                ${detail.gstNo ? `<div>GST No : ${escapeHtml(detail.gstNo)}</div>` : ''}
                <div>Mo : ${escapeHtml(detail.mobileNo || '')}</div>
              </div>
            </div>
            <div class="info-col info-invoice-box">
              <div class="invoice-box-cell invoice-box-no">Invoice No: ${escapeHtml(detail.invoiceNo)}</div>
              <div class="invoice-box-cell invoice-box-date">Date: ${toDDMMYYYY(detail.date)}</div>
            </div>
          </div>

          <div class="meta-row">
            <div style="margin-right: 20px;">| Transporter : ${escapeHtml(
              (detail.transporter || detail.vehicalNo || '').replace(/<[^>]*>/g, '').trim().toLowerCase() === 'select'
                ? ''
                : (detail.transporter || detail.vehicalNo || '').replace(/<[^>]*>/g, '').trim()
            )}</div>
            <div>| Eway Bill No: ${escapeHtml(detail.ewayBillNo || '')}</div>
          </div>

          <!-- Grid: items + expandable filler + Total -->
          <div class="grid-container">
            <table class="items-table ${reportType === 'Multi GST Tax Invoice' && isSales ? 'cols-12' : isSales ? 'cols-6-sales' : 'cols-8'}">
              <thead>
                ${getGridHeader()}
              </thead>
              <tbody>
                ${getRows()}
                ${getGridFooter()}
              </tbody>
            </table>
          </div>

          <!-- Totals + footer stay together and follow the item rows -->
          <div class="invoice-close">
          <div class="totals-block">
            <div class="totals-left"></div>
            <div class="totals-right">
              <div class="tot-row"><div class="tot-lbl">Grant Total</div><div class="tot-val">${money(detail.grandTotal)}</div></div>
              ${renderTaxRow('Discount', detail.discount)}
              ${renderTaxRow('Add Other', detail.addOther1)}
              ${renderTaxRow('Freight', detail.freight)}
              ${renderTaxRow('IGST', detail.igst, true)}
              ${renderTaxRow('SGST', detail.sgst, true)}
              ${renderTaxRow('CGST', detail.cgst, true)}
              ${renderTaxRow('Freight', detail.bFreight)}
              ${renderTaxRow('Add Other', detail.addOther2)}
              ${renderTaxRow('Add Less', detail.addLess)}
              ${renderTaxRow('TCS', detail.tcs)}
              ${renderTaxRow('Round Off', detail.roundOf)}
              <div class="tot-row tot-net"><div class="tot-lbl">Net Amount</div><div class="tot-val">${money(detail.netAmount)}</div></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="bank-details">
              <div class="bank-title">Bank Details</div>
              <div class="bank-row"><span class="bank-lbl">Bank Name</span><span>: ${escapeHtml(bankName)}</span></div>
              <div class="bank-row"><span class="bank-lbl">Branch</span><span>: ${escapeHtml(branchName)}</span></div>
              <div class="bank-row"><span class="bank-lbl">Account No</span><span>: ${escapeHtml(accountNo)}</span></div>
              <div class="bank-row"><span class="bank-lbl">IFSC Code</span><span>: ${escapeHtml(ifscCode)}</span></div>
            </div>
            <div class="signatory">
              <div class="sign-title">For, ${escapeHtml(companyName)}</div>
              <div class="sign-note">* This is computer generated Invoice. Signature Not Required</div>
              <div class="auth-sign">Authorised Signatory</div>
            </div>
          </div>
          </div>
          
        </div>
        </div>
      </body>
    </html>
  `;

  return html;
};

export const generateInvoicePDF = async (detail: BillDetail, module: BillModule, reportType: string = 'Tax Invoice') => {
  const company = useCompanyStore.getState().selectedCompany;
  const html = generateInvoiceHTML(detail, module, reportType, company);

  try {
    let prefix = 'sales_invoice';
    if (module === 'purchase') {
      prefix = 'purchase_bill';
    } else if (module === 'gp') {
      prefix = 'gp_bill';
    }
    const billNo = detail.invoiceNo || detail.id || '';
    const fileName = formatPdfFileName(prefix, billNo);

    // Instead of using native print preview, we dispatch the HTML to our custom in-app global modal
    usePdfStore.getState().openPreview(html, fileName);
  } catch (error) {
    console.error("Failed to generate or share Invoice PDF", error);
  }
};
