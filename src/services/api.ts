/**
 * API Service — all functions are stubbed with mock data.
 * Replace the implementations with real axios/fetch calls when backend is ready.
 */
import { API_BASE_URL, API_HEADERS } from '../config';
import { mockUser } from '../data/mockData';
import { FORM_ID_TO_MODULE } from '../constants/options';
import {
  apiFetch,
  getActiveAccountId,
  mapBillDetail,
  buildCompanyQuery,
  buildOsQuery,
  buildMachineWiseQuery,
  extractDataArray,
  fetchPartyBills,
  mapBankAccount,
  mapCompany,
  mapGpOsParty,
  mapGpRegisterEntry,
  mapMachineWiseDetailRow,
  mapMachineWiseFilterOptions,
  mapMachineWiseSummaryRow,
  mapPartyLedgerAccount,
  mapPurchaseOsParty,
  mapRegisterEntry,
  mapSalesOsArea,
  mapSalesOsBroker,
  mapSalesOsParty,
  mapSalesOsPartyGroup,
  mapSalesOsSalesPerson,
  mapYarnStockItem,
  stockEndpoint,
  aggregateStockData,
  mapStockDetailItem,
} from './apiHelpers';
import type {
  BillDetail,
  User,
  SubUser,
  ProfileCompany,
  AllowedForm,
  Company,
  SalesOsParty,
  SalesOsInvoice,
  SalesOsBroker,
  SalesOsArea,
  SalesOsPartyGroup,
  SalesOsSalesPerson,
  PurchaseOsParty,
  PurchaseOsInvoice,
  GpOsParty,
  GpOsInvoice,
  RegisterEntry,
  GpRegisterEntry,
  StockItem,
  StockDetailItem,
  LedgerEntry,
  BankAccount,
  PartyLedgerAccount,
  SalesReportPoint,
  ReportFilter,
  MachineWiseDetailRow,
  MachineWiseFilter,
  MachineWiseFilterOptions,
  MachineWiseSummaryRow,
  Item,
  AccountParty,
  SalesOrder,
  CreateSalesOrderPayload,
} from '../types';

// ─── Base Client (swap with axios instance when ready) ────────────────────────

export const apiClient = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: API_HEADERS,
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

type SubUserApiItem = {
  id?: unknown;
  username?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  is_active?: unknown;
  contact_no?: unknown;
  company_name?: unknown;
  is_sales_order_creation_allowed?: unknown;
  allowed_forms?: unknown;
  profile?: {
    is_active?: unknown;
    contact_no?: unknown;
    company_name?: unknown;
  };
};

const parseSubUserResponse = (data: unknown): SubUser => {
  if (!data || typeof data !== 'object') {
    throw new Error('Sub user response was invalid');
  }

  const item = data as SubUserApiItem;
  if (typeof item.id !== 'number' || typeof item.username !== 'string') {
    throw new Error('Sub user response did not include a valid user');
  }

  const profile = item.profile && typeof item.profile === 'object' ? item.profile : {};
  const firstName = typeof item.first_name === 'string' ? item.first_name : '';
  const lastName = typeof item.last_name === 'string' ? item.last_name : '';
  const allowedModules: string[] = [];
  const allowedFormIds: number[] = [];

  if (Array.isArray(item.allowed_forms)) {
    item.allowed_forms.forEach((form) => {
      if (!form || typeof form !== 'object') return;
      const allowedForm = form as { id?: unknown };
      if (typeof allowedForm.id === 'number') {
        allowedFormIds.push(allowedForm.id);
        const moduleName = FORM_ID_TO_MODULE[allowedForm.id];
        if (moduleName) {
          allowedModules.push(moduleName);
        }
      }
    });
  }

  const isActive =
    typeof profile.is_active === 'boolean'
      ? profile.is_active
      : typeof item.is_active === 'boolean'
        ? item.is_active
        : true;

  const phone =
    typeof profile.contact_no === 'string'
      ? profile.contact_no
      : typeof item.contact_no === 'string'
        ? item.contact_no
        : '';

  const companyName =
    typeof profile.company_name === 'string'
      ? profile.company_name
      : typeof item.company_name === 'string'
        ? item.company_name
        : '';

  const isSalesOrderCreationAllowed = item.is_sales_order_creation_allowed === true;

  return {
    id: String(item.id),
    username: item.username,
    name: `${firstName} ${lastName}`.trim() || item.username,
    password: '',
    email: typeof item.email === 'string' ? item.email : '',
    phone,
    companyName,
    isActive,
    isSalesOrderCreationAllowed,
    allowedModules,
    allowedFormIds,
  };
};

