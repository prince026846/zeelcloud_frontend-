/**
 * Utility functions for generating standardized, sanitized PDF file names across the app.
 */

/**
 * Returns a timestamp string in the format YYYYMMDD_HHmmss.
 */
export const getTimestampString = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

/**
 * Sanitizes a string for safe use in file names across Android and iOS file systems.
 * Replaces illegal characters (/ \ : * ? " < > |) and spaces with an underscore.
 */
export const sanitizeFileName = (name?: string | null): string => {
  if (!name) return '';
  return name
    .toString()
    .trim()
    .replace(/[/\\:*?"<>|\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Formats a standardized PDF file name with optional identifier and timestamp.
 * Example outputs:
 * - formatPdfFileName('sales_os') => 'sales_os_20261016_143022.pdf'
 * - formatPdfFileName('sales_invoice', '248') => 'sales_invoice_248_20261016_143022.pdf'
 * - formatPdfFileName('ledger', 'KAJAL FASHION') => 'ledger_KAJAL_FASHION_20261016_143022.pdf'
 */
export const formatPdfFileName = (
  prefix: string,
  identifier?: string | number | null,
  date: Date = new Date()
): string => {
  const ts = getTimestampString(date);
  const cleanPrefix = sanitizeFileName(prefix) || 'document';
  const cleanId = sanitizeFileName(identifier ? String(identifier) : '');

  const baseName = cleanId ? `${cleanPrefix}_${cleanId}_${ts}` : `${cleanPrefix}_${ts}`;
  return baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`;
};
