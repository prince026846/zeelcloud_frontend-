import { API_BASE_URL, API_HEADERS } from '../config';
import { useSyncStore } from '../store/syncStore';
import type {
  BankAccount,
  BillDetail,
  BillDetailItem,
  Company,
  GpOsInvoice,
  GpOsParty,
  GpRegisterEntry,
  MachineWiseDetailRow,
  MachineWiseFilter,
  MachineWiseFilterOptions,
  MachineWiseSummaryRow,
  PartyLedgerAccount,
  PurchaseOsInvoice,
  PurchaseOsParty,
  RegisterEntry,
  ReportFilter,
  SalesOsArea,
  SalesOsBroker,
  SalesOsInvoice,
  SalesOsParty,
  SalesOsPartyGroup,
  SalesOsSalesPerson,
  StockItem,
  StockDetailItem,
  StockReportType,
} from '../types';

type JsonRecord = Record<string, unknown>;

// Lazy require to avoid circular dependency
const getAuthStore = () => require('../store/authStore').useAuthStore;

export function getAuthToken(): string {
  const token = getAuthStore().getState().token;
  if (!token) throw new Error('No authentication token available');
  return token;
}

export function getActiveAccountId(): string | null {
  return getAuthStore().getState().activeAccountId;
}

export function authHeaders(): Record<string, string> {
  return {
    ...API_HEADERS,
    Authorization: `Token ${getAuthToken()}`,
  };
}

