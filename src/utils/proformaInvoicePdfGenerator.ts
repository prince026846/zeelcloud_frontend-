import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { toDDMMYYYY } from './formatDate';
import type { ProformaInvoice, Company } from '../types';
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

export const generateProformaInvoiceHTML = (invoice: ProformaInvoice, company?: Company | null): string => {
  const money = (n: number | undefined | null) =>
    (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  const companyName = company?.name || 'ZEEL INFOTECH';
  const companyAddress = company?.city || '';
  const companyGst = company?.gstinNo || '';
  const companyPhone = '';
  const companyEmail = '';

  const subtotal = invoice.subtotal || 0;
  const discountAmount = invoice.discountAmount || 0;
  const totalGst = invoice.totalGstAmount || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const netAmount = invoice.totalAmount || 0;

  const rows = invoice.items.map((item, index) => {
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

  const fillerCount = Math.max(0, 5 - invoice.items.length);
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
        <title>Pro Forma Invoice - ${invoice.invoiceNo}</title>
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
            width: 28px;
            height: 28px;
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
            font-style: italic;
          }

          .summary-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
          }
          .words-block {
            flex: 1;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 12px;
          }
          .words-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 2px;
          }
          .words-val {
            font-size: 10px;
            font-weight: 600;
            color: #1e293b;
          }
          .remark-text {
            margin-top: 6px;
            font-size: 9.5px;
            color: #475569;
          }

          .calc-table {
            width: 280px;
            border-collapse: collapse;
          }
          .calc-table td {
            padding: 4px 8px;
            font-size: 10.5px;
          }
          .calc-table tr.total-row {
            background: #f1f5f9;
            font-weight: 700;
            font-size: 12px;
            color: ${Colors.primary};
            border-top: 1px solid ${Colors.primary};
            border-bottom: 2px solid ${Colors.primary};
          }

          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
          }
          .terms-block {
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
            max-width: 440px;
          }
          .terms-title {
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
            color: #334155;
          }
          .signature-box {
            text-align: center;
            width: 180px;
          }
          .for-company {
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
              <div class="doc-badge">PRO FORMA INVOICE</div>
              <div class="doc-no">Invoice No: ${invoice.invoiceNo}</div>
              <div class="doc-date">Date: ${toDDMMYYYY(invoice.date)}</div>
            </div>
          </div>

          <!-- Metadata / Party Grid -->
          <div class="meta-grid">
            <div class="meta-col">
              <h3>Invoice To (Buyer)</h3>
              <div class="party-name">${invoice.partyName || 'Cash / Counter Customer'}</div>
              ${invoice.partyAddress ? `<div class="meta-text">${invoice.partyAddress}</div>` : ''}
              ${invoice.contactNo ? `<div class="meta-text">Contact: ${invoice.contactNo}</div>` : ''}
              ${invoice.email ? `<div class="meta-text">Email: ${invoice.email}</div>` : ''}
            </div>
            <div class="meta-col" style="max-width: 200px;">
              <h3>Reference</h3>
              <div class="meta-text">Valid For: 15 Days</div>
              <div class="meta-text">Status: Pro Forma</div>
              ${invoice.ccEmail ? `<div class="meta-text">CC: ${invoice.ccEmail}</div>` : ''}
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
                <th class="right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${fillerRows}
            </tbody>
          </table>

          <!-- Summary / Calculation -->
          <div class="summary-wrap">
            <div class="words-block">
              <div class="words-label">Amount in Words:</div>
              <div class="words-val">${numberToWordsINR(netAmount)}</div>
              ${invoice.remark ? `<div class="remark-text"><strong>Remarks:</strong> ${invoice.remark}</div>` : ''}
            </div>

            <table class="calc-table">
              <tr>
                <td class="left">Subtotal:</td>
                <td class="right">₹${money(subtotal)}</td>
              </tr>
              ${discountAmount > 0 ? `
              <tr>
                <td class="left">Discount (${invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Flat'}):</td>
                <td class="right" style="color: #dc2626;">- ₹${money(discountAmount)}</td>
              </tr>
              ` : ''}
              ${totalGst > 0 ? `
              <tr>
                <td class="left">CGST:</td>
                <td class="right">₹${money(cgst)}</td>
              </tr>
              <tr>
                <td class="left">SGST:</td>
                <td class="right">₹${money(sgst)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td class="left">Net Total:</td>
                <td class="right">₹${money(netAmount)}</td>
              </tr>
            </table>
          </div>

          <!-- Footer & Signatures -->
          <div class="footer-section">
            <div class="terms-block">
              <div class="terms-title">Terms &amp; Conditions</div>
              <div>1. This Pro Forma Invoice is for commercial estimation and payment arrangement.</div>
              <div>2. Final tax invoice will be issued upon dispatch/delivery of items.</div>
              <div>3. Subject to jurisdiction of local courts.</div>
            </div>

            <div class="signature-box">
              <div class="for-company">For ${companyName}</div>
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
 * Open the in-app GlobalPdfPreview modal with this Pro Forma Invoice's HTML.
 */
export const openProformaInvoicePdfPreview = (invoice: ProformaInvoice, company?: Company | null) => {
  const html = generateProformaInvoiceHTML(invoice, company);
  const fileName = formatPdfFileName('proforma_invoice', invoice.invoiceNo || 'doc');
  usePdfStore.getState().openPreview(html, fileName);
};

/**
 * Generate a standalone PDF file and invoke native share sheet.
 */
export const shareProformaInvoicePdfFile = async (invoice: ProformaInvoice, company?: Company | null) => {
  const html = generateProformaInvoiceHTML(invoice, company);
  try {
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    const canShare = await Sharing.isAvailableAsync();

    if (canShare && base64) {
      const fileName = formatPdfFileName('proforma_invoice', invoice.invoiceNo || 'doc');
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(newUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(newUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Pro Forma Invoice ${invoice.invoiceNo}`,
      });
    } else {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Print.printAsync({ uri });
    }
  } catch (error) {
    console.error('Failed to export/share Pro Forma Invoice PDF:', error);
    throw error;
  }
};

/**
 * Generate a PDF file on disk and return its URI and filename for multipart upload.
 */
export const generateProformaInvoicePdfFile = async (
  invoice: ProformaInvoice,
  company?: Company | null
): Promise<{ uri: string; fileName: string }> => {
  const html = generateProformaInvoiceHTML(invoice, company);
  const fileName = formatPdfFileName('proforma_invoice', invoice.invoiceNo || 'doc');
  const result = await Print.printToFileAsync({ html, base64: false });
  return { uri: result.uri, fileName };
};

