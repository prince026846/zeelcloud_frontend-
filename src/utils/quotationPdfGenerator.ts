import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { toDDMMYYYY } from './formatDate';
import type { Quotation, Company } from '../types';
import { usePdfStore } from '../store/usePdfStore';
import { formatPdfFileName } from './pdfFileName';
import { Colors } from '../theme';

/**
 * Converts a positive number to Indian Rupees in words.
 */
export const numberToWordsINR = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (val: number): string => {
    let str = '';
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + 'Crore ';
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + 'Lakh ';
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + 'Thousand ';
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + 'Hundred ';
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) {
        str += a[val];
      } else {
        str += b[Math.floor(val / 10)] + ' ' + a[val % 10];
      }
    }
    return str;
  };

  const rupees = inWords(n).trim();
  const paise = Math.round((Math.abs(num) - n) * 100);
  let result = `${rupees} Rupees`;
  if (paise > 0) {
    result += ` and ${inWords(paise).trim()} Paise`;
  }
  return `${result} Only`;
};

export const generateQuotationHTML = (quotation: Quotation, company?: Company | null): string => {
  const money = (n: number | undefined | null) =>
    (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  const companyName = company?.name || 'ZEEL INFOTECH';
  const companyAddress = company?.city || '';
  const companyGst = company?.gstinNo || '';
  const companyPhone = '';
  const companyEmail = '';

  const subtotal = quotation.subtotal || 0;
  const discountAmount = quotation.discountAmount || 0;
  const totalGst = quotation.totalGstAmount || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const netAmount = quotation.totalAmount || 0;

  const rows = quotation.items.map((item, index) => {
    const itemTotal = item.amount || 0;
    const hasImage = !!item.imageUrl;
    const imageTag = hasImage
      ? `<img src="${item.imageUrl}" class="item-thumb" alt="${item.itemName}" />`
      : '';

    return `
      <tr>
        <td class="center" style="width: 35px;">${index + 1}</td>
        <td class="left">
          <div class="item-name-wrap">
            ${imageTag}
            <div>
              <div class="item-name">${item.itemName || '—'}</div>
              ${item.narration ? `<div class="item-narration">${item.narration}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="center" style="width: 70px;">${item.batchNo || '—'}</td>
        <td class="right" style="width: 65px;">${item.mrp ? money(item.mrp) : '—'}</td>
        <td class="right" style="width: 65px;">${money(item.rate)}</td>
        <td class="center" style="width: 50px;">${item.quantity || 1}</td>
        <td class="center" style="width: 55px;">${item.gstPercentage ? item.gstPercentage + '%' : '0%'}</td>
        <td class="right amount" style="width: 80px;">${money(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  const fillerCount = Math.max(0, 5 - quotation.items.length);
  let fillerRows = '';
  for (let i = 0; i < fillerCount; i++) {
    fillerRows += `
      <tr class="filler-row" style="height: 32px;">
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Quotation - ${quotation.quotationNo}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 10px;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          .page-container {
            width: 100%;
            max-width: 794px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 18px 24px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid ${Colors.primary};
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .company-block h1 {
            margin: 0 0 4px 0;
            font-size: 20px;
            font-weight: 700;
            color: ${Colors.primary};
            letter-spacing: 0.5px;
          }
          .company-details {
            font-size: 10px;
            color: #475569;
            line-height: 1.35;
          }
          .doc-title-block {
            text-align: right;
          }
          .doc-badge {
            display: inline-block;
            background: ${Colors.primary};
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            padding: 4px 14px;
            border-radius: 4px;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .doc-no {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .doc-date {
            font-size: 10px;
            color: #64748b;
          }

          .meta-grid {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            gap: 16px;
          }
          .meta-col {
            flex: 1;
          }
          .meta-col h3 {
            margin: 0 0 4px 0;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${Colors.primary};
          }
          .party-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .meta-text {
            font-size: 10px;
            color: #475569;
            line-height: 1.35;
          }

          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          table.items-table th {
            background: ${Colors.primary};
            color: #ffffff;
            font-weight: 600;
            font-size: 10px;
            padding: 6px 8px;
            text-transform: uppercase;
            border: 1px solid ${Colors.primary};
          }
          table.items-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-size: 10px;
            vertical-align: middle;
          }
          .left { text-align: left; }
          .center { text-align: center; }
          .right { text-align: right; }
          .amount { font-weight: 600; color: #0f172a; }

          .item-name-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .item-thumb {
            width: 36px;
            height: 36px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .item-name {
            font-weight: 600;
            color: #0f172a;
          }
          .item-narration {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
          }

          .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 14px;
          }
          .notes-block {
            flex: 1.2;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
          }
          .notes-title {
            font-size: 10px;
            font-weight: 700;
            color: ${Colors.primary};
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .notes-content {
            font-size: 10px;
            color: #475569;
            line-height: 1.4;
          }
          .words-block {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9.5px;
            color: #334155;
            font-weight: 600;
          }

          .totals-block {
            flex: 0.9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 10px;
            font-size: 10px;
            border-bottom: 1px solid #f1f5f9;
          }
          .totals-row.net {
            background: ${Colors.primary};
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            border-bottom: none;
            padding: 8px 10px;
          }
          .totals-lbl { color: #475569; }
          .totals-val { font-weight: 600; color: #0f172a; }
          .totals-row.net .totals-lbl { color: #ffffff; }
          .totals-row.net .totals-val { color: #ffffff; }

          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
          }
          .terms {
            font-size: 8.5px;
            color: #64748b;
            line-height: 1.35;
            max-width: 60%;
          }
          .terms ul {
            margin: 2px 0 0 14px;
            padding: 0;
          }
          .sign-block {
            text-align: right;
          }
          .sign-for {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .sign-space {
            height: 40px;
          }
          .sign-text {
            font-size: 9px;
            color: #475569;
            border-top: 1px solid #94a3b8;
            display: inline-block;
            padding-top: 3px;
          }
        </style>
      </head>
      <body>
        <div class="page-container" id="pdf-page">
          <!-- Header -->
          <div class="header">
            <div class="company-block">
              <h1>${companyName}</h1>
              <div class="company-details">
                ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                ${companyPhone ? `<div>Phone: ${companyPhone}</div>` : ''}
                ${companyEmail ? `<div>Email: ${companyEmail}</div>` : ''}
                ${companyGst ? `<div>GSTIN: ${companyGst}</div>` : ''}
              </div>
            </div>
            <div class="doc-title-block">
              <div class="doc-badge">QUOTATION</div>
              <div class="doc-no">No: ${quotation.quotationNo}</div>
              <div class="doc-date">Date: ${toDDMMYYYY(quotation.date)}</div>
            </div>
          </div>

          <!-- Metadata / Party Grid -->
          <div class="meta-grid">
            <div class="meta-col">
              <h3>Quotation For (Client)</h3>
              <div class="party-name">${quotation.partyName || 'Cash / Counter Customer'}</div>
              ${quotation.partyAddress ? `<div class="meta-text">${quotation.partyAddress}</div>` : ''}
              ${quotation.contactNo ? `<div class="meta-text">Contact: ${quotation.contactNo}</div>` : ''}
              ${quotation.email ? `<div class="meta-text">Email: ${quotation.email}</div>` : ''}
            </div>
            <div class="meta-col" style="max-width: 200px;">
              <h3>Reference</h3>
              <div class="meta-text">Valid For: 15 Days</div>
              <div class="meta-text">Status: Confirmed</div>
              ${quotation.ccEmail ? `<div class="meta-text">CC: ${quotation.ccEmail}</div>` : ''}
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="center">#</th>
                <th class="left">Item Description</th>
                <th class="center">Batch</th>
                <th class="right">MRP (₹)</th>
                <th class="right">Rate (₹)</th>
                <th class="center">Qty</th>
                <th class="center">GST</th>
                <th class="right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${fillerRows}
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div class="summary-section">
            <div class="notes-block">
              <div class="notes-title">Remarks / Instructions</div>
              <div class="notes-content">
                ${quotation.remark ? quotation.remark : 'Thank you for your business inquiry. Please contact us for any clarifications.'}
              </div>
              <div class="words-block">
                Amount in Words: <em>${numberToWordsINR(netAmount)}</em>
              </div>
            </div>

            <div class="totals-block">
              <div class="totals-row">
                <span class="totals-lbl">Subtotal</span>
                <span class="totals-val">₹ ${money(subtotal)}</span>
              </div>
              ${discountAmount > 0 ? `
                <div class="totals-row">
                  <span class="totals-lbl">Discount ${quotation.discountType === 'percentage' ? `(${quotation.discountValue}%)` : ''}</span>
                  <span class="totals-val" style="color: #dc2626;">- ₹ ${money(discountAmount)}</span>
                </div>
              ` : ''}
              ${totalGst > 0 ? `
                <div class="totals-row">
                  <span class="totals-lbl">CGST</span>
                  <span class="totals-val">₹ ${money(cgst)}</span>
                </div>
                <div class="totals-row">
                  <span class="totals-lbl">SGST</span>
                  <span class="totals-val">₹ ${money(sgst)}</span>
                </div>
              ` : ''}
              <div class="totals-row net">
                <span class="totals-lbl">Grand Total</span>
                <span class="totals-val">₹ ${money(netAmount)}</span>
              </div>
            </div>
          </div>

          <!-- Footer & Signatures -->
          <div class="footer-section">
            <div class="terms">
              <strong>Terms & Conditions:</strong>
              <ul>
                <li>Prices are valid for 15 days from the quotation date.</li>
                <li>Goods once sold will not be taken back without prior approval.</li>
                <li>Delivery as per mutually agreed schedule. Subject to local jurisdiction.</li>
              </ul>
            </div>
            <div class="sign-block">
              <div class="sign-for">For, ${companyName}</div>
              <div class="sign-space"></div>
              <div class="sign-text">Authorized Signatory</div>
            </div>
          </div>

        </div>
      </body>
    </html>
  `;
};

/**
 * Open the in-app GlobalPdfPreview modal with this Quotation's HTML.
 */
export const openQuotationPdfPreview = (quotation: Quotation, company?: Company | null) => {
  const html = generateQuotationHTML(quotation, company);
  const fileName = formatPdfFileName('quotation', quotation.quotationNo || 'doc');
  usePdfStore.getState().openPreview(html, fileName);
};

/**
 * Generate a standalone PDF file and invoke native share sheet.
 */
export const shareQuotationPdfFile = async (quotation: Quotation, company?: Company | null) => {
  const html = generateQuotationHTML(quotation, company);
  try {
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    const canShare = await Sharing.isAvailableAsync();

    if (canShare && base64) {
      const fileName = formatPdfFileName('quotation', quotation.quotationNo || 'doc');
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(newUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(newUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Quotation ${quotation.quotationNo}`,
      });
    } else {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Failed to export/share Quotation PDF:', error);
    throw error;
  }
};

/**
 * Generate a PDF file on disk and return its URI and filename for multipart upload.
 */
export const generateQuotationPdfFile = async (
  quotation: Quotation,
  company?: Company | null
): Promise<{ uri: string; fileName: string }> => {
  const html = generateQuotationHTML(quotation, company);
  const fileName = formatPdfFileName('quotation', quotation.quotationNo || 'doc');
  const result = await Print.printToFileAsync({ html, base64: false });
  return { uri: result.uri, fileName };
};
