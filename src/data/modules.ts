import type { AppStackParamList, User } from '../types';
import { Colors } from '../theme';

const ROUTE_TO_MODULE_NAMES: Record<string, string[]> = {
  SalesRegisterStack: ['Sales Register'],
  PurchaseRegisterStack: ['Purchase Register'],
  SalesOsStack: ['Sales OS'],
  PurchaseOsStack: ['Purchase OS'],
  GpOsStack: ['GP OS'],
  GpRegisterStack: ['GP Register'],
  StockStack: ['Non-Issue Stock', 'Yarn Stock', 'Beam Stock'],
  MachineWiseStack: ['Machine Wise Beam Stock', 'Beam Stock'],
  BankCashLedger: ['Bank Cash Ledger'],
  PartyLedger: ['Party Ledger'],
};

export const getAuthorizedModules = (user: User | null): AppModule[] => {
  if (!user || !user.isSubuser) {
    return APP_MODULES;
  }

  const allowedFormNames = (user.allowedForms || []).map((f) => f.formName);

  return APP_MODULES.filter((mod) => {
    const requiredNames = ROUTE_TO_MODULE_NAMES[mod.key] || [];
    return requiredNames.some((name) => allowedFormNames.includes(name));
  });
};

export interface AppModule {
  key: string;
  label: string;
  icon: string;
  color: string;
  route: keyof AppStackParamList;
  comingSoon?: boolean;
}

export const COMING_SOON_ROUTES: Array<keyof AppStackParamList> = ['MachineWiseStack'];

export const isComingSoonRoute = (route: string): boolean =>
  (COMING_SOON_ROUTES as string[]).includes(route);

/** Distinct module accents — character without fighting the brand. */
export const APP_MODULES: AppModule[] = [
  { key: 'SalesRegisterStack', label: 'Sales Register', icon: 'receipt', color: Colors.primary, route: 'SalesRegisterStack' },
  { key: 'PurchaseRegisterStack', label: 'Purchase Register', icon: 'clipboard-list-outline', color: Colors.primaryLight, route: 'PurchaseRegisterStack' },
  { key: 'SalesOsStack', label: 'AR Outstanding', icon: 'currency-inr', color: Colors.success, route: 'SalesOsStack' },
  { key: 'PurchaseOsStack', label: 'AP Outstanding', icon: 'cart-outline', color: Colors.warning, route: 'PurchaseOsStack' },
  { key: 'GpOsStack', label: 'GP Outstanding', icon: 'file-document-check-outline', color: Colors.purple500, route: 'GpOsStack' },
  { key: 'GpRegisterStack', label: 'GP Register', icon: 'chart-bar', color: Colors.blue500, route: 'GpRegisterStack' },
  { key: 'StockStack', label: 'Non-Issue', icon: 'format-list-text', color: Colors.danger, route: 'StockStack' },
  { key: 'MachineWiseStack', label: 'Machine Wise', icon: 'cog-outline', color: Colors.gray600, route: 'MachineWiseStack', comingSoon: true },
  { key: 'BankCashLedger', label: 'Bank / Cash Ledger', icon: 'bank-outline', color: '#06B6D4', route: 'BankCashLedger' },
  { key: 'PartyLedger', label: 'Party Ledger', icon: 'account-cash-outline', color: '#EC4899', route: 'PartyLedger' },
];

export const DEFAULT_BOOKMARKS: string[] = [
  'SalesRegisterStack',
  'PurchaseRegisterStack',
  'SalesOsStack',
  'PurchaseOsStack',
];