export class StaleRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleRequestError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accountIdAtStart = getActiveAccountId();

  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${base}${cleanPath}`, {
    ...init,
    credentials: 'include',
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });

  const accountIdAtEnd = getActiveAccountId();
  if (accountIdAtStart !== accountIdAtEnd) {
    throw new StaleRequestError('Request cancelled due to account switch');
  }

  if (response.status === 401) {
    // Invalidate session if token is rejected by backend
    getAuthStore().getState().deactivateSession();
    throw new Error('Authentication failed (401)');
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  // Every successful data fetch stamps the global "last sync" clock.
  useSyncStore.getState().markSynced();

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' ? (value as JsonRecord) : {};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const extractDataArray = (payload: unknown): JsonRecord[] => {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const record = asRecord(payload);
  if (Array.isArray(record.data)) return record.data.map(asRecord);
  // DRF LimitOffsetPagination wraps rows as {count, next, previous, results: []}.
  if (Array.isArray(record.results)) return record.results.map(asRecord);
  return [];
};

export function buildOsQuery(
  filter?: ReportFilter,
  extra?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  if (filter?.fromDate) params.set('from_date', filter.fromDate);
  if (filter?.toDate) params.set('to_date', filter.toDate);
  params.set('onlydue', filter?.onlyDue ? '1' : '0');

  if (filter?.commonCompany) {
    params.set('company', '0');
  } else if (filter?.companyId) {
    params.set('company', filter.companyId);
  }
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildCompanyQuery(companyId?: string, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (companyId) params.set('company', companyId);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

// The party-summary rows only carry name + balance + a `bills` array; the address,
// phone and per-bill fields live INSIDE each bill. So when a top-level address field
// is empty, fall back to the first bill's address — otherwise the party card subtitle
// renders blank ("details are missing").
const firstBill = (item: JsonRecord): JsonRecord => {
  const bills = Array.isArray(item.bills) ? item.bills : [];
  return bills.length ? asRecord(bills[0]) : {};
};

const parseCity = (item: JsonRecord): string => {
  const b = firstBill(item);
  return (
    asString(item.vv_area) ||
    asString(item.vv_address1) ||
    asString(item.vv_address) ||
    asString(b.vv_address1) ||
    asString(b.vv_area) ||
    asString(b.vv_city)
  );
};

// Count of bills backing a party (party summary hardcodes nothing else).
const billCount = (item: JsonRecord): number =>
  Array.isArray(item.bills) ? item.bills.length : 0;

// Party phone: top-level first, then the first bill's party / broker mobile.
const parsePhone = (item: JsonRecord): string | undefined => {
  const b = firstBill(item);
  return (
    asString(item.vv_mobile) ||
    asString(item.vv_brocker_mobile) ||
    asString(b.vv_mobile) ||
    asString(b.vv_brocker_mobile) ||
    undefined
  );
};

export const mapCompany = (item: JsonRecord): Company => {
  const osRaw = asRecord(item.os);
  const banksRaw = Array.isArray(item.banks) ? item.banks : [];
  
  return {
    recordId: typeof item.vn_company_id === 'number' ? item.vn_company_id : undefined,
    id: String(item.vn_company_id ?? item.id ?? ''),
    name: asString(item.vv_company_name, 'Unknown Company'),
    city: asString(item.vv_address),
    gstinNo: asString(item.vv_gstin_no) || undefined,
    isActive: true,
    isCommon: item.is_common === true,
    bankName: asString(item.vv_bank_name) || undefined,
    branchName: asString(item.vv_branch_name) || undefined,
    accountNo: asString(item.vv_account_no) || undefined,
    ifscCode: asString(item.vv_ifsc_code) || undefined,
    banks: banksRaw.map((b) => {
      const br = asRecord(b);
      return {
        name: asString(br.vv_bank_name),
        balance: asNumber(br.vn_balance),
        dc: asString(br.vv_dc),
      };
    }),
    os: {
      totalPurchase: asNumber(osRaw.total_purchase),
      totalSales: asNumber(osRaw.total_sales),
      totalGp: asNumber(osRaw.total_gp),
    },
  };
};

export const mapBillToSalesInvoice = (item: JsonRecord, partyId: string): SalesOsInvoice => {
  const companyId = asNumber(item.vn_company_id);
  const billNo = asString(item.vv_bill_no);
  const dueDays = asNumber(item.due_days);
  return {
    id: `${companyId}-${billNo}`,
    number: billNo,
    date: asString(item.vd_bill_date),
    amount: asNumber(item.vn_balance),
    outstanding: asNumber(item.vn_balance),
    daysLeft: dueDays > 0 ? -dueDays : Math.abs(dueDays),
    partyId,
    totalDueDays: asNumber(item.total_due_days),
    termDays: asNumber(item.vn_due_days),
    amountBeforeGst: asNumber(item.vn_amount_befor_gst ?? item.VN_Amount_Befor_Gst),
    companyRef: asString(item.vv_cmp),
    bookCode: asString(item.vv_book_code),
    brokerName: asString(item.vv_brocker_name),
  };
};

export const mapSalesOsParty = (item: JsonRecord): SalesOsParty => {
  const partyIdStr = String(item.vn_party_id ?? item.id ?? '');
  return {
    id: partyIdStr,
    name: asString(item.vv_party_name),
    city: parseCity(item),
    totalOs: asNumber(item.vn_balance__sum),
    invoiceCount: billCount(item),
    daysOverdue: 0,
    lastPayment: '',
    phone: parsePhone(item),
    bills: Array.isArray(item.bills) ? item.bills.map(b => mapBillToSalesInvoice(asRecord(b), partyIdStr)) : undefined,
  };
};

export const mapPurchaseOsParty = (item: JsonRecord): PurchaseOsParty => ({
  id: String(item.vn_party_id ?? item.id ?? ''),
  name: asString(item.vv_party_name),
  city: parseCity(item),
  totalOs: asNumber(item.vn_balance__sum),
  invoiceCount: billCount(item),
  daysOverdue: 0,
  phone: parsePhone(item),
});

export const mapGpOsParty = (item: JsonRecord): GpOsParty => ({
  id: String(item.vn_party_id ?? item.id ?? ''),
  name: asString(item.vv_party_name),
  address: parseCity(item),
  totalOs: asNumber(item.vn_balance__sum),
  invoiceCount: billCount(item),
  daysOverdue: 0,
  phone: parsePhone(item),
});

export const mapSalesOsBroker = (item: JsonRecord): SalesOsBroker => ({
  id: String(item.vn_brocker_id ?? item.id ?? asString(item.vv_brocker_name)),
  name: asString(item.vv_brocker_name),
  city: '',
  totalOs: asNumber(item.vn_balance__sum),
  partyCount: 0,
  phone: asString(item.vv_brocker_mobile) || undefined,
});

export const mapSalesOsArea = (item: JsonRecord): SalesOsArea => ({
  id: asString(item.vv_area),
  name: asString(item.vv_area),
  totalOs: asNumber(item.vn_balance__sum),
  partyCount: 0,
});

export const mapSalesOsPartyGroup = (item: JsonRecord): SalesOsPartyGroup => ({
  id: asString(item.vv_party_group),
  name: asString(item.vv_party_group),
  totalOs: asNumber(item.vn_balance__sum),
  partyCount: 0,
});

export const mapSalesOsSalesPerson = (item: JsonRecord): SalesOsSalesPerson => ({
  id: asString(item.vv_sales_person),
  name: asString(item.vv_sales_person),
  totalOs: asNumber(item.vn_balance__sum),
  partyCount: 0,
});


const mapBillToPurchaseInvoice = (item: JsonRecord, partyId: string): PurchaseOsInvoice => {
  const companyId = asNumber(item.vn_company_id);
  const billNo = asString(item.vv_bill_no);
  const dueDays = asNumber(item.due_days);
  return {
    id: `${companyId}-${billNo}`,
    number: billNo,
    date: asString(item.vd_bill_date),
    amount: asNumber(item.vn_balance),
    outstanding: asNumber(item.vn_balance),
    daysLeft: dueDays > 0 ? -dueDays : Math.abs(dueDays),
    partyId,
    totalDueDays: asNumber(item.total_due_days),
    termDays: asNumber(item.vn_due_days),
    amountBeforeGst: asNumber(item.vn_amount_befor_gst ?? item.VN_Amount_Befor_Gst),
    companyRef: asString(item.vv_cmp),
    bookCode: asString(item.vv_book_code),
    brokerName: asString(item.vv_brocker_name),
  };
};

export const mapBillToGpInvoice = (item: JsonRecord): GpOsInvoice => {
  const companyId = asNumber(item.vn_company_id);
  const billNo = asString(item.vv_bill_no);
  const dueDays = asNumber(item.due_days);
  return {
    id: `${companyId}-${billNo}`,
    companyId,
    companyRef: asString(item.vv_cmp),
    bookCode: asString(item.vv_book_code),
    billNo,
    billDate: asString(item.vd_bill_date),
    balance: asNumber(item.vn_balance),
    partyName: asString(item.vv_party_name),
    partyId: asNumber(item.vn_party_id),
    address: asString(item.vv_address1),
    brokerName: asString(item.vv_brocker_name),
    brokerId: asNumber(item.vn_brocker_id),
    dueDate: asString(item.vd_due_date),
    termDays: asNumber(item.vn_due_days),
    finYear: asString(item.vv_fin_year),
    totalDueDays: asNumber(item.total_due_days),
    dueDays,
    amountBeforeGst: asNumber(item.vn_amount_befor_gst ?? item.VN_Amount_Befor_Gst),
  };
};

export type PartyBillsResponse = {
  invoices: SalesOsInvoice[] | PurchaseOsInvoice[] | GpOsInvoice[];
  party?: SalesOsParty | PurchaseOsParty | GpOsParty;
};

export async function fetchPartyBills(
  partyId: string,
  type: 'sales' | 'purchase' | 'generalpurchase',
  filter?: ReportFilter,
): Promise<PartyBillsResponse> {
  const query = buildOsQuery(filter);
  const payload = await apiFetch<unknown>(`/party/${partyId}/${type}${query}`);
  const record = asRecord(payload);
  const rows = extractDataArray(payload);
  const totals = Array.isArray(record.total_outstanding)
    ? record.total_outstanding.map(asRecord)
    : [];
  const totalRow = totals[0];

  if (type === 'sales') {
    const invoices = rows.map((row) => mapBillToSalesInvoice(row, partyId));
    // Feed the bill rows into the mapper: the total row alone has no address /
    // phone, so the detail info block would render blank without this fallback.
    const party = totalRow
      ? mapSalesOsParty({ ...rows[0], ...totalRow, bills: rows })
      : rows[0]
        ? {
            id: partyId,
            name: asString(rows[0].vv_party_name),
            city: parseCity(rows[0]),
            totalOs: invoices.reduce((sum, inv) => sum + inv.outstanding, 0),
            invoiceCount: invoices.length,
            daysOverdue: Math.max(0, ...invoices.map((inv) => (inv.daysLeft < 0 ? -inv.daysLeft : 0))),
            lastPayment: '',
            phone: asString(rows[0].vv_mobile) || undefined,
          }
        : undefined;
    return { invoices, party };
  }

  if (type === 'purchase') {
    const invoices = rows.map((row) => mapBillToPurchaseInvoice(row, partyId));
    const party = totalRow
      ? mapPurchaseOsParty({ ...rows[0], ...totalRow, bills: rows })
      : rows[0]
        ? {
            id: partyId,
            name: asString(rows[0].vv_party_name),
            city: parseCity(rows[0]),
            totalOs: invoices.reduce((sum, inv) => sum + inv.outstanding, 0),
            invoiceCount: invoices.length,
            daysOverdue: Math.max(0, ...invoices.map((inv) => (inv.daysLeft < 0 ? -inv.daysLeft : 0))),
            phone: asString(rows[0].vv_mobile) || undefined,
          }
        : undefined;
    return { invoices, party };
  }

  const invoices = rows.map(mapBillToGpInvoice);
  const party = totalRow
    ? mapGpOsParty({ ...rows[0], ...totalRow, bills: rows })
    : rows[0]
      ? {
          id: partyId,
          name: asString(rows[0].vv_party_name),
          address: parseCity(rows[0]),
          totalOs: invoices.reduce((sum, inv) => sum + inv.balance, 0),
          invoiceCount: invoices.length,
          daysOverdue: Math.max(0, ...invoices.map((inv) => inv.dueDays)),
          phone: asString(rows[0].vv_mobile) || undefined,
        }
      : undefined;
  return { invoices, party };
}

export const mapRegisterEntry = (item: JsonRecord): RegisterEntry => ({
  id: String(item.vn_invoice_id ?? item.id ?? ''),
  date: asString(item.vd_invoice_date),
  partyName: asString(item.party_name),
  amount: asNumber(item.vn_net_total),
  type: asString(item.vv_book_name, 'Invoice'),
  invoiceNo: asString(item.vn_invoice_no),
});

export const mapGpRegisterEntry = (item: JsonRecord): GpRegisterEntry => ({
  id: String(item.vn_invoice_id ?? item.id ?? ''),
  entryNo: asString(item.vn_ak_no),
  billNo: asString(item.vn_invoice_no),
  date: asString(item.vd_invoice_date),
  partyName: asString(item.party_name),
  amount: asNumber(item.vn_net_total),
  description: asString(item.vv_description) || undefined,
});

export const mapPartyLedgerAccount = (item: JsonRecord): PartyLedgerAccount => ({
  id: String(item.vn_account_id ?? item.id ?? ''),
  name: asString(item.vv_party_name),
  balance: asNumber(item.balance),
  phone: asString(item.vv_mobile),
});

export const mapBankAccount = (item: JsonRecord, index: number): BankAccount => {
  const name = asString(item.vv_party_name) || asString(item.vv_bank_name);
  let accountNo = asString(item.vv_account_no) || undefined;
  if (!accountNo) {
    const match = name.match(/(?:[-:]\s*|\b)(\d{4,20})\b/);
    if (match) {
      accountNo = match[1];
    }
  }

  return {
    id: String(item.vn_account_id ?? item.id ?? `${asString(item.vv_bank_name)}-${index}`),
    name,
    accountNo,
    amount: asNumber(item.balance) || asNumber(item.vn_balance),
  };
};

export function aggregateStockData(data: JsonRecord[], reportType: StockReportType): JsonRecord[] {
  const map = new Map<string, JsonRecord>();
  for (const row of data) {
    const itemName = asString(row.vv_item_name);
    const lotNo = reportType === 'qualityLotGrade' ? asString(row.vv_lot_no) : '';
    const grade = reportType === 'qualityLotGrade' ? asString(row.vv_summary) : '';
    const key =
      reportType === 'qualityLotGrade'
        ? `${itemName}|${lotNo}|${grade}`
        : `${itemName}|${lotNo}`;

    if (!map.has(key)) {
      map.set(key, {
        vv_item_name: itemName,
        vv_lot_no: lotNo,
        vv_summary: grade,
        vn_meter__sum: asNumber(row.vn_meter__sum ?? row.vn_meter),
        vn_weight__sum: asNumber(row.vn_weight__sum ?? row.vn_weight),
        vn_pallu__sum: asNumber(row.vn_pallu__sum ?? row.vn_pallu),
        vn_net_weight__sum: asNumber(row.vn_net_weight__sum ?? row.vn_net_weight),
        vn_cheese__sum: asNumber(row.vn_cheese__sum ?? row.vn_cheese),
        vn_beam__sum: asNumber(row.vn_beam__sum ?? row.vn_beam),
        vv_taka_no__count: asNumber(row.vv_taka_no__count) || (row.vv_taka_no || row.id ? 1 : 0),
      });
    } else {
      const agg = map.get(key)!;
      agg.vn_meter__sum = asNumber(agg.vn_meter__sum) + asNumber(row.vn_meter__sum ?? row.vn_meter);
      agg.vn_weight__sum = asNumber(agg.vn_weight__sum) + asNumber(row.vn_weight__sum ?? row.vn_weight);
      agg.vn_pallu__sum = asNumber(agg.vn_pallu__sum) + asNumber(row.vn_pallu__sum ?? row.vn_pallu);
      agg.vn_net_weight__sum = asNumber(agg.vn_net_weight__sum) + asNumber(row.vn_net_weight__sum ?? row.vn_net_weight);
      agg.vn_cheese__sum = asNumber(agg.vn_cheese__sum) + asNumber(row.vn_cheese__sum ?? row.vn_cheese);
      agg.vn_beam__sum = asNumber(agg.vn_beam__sum) + asNumber(row.vn_beam__sum ?? row.vn_beam);
      agg.vv_taka_no__count = asNumber(agg.vv_taka_no__count) + (asNumber(row.vv_taka_no__count) || (row.vv_taka_no || row.id ? 1 : 0));
    }
}
  return Array.from(map.values());
}

export const mapStockDetailItem = (item: JsonRecord): StockDetailItem => ({
  id: String(item.id ?? `${asString(item.vv_item_name)}-${Math.random()}`),
  itemName: asString(item.vv_item_name),
  crtnNo: asString(item.vv_taka_no),
  netWeight: asNumber(item.vn_net_weight),
  cheese: asNumber(item.vn_cheese),
  twist: asString(item.vv_twist),
  grade: asString(item.vv_summary),
  lotNo: asString(item.vv_lot_no),
  partyName: asString(item.vv_party_name),
  date: asString(item.vd_uptodate),
  meter: asNumber(item.vn_meter),
  weight: asNumber(item.vn_weight),
  pallu: asNumber(item.vn_pallu),
  mcNo: asString(item.vv_mc_no),
  beamNo: asString(item.vv_beam_no),
  pipeType: asString(item.vv_summary),
  mark: asString(item.vv_mark),
});

export const mapYarnStockItem = (item: JsonRecord, category: 'yarn' | 'beam' | 'nonIssue'): StockItem => ({
  // Item name alone is NOT unique — a Quality + Lot report repeats the same item
  // under several lot numbers, which produced duplicate React keys. Include the lot.
  id: [asString(item.vv_item_name), asString(item.vv_lot_no), asString(item.vv_summary)]
    .filter(Boolean)
    .join('|'),
  name: asString(item.vv_item_name),
  quality: asString(item.vv_item_name),
  qty: asNumber(item.vn_meter__sum ?? item.vn_weight__sum),
  unit: 'MTR',
  value: 0,
  location: '',
  category,
  taka: asNumber(item.vv_taka_no__count),
  meter: asNumber(item.vn_meter__sum),
  weight: asNumber(item.vn_weight__sum),
  pallu: asNumber(item.vn_pallu__sum),
  netWeight: asNumber(item.vn_net_weight__sum),
  cheese: asNumber(item.vn_cheese__sum),
  beam: asNumber(item.vn_beam__sum),
  crtn: asNumber(item.vv_taka_no__count),
  avgWt: asNumber(item.vn_weight__sum) / (asNumber(item.vv_taka_no__count) || 1),
  lotNo: asString(item.vv_lot_no),
  grade: asString(item.vv_summary),
});


// ─── Bill detail mapper (OG register bill pages) ──────────────────────────────
// The register detail endpoints return the full model row plus `party_name`,
// `items[]` and nested `account.party`. Field names follow the Django models
// (Sales / Purchase / Generalpurchase + their item models).

const composePartyAddress = (account: JsonRecord): string => {
  const party = asRecord(account.party);
  const bits = [
    asString(party.vv_address1).trim(),
    asString(party.vv_address2).trim(),
    asString(party.vv_address3).trim(),
    asString(party.vv_city).trim(),
    party.vn_pin_code != null && party.vn_pin_code !== 0 ? String(party.vn_pin_code) : '',
  ].filter(Boolean);
  return bits.join(', ');
};

const mapBillItem = (row: JsonRecord, module: 'sales' | 'purchase' | 'gp'): BillDetailItem => {
  const base = {
    name: asString(row.vv_item_name) || asString(row.vv_item_code),
    amount: asNumber(row.vn_amount),
  };
  if (module === 'sales') {
    return {
      ...base,
      hsnCode: asString(row.vn_hsn_code),
      design: asString(row.vv_item_code), // Fallback map if client clarifies it's code
      taka: asNumber(row.vn_taka_no),
      pallu: asNumber(row.vn_cheese), // OG "Pallu" column binds VN_Cheese
      meter: asNumber(row.vn_meter),
      weight: asNumber(row.vn_weight),
      sgstRate: asNumber(row.vn_sgst_rate ?? row.sgst_rate),
      cgstRate: asNumber(row.vn_cgst_rate ?? row.cgst_rate),
      igstRate: asNumber(row.vn_igst_rate ?? row.igst_rate),
      sgstAmount: asNumber(row.vn_sgst_amt ?? row.sgst_amount),
      cgstAmount: asNumber(row.vn_cgst_amt ?? row.cgst_amount),
      igstAmount: asNumber(row.vn_igst_amt ?? row.igst_amount),
    };
  }
  if (module === 'purchase') {
    return {
      ...base,
      nos: asNumber(row.vn_nung),
      qty: asNumber(row.vn_qty),
      cut: asNumber(row.vn_cut),
    };
  }
  return { ...base, qty: asNumber(row.vn_qty) };
};

export const mapBillDetail = (record: JsonRecord, module: 'sales' | 'purchase' | 'gp'): BillDetail => {
  const items = Array.isArray(record.items)
    ? record.items.map((it) => mapBillItem(asRecord(it), module))
    : [];
  return {
    id: String(record.id ?? record.vn_invoice_id ?? ''),
    // vn_invoice_no can arrive as a string or a number depending on serializer.
    invoiceNo:
      record.vn_invoice_no != null && String(record.vn_invoice_no).trim() !== ''
        ? String(record.vn_invoice_no)
        : String(record.vn_invoice_id ?? ''),
    date: asString(record.vd_invoice_date),
    partyName: asString(record.party_name) || asString(asRecord(asRecord(record.account).party).vv_party_name),
    partyAddress: composePartyAddress(asRecord(record.account)),
    deliveryPartyName: asString(record.delivery_party_name) || asString(asRecord(asRecord(record.account).delivery_party).vv_party_name),
    vehicalNo: asString(record.vv_vehical_no),
    ewayBillNo: asString(record.vv_eway_bill_no),
    irn: asString(record.vv_irn),
    ackNo: asString(record.vv_ack_no),
    brokerName: asString(record.vv_brocker_name) || undefined,
    gstNo: asString(asRecord(asRecord(record.account).party).vv_gstin_no) || undefined,
    mobileNo: asString(asRecord(asRecord(record.account).party).vv_mobile) || asString(asRecord(asRecord(record.account).party).phone) || undefined,
    field1: asString(record.field1) || undefined,
    field2: asString(record.field2) || undefined,
    field3: asString(record.field3) || undefined,
    field4: asString(record.field4) || undefined,
    field5: asString(record.field5) || undefined,
    items,
    grandTotal: asNumber(record.vn_grant_total),
    claim: asNumber(record.vn_discount1),
    discount: asNumber(record.vn_discount),
    addOther1: asNumber(record.vn_add_other1),
    addOther2: asNumber(record.vn_add_other2),
    freight: asNumber(record.vn_freight_amt),
    bFreight: asNumber(record.vn_bfreight_amt),
    igst: asNumber(record.vn_igst),
    sgst: asNumber(record.vn_sgst),
    cgst: asNumber(record.vn_cgst),
    addLess: asNumber(record.vn_add_less),
    tcs: asNumber(record.vn_tcs_amount),
    roundOf: asNumber(record.vn_round_of),
    netAmount: asNumber(record.vn_net_total),
  };
};

export function stockEndpoint(
  source: 'yarn' | 'beam' | 'gray' | 'sequance' | 'nonIssue',
  reportType: StockReportType,
): string {
  const base =
    source === 'yarn'
      ? 'yarn-stock'
      : source === 'beam'
        ? 'beam-stock'
        : source === 'gray'
          ? 'gray-stock'
          : 'sequance-stock';
  const suffix = reportType === 'qualityLotGrade' ? 'summary/item-summary-lot' : 'summary/item';
  return `/${base}/${suffix}`;
}

// ─── Machine Wise Beam Stock ──────────────────────────────────────────────────

export function buildMachineWiseQuery(filter?: MachineWiseFilter): string {
  const params = new URLSearchParams();
  if (!filter) return '';

  params.set('report_type', filter.reportType || 'machine');
  params.set('view', filter.view || 'detail');
  params.set('stock_type', filter.stockType || 'all');

  if (filter.companyId) params.set('company', filter.companyId);
  if (filter.machine) params.set('machines', filter.machine);
  if (filter.party) params.set('parties', filter.party);
  if (filter.jobParty) params.set('job_parties', filter.jobParty);
  if (filter.gQuality) params.set('g_qualities', filter.gQuality);
  if (filter.grayQuality) params.set('gray_quality', '1');
  if (filter.qualityDesignReq) params.set('quality_design_req', '1');
  if (filter.bhidanFrom) params.set('bhidan_from', filter.bhidanFrom);
  if (filter.bhidanTo) params.set('bhidan_to', filter.bhidanTo);

  if (filter.useProductionDate) {
    params.set('use_production_date', '1');
    if (filter.productionFrom) params.set('production_from', filter.productionFrom);
    if (filter.productionTo) params.set('production_to', filter.productionTo);
  }

  if (filter.shortageUnit) params.set('shortage_unit', filter.shortageUnit);
  if (filter.shortageValue && Number(filter.shortageValue) > 0) {
    params.set('shortage_value', filter.shortageValue);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const mapMachineWiseDetailRow = (item: JsonRecord): MachineWiseDetailRow => ({
  id: String(item.id ?? `${item.vv_beam_no ?? ''}-${item.vv_mc_no ?? ''}`),
  beamNo: asString(item.vv_beam_no),
  beamDate: asString(item.vd_beam_date),
  mcNo: asString(item.vv_mc_no),
  mcName: asString(item.vv_mc_name),
  loadDate: asString(item.vd_l_date),
  bhidanDate: asString(item.vd_b_date),
  productionDate: asString(item.vd_pasaria_date),
  meter: asNumber(item.vn_meter),
  taka: asNumber(item.vn_taka),
  recMeter: asNumber(item.vv_rec_meter),
  recTaka: asNumber(item.vn_rec_taka),
  balMeter: asNumber(item.vn_bal_meter),
  balTaka: asNumber(item.vn_bal_taka),
  status: asNumber(item.vn_status),
  statusLabel: asString(item.status_label),
  partyName: asString(item.vv_party_name),
  jobPartyName: asString(item.vv_job_party_name),
  gQualityName: asString(item.vv_g_item_name),
  ends: asNumber(item.vn_ends),
  design: asString(item.vv_design),
  color: asString(item.vv_color),
  pipeNo: asString(item.vv_pipe_no),
  weight: asNumber(item.vn_weight),
});

export const mapMachineWiseSummaryRow = (item: JsonRecord, index: number): MachineWiseSummaryRow => ({
  id: String(item.group_key ?? `summary-${index}`),
  groupKey: asString(item.group_key),
  groupLabel: asString(item.group_label),
  beamCount: asNumber(item.beam_count),
  meter: asNumber(item.vn_meter__sum),
  taka: asNumber(item.vn_taka__sum),
  balMeter: asNumber(item.vn_bal_meter__sum),
  balTaka: asNumber(item.vn_bal_taka__sum),
  weight: asNumber(item.vn_weight__sum),
  recTaka: asNumber(item.vn_rec_taka__sum),
  recMeter: asNumber(item.vv_rec_meter__sum),
});

export const mapMachineWiseFilterOptions = (payload: unknown): MachineWiseFilterOptions => {
  const record = asRecord(payload);
  const asOptionList = (value: unknown) =>
    Array.isArray(value) ? value.map((row) => asRecord(row)) : [];

  return {
    reportTypes: asOptionList(record.report_types).map((row) => ({
      value: asString(row.value),
      label: asString(row.label),
    })),
    stockTypes: asOptionList(record.stock_types).map((row) => ({
      value: asString(row.value),
      label: asString(row.label),
    })),
    machines: asOptionList(record.machines).map((row) => ({
      vv_mc_no: asString(row.vv_mc_no),
      vv_mc_name: asString(row.vv_mc_name),
    })),
    parties: asOptionList(record.parties).map((row) => ({
      vn_party_id: asNumber(row.vn_party_id),
      vv_party_name: asString(row.vv_party_name),
    })),
    jobParties: asOptionList(record.job_parties).map((row) => ({
      vn_job_party_id: asNumber(row.vn_job_party_id),
      vv_job_party_name: asString(row.vv_job_party_name),
    })),
    gQualities: asOptionList(record.g_qualities).map((row) => ({
      vn_g_item: asNumber(row.vn_g_item),
      vv_g_item_name: asString(row.vv_g_item_name),
    })),
    branches: Array.isArray(record.branches)
      ? record.branches.map((b) => asNumber(b)).filter((b) => b > 0)
      : [],
  };
};
