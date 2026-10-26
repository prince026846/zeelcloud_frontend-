// Static configuration option lists (master data / enums).
// Kept separate from mock data so screens depend on stable config, not on the
// mock data module. When the backend serves these as master data, swap the
// values here (or route through a masterApi) without touching screens.

// Module permissions a sub user can be granted (matches the design's lists).
// Maps to form_ids in the backend (1-13)
export const PERMISSION_MODULES: string[] = [
  'Bank Details',
  'Sales OS',
  'Purchase OS',
  'GP OS',
  'Sales Register',
  'Purchase Register',
  'GP Register',
  'Bank Cash Ledger',
  'Party Ledger',
  'Non-Issue Stock',
  'Yarn Stock',
  'Beam Stock',
  'Machine Wise Beam Stock',
  'Quotation',
  'Proforma Invoice',
];

// Mapping from module name to form_id (backend database IDs)
export const MODULE_TO_FORM_ID: Record<string, number> = {
  'Bank Details': 1,
  'Sales OS': 2,
  'Purchase OS': 3,
  'GP OS': 4,
  'Sales Register': 5,
  'Purchase Register': 6,
  'GP Register': 7,
  'Bank Cash Ledger': 8,
  'Party Ledger': 9,
  'Non-Issue Stock': 10,
  'Yarn Stock': 11,
  'Beam Stock': 12,
  'Machine Wise Beam Stock': 13,
  'Quotation': 14,
  'Proforma Invoice': 15,
};

// Mapping from form_id to module name
export const FORM_ID_TO_MODULE: Record<number, string> = {
  1: 'Bank Details',
  2: 'Sales OS',
  3: 'Purchase OS',
  4: 'GP OS',
  5: 'Sales Register',
  6: 'Purchase Register',
  7: 'GP Register',
  8: 'Bank Cash Ledger',
  9: 'Party Ledger',
  10: 'Non-Issue Stock',
  11: 'Yarn Stock',
  12: 'Beam Stock',
  13: 'Machine Wise Beam Stock',
  14: 'Quotation',
  15: 'Proforma Invoice',
};

// Sales Order — item sort options
export const SORT_OPTIONS: string[] = [
  'Cotton Yarn Silk',
  'Polyester Blend',
  'Pure Silk',
  'Viscose Rayon',
  'Georgette',
];

// Sales Order — colour options
export const COLOR_OPTIONS: string[] = [
  'Navy Blue',
  'Maroon',
  'Emerald Green',
  'Golden Yellow',
  'Black',
  'White',
];