export const authApi = {
  login: async (login: string, password: string): Promise<{ token: string }> => {
    const response = await fetch(`${apiClient.baseURL}/user/login/`, {
      method: 'POST',
      headers: apiClient.headers,
      body: JSON.stringify({ login, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('token' in data) ||
      typeof data.token !== 'string' ||
      !data.token
    ) {
      throw new Error('Login response did not include a token');
    }

    return { token: data.token };
  },
  getProfile: async (token: string): Promise<User> => {
    const response = await fetch(`${apiClient.baseURL}/user/profile/`, {
      method: 'GET',
      headers: {
        ...apiClient.headers,
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Get profile failed with status ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('Profile response was invalid');
    }
    const profileData = data as {
      id?: unknown;
      username?: unknown;
      first_name?: unknown;
      last_name?: unknown;
      email?: unknown;
      profile?: {
        is_active?: unknown;
        company_name?: unknown;
        contact_no?: unknown;
        updated_at?: unknown;
        is_sales_order_creation_allowed?: unknown;
      };
      user_companies?: unknown;
      is_subuser?: unknown;
      parent_user_id?: unknown;
      allowed_forms?: unknown;
      contact_no?: unknown;
      is_active?: unknown;
      company_name?: unknown;
      is_sales_order_creation_allowed?: unknown;
    };

    if (typeof profileData.id !== 'number' || typeof profileData.username !== 'string') {
      throw new Error('Profile response did not include a valid user');
    }

    const firstName = typeof profileData.first_name === 'string' ? profileData.first_name : '';
    const lastName = typeof profileData.last_name === 'string' ? profileData.last_name : '';
    const name = `${firstName} ${lastName}`.trim() || profileData.username;
    const profile = profileData.profile;

    const userCompanies: ProfileCompany[] = Array.isArray(profileData.user_companies)
      ? profileData.user_companies.flatMap((company): ProfileCompany[] => {
          if (!company || typeof company !== 'object') return [];
          const item = company as {
            id?: unknown;
            vn_company_id?: unknown;
            vv_company_name?: unknown;
            vv_gstin_no?: unknown;
            is_common?: unknown;
          };
          if (typeof item.vn_company_id !== 'number' || typeof item.vv_company_name !== 'string') {
            return [];
          }
          return [{
            id: typeof item.id === 'string' ? item.id : String(item.vn_company_id),
            companyId: item.vn_company_id,
            name: item.vv_company_name,
            gstinNo: typeof item.vv_gstin_no === 'string' ? item.vv_gstin_no : undefined,
            isCommon: item.is_common === true,
          }];
        })
      : [];
    const allowedForms: AllowedForm[] = Array.isArray(profileData.allowed_forms)
      ? profileData.allowed_forms.flatMap((form): AllowedForm[] => {
          if (!form || typeof form !== 'object') return [];
          const item = form as { id?: unknown; formname?: unknown };
          return typeof item.id === 'number' && typeof item.formname === 'string'
            ? [{ id: item.id, formName: FORM_ID_TO_MODULE[item.id] || item.formname }]
            : [];
        })
      : [];

    return {
      id: String(profileData.id),
      username: profileData.username,
      name,
      role: profileData.is_subuser === true ? 'Sub User' : 'User',
      email: typeof profileData.email === 'string' ? profileData.email : undefined,
      phone: typeof profile?.contact_no === 'string' ? profile.contact_no : (typeof profileData.contact_no === 'string' ? profileData.contact_no : undefined),
      firstName,
      lastName,
      isActive: profile?.is_active === true || profileData.is_active === true,
      companyName: typeof profile?.company_name === 'string' ? profile.company_name : (typeof profileData.company_name === 'string' ? profileData.company_name : undefined),
      updatedAt: typeof profile?.updated_at === 'string' ? profile.updated_at : undefined,
      userCompanies,
      isSubuser: profileData.is_subuser === true,
      parentUserId: typeof profileData.parent_user_id === 'number' ? profileData.parent_user_id : null,
      allowedForms,
      isSalesOrderCreationAllowed: profile?.is_sales_order_creation_allowed === true || profileData.is_sales_order_creation_allowed === true,
    };
  },
  getSubUsers: async (_token: string): Promise<SubUser[]> => {
    const data = await apiFetch<unknown>('/sub-users/');
    if (!Array.isArray(data)) {
      throw new Error('Sub users response was invalid');
    }
    return data.flatMap((subUser): SubUser[] => {
      try {
        return [parseSubUserResponse(subUser)];
      } catch {
        return [];
      }
    });
  },
  getSubUser: async (_token: string, id: string): Promise<SubUser> => {
    const data = await apiFetch<unknown>(`/sub-users/${id}/`);
    return parseSubUserResponse(data);
  },
  createSubUser: async (
    _token: string,
    data: {
      username: string;
      password: string;
      contact_no: string;
      form_ids: number[];
      first_name?: string;
      last_name?: string;
      email?: string;
      company_name?: string;
      is_sales_order_creation_allowed?: boolean;
    },
  ): Promise<SubUser> => {
    const responseData = await apiFetch<unknown>('/sub-users/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
    return parseSubUserResponse(responseData);
  },
  updateSubUser: async (
    _token: string,
    id: string,
    updates: {
      first_name?: string;
      last_name?: string;
      email?: string;
      password?: string;
      is_active?: boolean;
      company_name?: string;
      contact_no?: string;
      form_ids?: number[];
      is_sales_order_creation_allowed?: boolean;
    },
  ): Promise<SubUser> => {
    const data = await apiFetch<unknown>(`/sub-users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
    });
    return parseSubUserResponse(data);
  },
  deactivateSubUser: async (_token: string, id: string): Promise<void> => {
    await apiFetch<unknown>(`/sub-users/${id}/`, {
      method: 'DELETE',
    });
  },
  logout: async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 300));
  },
  refreshToken: async (token: string): Promise<{ token: string }> => {
    await new Promise((r) => setTimeout(r, 500));
    return { token: `refreshed_${Date.now()}` };
  },
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    await new Promise((r) => setTimeout(r, 600));
    // Replace with PUT /auth/profile when backend is ready.
    return { ...mockUser, ...updates };
  },
  changePassword: async (
    _username: string,
    _currentPassword: string,
    _newPassword: string,
  ): Promise<{ success: boolean }> => {
    await new Promise((r) => setTimeout(r, 800));
    // Replace with POST /auth/change-password when backend is ready.
    return { success: true };
  },
};

// ─── Companies ────────────────────────────────────────────────────────────────

export const companyApi = {
  getAll: async (): Promise<Company[]> => {
    const data = await apiFetch<unknown>('/company/');
    return extractDataArray(data).map(mapCompany);
  },
  getById: async (id: string): Promise<Company | undefined> => {
    const data = await apiFetch<unknown>(`/company/${id}/`);
    return mapCompany(data as Record<string, unknown>);
  },
  getSummary: async (companyId?: string): Promise<{ totalPurchase: number; totalSales: number; totalGp: number }> => {
    const url = companyId ? `/company/summary?company=${companyId}` : '/company/summary';
    const data = await apiFetch<Record<string, unknown>>(url);
    return {
      totalPurchase: typeof data.total_purchase === 'number' ? data.total_purchase : 0,
      totalSales: typeof data.total_sales === 'number' ? data.total_sales : 0,
      totalGp: typeof data.total_gp === 'number' ? data.total_gp : 0,
    };
  },
};

// ─── Sales OS ─────────────────────────────────────────────────────────────────

const fetchSalesSummary = async (filter?: ReportFilter, suffix = ''): Promise<Record<string, unknown>[]> => {
  const base = suffix ? `/sales/summary/${suffix}/` : '/sales/summary/';
  const payload = await apiFetch<unknown>(`${base}${buildOsQuery(filter)}`);
  return extractDataArray(payload);
};

export const salesOsApi = {
  getParties: async (filter?: ReportFilter): Promise<SalesOsParty[]> => {
    const rows = await fetchSalesSummary(filter);
    return rows.map(mapSalesOsParty);
  },
  getPartyInvoices: async (partyId: string, filter?: ReportFilter): Promise<SalesOsInvoice[]> => {
    const { invoices } = await fetchPartyBills(partyId, 'sales', filter);
    return invoices as SalesOsInvoice[];
  },
  getBrokers: async (filter?: ReportFilter): Promise<SalesOsBroker[]> => {
    const rows = await fetchSalesSummary(filter, 'broker');
    return rows.map(mapSalesOsBroker);
  },
  getAreas: async (filter?: ReportFilter): Promise<SalesOsArea[]> => {
    const rows = await fetchSalesSummary(filter, 'area');
    return rows.map(mapSalesOsArea);
  },
  getPartyGroups: async (filter?: ReportFilter): Promise<SalesOsPartyGroup[]> => {
    const rows = await fetchSalesSummary(filter, 'pgroup');
    return rows.map(mapSalesOsPartyGroup);
  },
  getSalesPersons: async (filter?: ReportFilter): Promise<SalesOsSalesPerson[]> => {
    const rows = await fetchSalesSummary(filter, 'salesperson');
    return rows.map(mapSalesOsSalesPerson);
  },
  getPartyById: async (id: string, filter?: ReportFilter): Promise<SalesOsParty | undefined> => {
    const { party } = await fetchPartyBills(id, 'sales', filter);
    return party as SalesOsParty | undefined;
  },
  getBrokerById: async (id: string, filter?: ReportFilter): Promise<SalesOsBroker | undefined> => {
    const brokers = await salesOsApi.getBrokers(filter);
    return brokers.find((broker) => broker.id === id);
  },
  getAreaById: async (id: string, filter?: ReportFilter): Promise<SalesOsArea | undefined> => {
    const areas = await salesOsApi.getAreas(filter);
    return areas.find((area) => area.id === id);
  },
  getPartyGroupById: async (id: string, filter?: ReportFilter): Promise<SalesOsPartyGroup | undefined> => {
    const groups = await salesOsApi.getPartyGroups(filter);
    return groups.find((g) => g.id === id);
  },
  getSalesPersonById: async (id: string, filter?: ReportFilter): Promise<SalesOsSalesPerson | undefined> => {
    const sp = await salesOsApi.getSalesPersons(filter);
    return sp.find((s) => s.id === id);
  },
  getPartiesForBroker: async (brokerId: string, filter?: ReportFilter): Promise<SalesOsParty[]> => {
    const payload = await apiFetch<unknown>(`/party/sales${buildOsQuery(filter, { broker: brokerId })}`);
    return extractDataArray(payload).map(mapSalesOsParty);
  },
  getPartiesForArea: async (areaName: string, filter?: ReportFilter): Promise<SalesOsParty[]> => {
    const payload = await apiFetch<unknown>(`/party/sales${buildOsQuery(filter, { area: areaName })}`);
    return extractDataArray(payload).map(mapSalesOsParty);
  },
  getPartiesForPartyGroup: async (groupName: string, filter?: ReportFilter): Promise<SalesOsParty[]> => {
    const payload = await apiFetch<unknown>(`/party/sales${buildOsQuery(filter, { partygroup: groupName })}`);
    return extractDataArray(payload).map(mapSalesOsParty);
  },
  getPartiesForSalesPerson: async (salesPersonName: string, filter?: ReportFilter): Promise<SalesOsParty[]> => {
    const payload = await apiFetch<unknown>(`/party/sales${buildOsQuery(filter, { salesperson: salesPersonName })}`);
    return extractDataArray(payload).map(mapSalesOsParty);
  },
};

// ─── Purchase OS ──────────────────────────────────────────────────────────────

export const purchaseOsApi = {
  getParties: async (filter?: ReportFilter): Promise<PurchaseOsParty[]> => {
    const payload = await apiFetch<unknown>(`/purchase/summary/${buildOsQuery(filter)}`);
    return extractDataArray(payload).map(mapPurchaseOsParty);
  },
  getPartyInvoices: async (partyId: string, filter?: ReportFilter): Promise<PurchaseOsInvoice[]> => {
    const { invoices } = await fetchPartyBills(partyId, 'purchase', filter);
    return invoices as PurchaseOsInvoice[];
  },
  getPartyById: async (id: string, filter?: ReportFilter): Promise<PurchaseOsParty | undefined> => {
    const { party } = await fetchPartyBills(id, 'purchase', filter);
    return party as PurchaseOsParty | undefined;
  },
};

// ─── GP Outstanding ───────────────────────────────────────────────────────────

export const gpOsApi = {
  getParties: async (filter?: ReportFilter): Promise<GpOsParty[]> => {
    const payload = await apiFetch<unknown>(`/generalpurchase/summary/${buildOsQuery(filter)}`);
    return extractDataArray(payload).map(mapGpOsParty);
  },
  getPartyInvoices: async (partyId: string, filter?: ReportFilter): Promise<GpOsInvoice[]> => {
    const { invoices } = await fetchPartyBills(partyId, 'generalpurchase', filter);
    return invoices as GpOsInvoice[];
  },
  getPartyById: async (id: string, filter?: ReportFilter): Promise<GpOsParty | undefined> => {
    const { party } = await fetchPartyBills(id, 'generalpurchase', filter);
    return party as GpOsParty | undefined;
  },
};

// ─── Registers ────────────────────────────────────────────────────────────────

const buildRegisterQuery = (filter?: ReportFilter): string => {
  const params = new URLSearchParams();
  if (filter?.companyId) params.set('company', filter.companyId);
  if (filter?.fromDate) params.set('from_date', filter.fromDate);
  if (filter?.toDate) params.set('to_date', filter.toDate);
  const query = params.toString();
  return query ? `?${query}` : '';
};

// Fetch the raw bill record for a detail page. Tries the detail route first;
// if it 404s or returns a row without invoice fields (backends differ on
// whether the id is the pk or vn_invoice_id), falls back to the list and
// matches the row by either identifier.
const fetchBillRecord = async (
  base: string,
  id: string,
): Promise<Record<string, unknown> | undefined> => {
  const payload = await apiFetch<unknown>(`${base}/${id}/`).catch(() => undefined);
  const rows = extractDataArray(payload);
  let record: Record<string, unknown> | undefined =
    rows[0] ?? (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined);

  const looksValid =
    record && (record.vn_invoice_no != null || record.vn_invoice_id != null || Array.isArray(record.items));
  if (!looksValid) {
    const list = await apiFetch<unknown>(`${base}/`).catch(() => undefined);
    record = extractDataArray(list).find(
      (r) => String(r.vn_invoice_id ?? '') === String(id) || String(r.id ?? '') === String(id),
    );
  }
  return record;
};

export const salesRegisterApi = {
  getEntries: async (filter?: ReportFilter): Promise<RegisterEntry[]> => {
    const payload = await apiFetch<unknown>(`/sales-register/summary/${buildRegisterQuery(filter)}`);
    return extractDataArray(payload).map(mapRegisterEntry);
  },
  getById: async (id: string): Promise<RegisterEntry | undefined> => {
    const payload = await apiFetch<unknown>(`/sales-register/summary/${id}/`);
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const entry = mapRegisterEntry(record);
    const items = Array.isArray(record.items)
      ? record.items.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            name: String(row.vv_item_name ?? row.name ?? ''),
            qty: typeof row.vn_qnty === 'number' ? row.vn_qnty : 0,
            unit: String(row.vv_uom ?? ''),
            rate: typeof row.vn_rate === 'number' ? row.vn_rate : 0,
            amount: typeof row.vn_amount === 'number' ? row.vn_amount : 0,
          };
        })
      : undefined;
    return { ...entry, items };
  },
  // OG bill page: full model row + items[] + account.party (see CHANGES spec).
  getBillDetail: async (id: string): Promise<BillDetail | undefined> => {
    const record = await fetchBillRecord('/sales-register/summary', id);
    return record ? mapBillDetail(record, 'sales') : undefined;
  },
};

export const purchaseRegisterApi = {
  getEntries: async (filter?: ReportFilter): Promise<RegisterEntry[]> => {
    const payload = await apiFetch<unknown>(`/purchase-register/summary/${buildRegisterQuery(filter)}`);
    return extractDataArray(payload).map(mapRegisterEntry);
  },
  getById: async (id: string): Promise<RegisterEntry | undefined> => {
    const payload = await apiFetch<unknown>(`/purchase-register/summary/${id}/`);
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    return mapRegisterEntry(record);
  },
  getBillDetail: async (id: string): Promise<BillDetail | undefined> => {
    const record = await fetchBillRecord('/purchase-register/summary', id);
    return record ? mapBillDetail(record, 'purchase') : undefined;
  },
};

export const gpRegisterApi = {
  getEntries: async (filter?: ReportFilter): Promise<GpRegisterEntry[]> => {
    const payload = await apiFetch<unknown>(`/gp-register/summary/${buildRegisterQuery(filter)}`);
    return extractDataArray(payload).map(mapGpRegisterEntry);
  },
  getById: async (id: string): Promise<GpRegisterEntry | undefined> => {
    const payload = await apiFetch<unknown>(`/gp-register/summary/${id}/`);
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    return mapGpRegisterEntry(record);
  },
  getBillDetail: async (id: string): Promise<BillDetail | undefined> => {
    const record = await fetchBillRecord('/gp-register/summary', id);
    return record ? mapBillDetail(record, 'gp') : undefined;
  },
};

// ─── Stock ────────────────────────────────────────────────────────────────────

const stockCache = new Map<string, { promise: Promise<StockItem[]>; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const stockApi = {
  getAll: async (companyId?: string): Promise<StockItem[]> => {
    // allSettled, not all: the Non-Issue summary aggregates four independent stock
    // sources. With Promise.all a single failing/empty source (e.g. sequance-stock)
    // rejects the whole batch and the summary page renders blank. allSettled keeps
    // every source that DID load so partial data still shows.
    const results = await Promise.allSettled([
      stockApi.getByCategory('yarn', companyId, 'quality', 'yarn'),
      stockApi.getByCategory('beam', companyId, 'quality', 'beam'),
      stockApi.getByCategory('nonIssue', companyId, 'quality', 'gray'),
      stockApi.getByCategory('nonIssue', companyId, 'quality', 'sequance'),
    ]);
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
  getByCategory: (
    category: 'yarn' | 'beam' | 'nonIssue',
    companyId?: string,
    reportType: 'quality' | 'qualityLotGrade' = 'quality',
    source?: 'yarn' | 'beam' | 'gray' | 'sequance',
  ): Promise<StockItem[]> => {
    const stockSource = source ?? category;
    const path = `${stockEndpoint(stockSource, reportType)}${buildCompanyQuery(companyId)}`;
    const cacheKey = `${getActiveAccountId() || ''}-${path}`;

    const now = Date.now();
    const cached = stockCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.promise;
    }

    const promise = (async () => {
      const payload = await apiFetch<unknown>(path);
      const rawData = extractDataArray(payload);
      const aggregated = aggregateStockData(rawData, reportType);
      return aggregated.map((row) => mapYarnStockItem(row, category));
    })();

    stockCache.set(cacheKey, { promise, timestamp: now });

    promise.catch(() => {
      // Remove failed promises from cache so the next call retries
      if (stockCache.get(cacheKey)?.promise === promise) {
        stockCache.delete(cacheKey);
      }
    });

    return promise;
  },
  getCategoryDetails: async (
    itemName: string,
    lotNo: string | undefined,
    category: 'yarn' | 'beam' | 'nonIssue',
    companyId?: string,
    reportType: 'quality' | 'qualityLotGrade' = 'quality',
    source?: 'yarn' | 'beam' | 'gray' | 'sequance',
  ): Promise<StockDetailItem[]> => {
    const stockSource = source ?? category;
    const path = `${stockEndpoint(stockSource, reportType)}${buildCompanyQuery(companyId)}`;
    const payload = await apiFetch<unknown>(path);
    const rawData = extractDataArray(payload);
    
    // Filter raw data matching the selected item and lot
    const filtered = rawData.filter((row) => {
      // The API properties check: vv_item_name and vv_lot_no
      const rowItem = typeof row.vv_item_name === 'string' ? row.vv_item_name : '';
      const rowLot = typeof row.vv_lot_no === 'string' ? row.vv_lot_no : '';
      if (rowItem !== itemName) return false;
      if (reportType === 'qualityLotGrade' && lotNo && rowLot !== lotNo) return false;
      return true;
    });

    return filtered.map(mapStockDetailItem);
  },
};

// ─── Machine Wise Beam Stock ──────────────────────────────────────────────────

export const machineWiseApi = {
  getFilters: async (): Promise<MachineWiseFilterOptions> => {
    const payload = await apiFetch<unknown>('/machine-wise-beam-stock/filters/');
    return mapMachineWiseFilterOptions(payload);
  },
  getDetail: async (filter?: MachineWiseFilter): Promise<MachineWiseDetailRow[]> => {
    const payload = await apiFetch<unknown>(
      `/machine-wise-beam-stock/${buildMachineWiseQuery({ ...filter, view: 'detail' } as MachineWiseFilter)}`,
    );
    return extractDataArray(payload).map(mapMachineWiseDetailRow);
  },
  getSummary: async (filter?: MachineWiseFilter): Promise<MachineWiseSummaryRow[]> => {
    const payload = await apiFetch<unknown>(
      `/machine-wise-beam-stock/${buildMachineWiseQuery({ ...filter, view: 'summary' } as MachineWiseFilter)}`,
    );
    return extractDataArray(payload).map(mapMachineWiseSummaryRow);
  },
};

// ─── Ledger ───────────────────────────────────────────────────────────────────

export const ledgerApi = {
  getEntries: async (filter?: ReportFilter): Promise<LedgerEntry[]> => {
    const query = buildOsQuery(filter, { is_bankcash: filter?.reportType === 'bankcash' ? 1 : undefined });
    const payload = await apiFetch<unknown>(`/ledger/partywise/summary${query.replace('onlydue=0&', '').replace('onlydue=1&', '')}`);
    return extractDataArray(payload).map((row) => ({
      id: String(row.vn_account_id ?? ''),
      date: '',
      particulars: String(row.vv_party_name ?? ''),
      debit: typeof row.balance === 'number' && row.balance > 0 ? row.balance : 0,
      credit: typeof row.balance === 'number' && row.balance < 0 ? Math.abs(row.balance) : 0,
      balance: typeof row.balance === 'number' ? row.balance : 0,
    }));
  },
  getById: async (id: string, filter?: ReportFilter): Promise<LedgerEntry[] | undefined> => {
    const params = new URLSearchParams();
    if (filter?.companyId) params.set('company', filter.companyId);
    if (filter?.fromDate) params.set('from_date', filter.fromDate);
    if (filter?.toDate) params.set('to_date', filter.toDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const payload = await apiFetch<Record<string, unknown>>(`/ledger/${id}${query}`);
    return extractDataArray(payload).map((row) => ({
      id: String(row.vn_transaction_id ?? ''),
      date: String(row.vd_date ?? ''),
      particulars: String(row.vv_narration ?? ''),
      debit: typeof row.vn_debit_amt === 'number' ? row.vn_debit_amt : 0,
      credit: typeof row.vn_credit_amt === 'number' ? row.vn_credit_amt : 0,
      balance: 0,
      voucherNo: typeof row.vv_voucher_no === 'string' ? row.vv_voucher_no : undefined,
      narration: typeof row.vv_narration === 'string' ? row.vv_narration : undefined,
    }));
  },
  getLedgerDetails: async (
    id: string,
    params: { is_bankcash?: string; company?: number; from_date?: string; to_date?: string }
  ): Promise<{ data: any[]; openingBalance: number }> => {
    const urlParams = new URLSearchParams();
    if (params.company && params.company > 0) urlParams.set('company', String(params.company));
    if (params.is_bankcash) urlParams.set('is_bankcash', params.is_bankcash);
    if (params.from_date) urlParams.set('from_date', params.from_date);
    if (params.to_date) urlParams.set('to_date', params.to_date);
    const query = urlParams.toString() ? `?${urlParams.toString()}` : '';
    const response = await apiFetch<{ data: any[]; opening_balance?: number }>(`/ledger/${id}${query}`);
    return {
      data: response.data || [],
      openingBalance: response.opening_balance || 0,
    };
  },
  getBankAccounts: async (companyId?: string): Promise<BankAccount[]> => {
    const params = new URLSearchParams();
    if (companyId) params.set('company', companyId);
    params.set('is_bankcash', '1');
    const query = `?${params.toString()}`;
    const payload = await apiFetch<unknown>(`/ledger/partywise/summary${query}`);
    return extractDataArray(payload).map((row, index) => mapBankAccount(row, index));
  },
  getPartyLedger: async (filter?: ReportFilter): Promise<PartyLedgerAccount[]> => {
    const params = new URLSearchParams();
    if (filter?.companyId) params.set('company', filter.companyId);
    if (filter?.fromDate) params.set('from_date', filter.fromDate);
    if (filter?.toDate) params.set('to_date', filter.toDate);
    params.set('is_bankcash', '0');
    const query = `?${params.toString()}`;
    const payload = await apiFetch<unknown>(`/ledger/partywise/summary${query}`);
    return extractDataArray(payload).map(mapPartyLedgerAccount);
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getBankAccounts: (companyId?: string): Promise<BankAccount[]> => ledgerApi.getBankAccounts(companyId),
  getSalesReport: async (companyId?: string): Promise<SalesReportPoint[]> => {
    const summary = await companyApi.getSummary();
    return [
      { label: 'Purchase', thisWeek: summary.totalPurchase, lastWeek: summary.totalPurchase },
      { label: 'Sales', thisWeek: summary.totalSales, lastWeek: summary.totalSales },
      { label: 'GP', thisWeek: summary.totalGp, lastWeek: summary.totalGp },
    ];
  },
  getCompanyDetail: (companyId: string): Promise<Company | undefined> => companyApi.getById(companyId),
};

// ─── Items ────────────────────────────────────────────────────────────────────

type ApiItem = {
  id?: unknown;
  vn_item_id?: unknown;
  vv_item_code?: unknown;
  vv_item_name?: unknown;
  vv_uom?: unknown;
  vn_company_id?: unknown;
  vn_sales_rate?: unknown;
  vn_hsn_code?: unknown;
  vn_gst?: unknown;
  vv_product_code?: unknown;
};



const mapItem = (row: ApiItem): Item => ({
  id: typeof row.vn_item_id === 'number' ? row.vn_item_id : 0,
  recordId: typeof row.id === 'number' ? row.id : 0,
  code: typeof row.vv_item_code === 'string' ? row.vv_item_code : '',
  name: typeof row.vv_item_name === 'string' ? row.vv_item_name : '',
  uom: typeof row.vv_uom === 'string' ? row.vv_uom : '',
  companyId: typeof row.vn_company_id === 'number' ? row.vn_company_id : 0,
  salesRate: typeof row.vn_sales_rate === 'number' ? row.vn_sales_rate : 0,
  hsnCode: typeof row.vn_hsn_code === 'string' ? row.vn_hsn_code : String(row.vn_hsn_code ?? ''),
  gst: typeof row.vn_gst === 'number' ? row.vn_gst : 0,
  productCode: typeof row.vv_product_code === 'string' ? row.vv_product_code : '',
});

export const itemsApi = {
  getAll: async (companyId: string): Promise<Item[]> => {
    const params = new URLSearchParams({ company: companyId });
    const payload = await apiFetch<unknown>(`/items/?${params.toString()}`);
    const rows = extractDataArray(payload);
    return rows.map((row) => mapItem(row as ApiItem));
  },
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const mapAccountParty = (row: Record<string, unknown>): AccountParty => {
  // Compose a readable address from address1 + area/city (whichever are present).
  const addressParts = [str(row.vv_address1), str(row.vv_area) || str(row.vv_city)].filter(Boolean);
  const gst = str(row.vv_gstin_no);
  return {
    id: typeof row.vn_party_id === 'number'
      ? row.vn_party_id
      : typeof row.vn_account_id === 'number'
        ? row.vn_account_id
        : Number(row.id ?? 0) || 0,
    name: typeof row.vv_party_name === 'string'
      ? row.vv_party_name
      : typeof row.vv_account_name === 'string'
        ? row.vv_account_name
        : String(row.name ?? ''),
    address: addressParts.join(', ') || undefined,
    gstNo: gst || undefined,
    phone: str(row.vv_mobile) || undefined,
  };
};

export const accountsApi = {
  getAll: async (companyId?: string): Promise<AccountParty[]> => {
    // If companyId is provided, append it to filter the accounts on the backend.
    const url = companyId ? `/accounts/?company=${companyId}` : `/accounts/`;
    const payload = await apiFetch<unknown>(url);
    return extractDataArray(payload).map(mapAccountParty);
  },
};

// ─── Sales Orders ─────────────────────────────────────────────────────────────

const mapSalesOrder = (row: Record<string, unknown>): SalesOrder => {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: typeof row.id === 'number' ? row.id : Number(row.id) || 0,
    companyId: typeof row.company_id === 'number' ? row.company_id : 0,
    orderNo: typeof row.order_no === 'string' ? row.order_no : '',
    date: typeof row.date === 'string' ? row.date : '',
    partyId: typeof row.party_id === 'number' ? row.party_id : 0,
    partyName: typeof row.party_name === 'string' ? row.party_name : '',
    discount_type: typeof row.discount_type === 'string' && (row.discount_type === 'amount' || row.discount_type === 'percentage') ? row.discount_type : 'amount',
    discount_value: typeof row.discount_value === 'number' ? row.discount_value : 0,
    discount: typeof row.discount === 'number' ? row.discount : 0,
    totalAmount: typeof row.total_amount === 'number' ? row.total_amount : 0,
    remark: typeof row.remark === 'string' ? row.remark : '',
    items: rawItems.map((it) => {
      const item = it as Record<string, unknown>;
      return {
        id: typeof item.id === 'number' ? item.id : Number(item.id) || 0,
        item_id: typeof item.item_id === 'number' ? item.item_id : 0,
        item_name: typeof item.item_name === 'string' ? item.item_name : '',
        color: typeof item.color === 'string' ? item.color : '',
        nos: typeof item.nos === 'number' ? item.nos : 0,
        cut: typeof item.cut === 'number' ? item.cut : 0,
        qnty: typeof item.qnty === 'number' ? item.qnty : 0,
        rate: typeof item.rate === 'number' ? item.rate : 0,
        amount: typeof item.amount === 'number' ? item.amount : 0,
        line_no: typeof item.line_no === 'number' ? item.line_no : 0,
      };
    }),
  };
};

export const salesOrdersApi = {
  getAll: async (companyId?: string): Promise<SalesOrder[]> => {
    const params = new URLSearchParams();
    if (companyId) params.set('company', companyId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const payload = await apiFetch<unknown>(`/sales-orders/${query}`);
    return extractDataArray(payload).map(mapSalesOrder);
  },
  getById: async (id: string): Promise<SalesOrder | undefined> => {
    const payload = await apiFetch<Record<string, unknown>>(`/sales-orders/${id}/`);
    if (!payload || typeof payload !== 'object') return undefined;
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    return mapSalesOrder(data as Record<string, unknown>);
  },
  create: async (data: CreateSalesOrderPayload): Promise<SalesOrder> => {
    const payload = await apiFetch<Record<string, unknown>>('/sales-orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const responseData = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    return mapSalesOrder(responseData as Record<string, unknown>);
  },
  update: async (id: string, data: CreateSalesOrderPayload): Promise<SalesOrder> => {
    const payload = await apiFetch<Record<string, unknown>>(`/sales-orders/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const responseData = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    return mapSalesOrder(responseData as Record<string, unknown>);
  },
  delete: async (id: string): Promise<void> => {
    await apiFetch(`/sales-orders/${id}/`, { method: 'DELETE' });
  },
  getLastColor: async (companyId: string, itemId: number): Promise<string | null> => {
    const params = new URLSearchParams({ company: companyId, item_id: String(itemId) });
    try {
      const payload = await apiFetch<Record<string, unknown>>(`/sales-orders/last-color/?${params.toString()}`);
      return typeof payload?.color === 'string' ? payload.color : null;
    } catch {
      return null;
    }
  },
};

