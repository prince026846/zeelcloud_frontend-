import type {
  User,
  Company,
  SubUser,
  BankAccount,
  PartyLedgerAccount,
  SalesReportPoint,
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
  LedgerEntry,
} from '../types';

// ─── User ─────────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'u001',
  username: 'admin',
  name: 'Rajesh Patel',
  role: 'Admin',
  email: 'rajesh.patel@zeelinfosys.com',
  phone: '+91 98765 43210',
};

// ─── Companies ────────────────────────────────────────────────────────────────

export const mockCompanies: Company[] = [
  { id: 'c001', name: 'ZEEL TEXTILE', city: 'Surat', isActive: true },
  { id: 'c002', name: 'MAHI TEXTILE', city: 'Surat', isActive: true },
  { id: 'c003', name: 'SHREE CREATION', city: 'Surat', isActive: true },
  { id: 'c004', name: 'VED FASHION', city: 'Ahmedabad', isActive: true },
  { id: 'c005', name: 'VARNI SILK MILLS', city: 'Surat', isActive: true },
];

// ─── Sub Users ────────────────────────────────────────────────────────────────

export const mockSubUsers: SubUser[] = [
  {
    id: 'su001', name: 'Ramesh Kumar', username: 'rameshkumar', password: 'ramesh@123',
    email: 'ramesh.kumar@zeeltextiles.com', phone: '+91 98765 42250',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: true,
    isSalesOrderCreationAllowed: true,
    allowedModules: ['Stock Details', 'Sales Outstanding / Data Entry', 'Purchase Outstanding', 'Sales Register', 'Work / Cash Ledger', 'Party Ledger', 'Yarn Stock'],
  },
  {
    id: 'su002', name: 'Suresh Patel', username: 'sureshpatel', password: 'suresh@123',
    email: 'suresh.patel@zeeltextiles.com', phone: '+91 98765 42251',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: true,
    isSalesOrderCreationAllowed: true,
    allowedModules: ['Stock Details', 'Sales Register', 'Purchase Register', 'Party Ledger'],
  },
  {
    id: 'su003', name: 'Amit Sharma', username: 'amitsharma', password: 'amit@123',
    email: 'amit.sharma@zeeltextiles.com', phone: '+91 98765 42252',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: true,
    isSalesOrderCreationAllowed: false,
    allowedModules: ['Sales Outstanding / Data Entry', 'Purchase Outstanding', 'General Purchase Outstanding'],
  },
  {
    id: 'su004', name: 'Pooja Mehta', username: 'poojamehta', password: 'pooja@123',
    email: 'pooja.mehta@zeeltextiles.com', phone: '+91 98765 42253',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: false,
    isSalesOrderCreationAllowed: false,
    allowedModules: ['Stock Details', 'Yarn Stock', 'Beam Stock', 'Non Issue Stock'],
  },
  {
    id: 'su005', name: 'Manish Verma', username: 'manishverma', password: 'manish@123',
    email: 'manish.verma@zeeltextiles.com', phone: '+91 98765 42254',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: true,
    isSalesOrderCreationAllowed: true,
    allowedModules: ['Sales Register', 'Purchase Register', 'Work / Cash Ledger', 'Party Ledger', 'Stock Details'],
  },
  {
    id: 'su006', name: 'Kiran Joshi', username: 'kiranjoshi', password: 'kiran@123',
    email: 'kiran.joshi@zeeltextiles.com', phone: '+91 98765 42255',
    companyName: 'Zeel Textiles Pvt. Ltd.', isActive: true,
    isSalesOrderCreationAllowed: false,
    allowedModules: ['Stock Details', 'Sales Outstanding / Data Entry'],
  },
];

// ─── Dashboard: Bank & Cash balances ──────────────────────────────────────────

export const mockBankAccounts: BankAccount[] = [
  { id: 'ba001', name: 'Bank of Baroda C/A', accountNo: '00860000817', amount: 3926180 },
  { id: 'ba002', name: 'HDFC Bank C/A', accountNo: '50200012345678', amount: 67001690 },
  { id: 'ba003', name: 'SBI Bank C/A', accountNo: '30012345678', amount: -125000 },
  { id: 'ba004', name: 'Cash A/C', amount: 400000 },
  { id: 'ba005', name: 'Petty Cash', amount: 0 },
];

// ─── Party Ledger balances ────────────────────────────────────────────────────

export const mockPartyLedger: PartyLedgerAccount[] = [
  { id: 'pl001', name: 'Shree Ram Textiles', balance: 1245000, phone: '+91 98765 43210', address: 'Plot No. 12, Ring Road, Surat' },
  { id: 'pl002', name: 'Bhavani Sarees Pvt Ltd', balance: 876500, phone: '+91 97654 32109', address: 'Near Textile Market, Ahmedabad' },
  { id: 'pl003', name: 'Laxmi Fabrics', balance: -158000, phone: '+91 96543 21098', address: 'Station Road, Bhiwandi' },
  { id: 'pl004', name: 'Ganesh Weavers', balance: 0, phone: '+91 95432 10987', address: 'GIDC Industrial Area, Surat' },
  { id: 'pl005', name: 'Jai Ambe Silk House', balance: 920000, phone: '+91 94321 09876', address: 'Millennium Market, Ring Road, Surat' },
  { id: 'pl006', name: 'Krishnadev Traders', balance: -42000, phone: '+91 93210 98765', address: 'Main Bazar, Varanasi' },
  { id: 'pl007', name: 'Mahalaxmi Textiles', balance: 654000, phone: '+91 92109 87654', address: 'Navsari Highway, Navsari' },
  { id: 'pl008', name: 'Saraswati Cloth Merchants', balance: 0, phone: '+91 91098 76543', address: 'Kalupur, Ahmedabad' },
];

// ─── Dashboard: Sales report (weekly bar chart) ───────────────────────────────

export const mockSalesReport: SalesReportPoint[] = [
  { label: 'Mon', thisWeek: 320000, lastWeek: 280000 },
  { label: 'Tue', thisWeek: 410000, lastWeek: 350000 },
  { label: 'Wed', thisWeek: 290000, lastWeek: 380000 },
  { label: 'Thu', thisWeek: 520000, lastWeek: 420000 },
  { label: 'Fri', thisWeek: 470000, lastWeek: 510000 },
  { label: 'Sat', thisWeek: 610000, lastWeek: 460000 },
];

// ─── Sales OS Parties ─────────────────────────────────────────────────────────

export const mockSalesOsParties: SalesOsParty[] = [
  {
    id: 'sp001',
    name: 'Shree Ram Textiles',
    city: 'Surat',
    totalOs: 1245000,
    invoiceCount: 5,
    daysOverdue: 45,
    lastPayment: '2024-05-10',
    creditLimit: 1500000,
    phone: '+91 98765 43210',
  },
  {
    id: 'sp002',
    name: 'Bhavani Sarees Pvt Ltd',
    city: 'Ahmedabad',
    totalOs: 876500,
    invoiceCount: 3,
    daysOverdue: 12,
    lastPayment: '2024-06-01',
    creditLimit: 1000000,
    phone: '+91 97654 32109',
  },
  {
    id: 'sp003',
    name: 'Laxmi Fabrics',
    city: 'Mumbai',
    totalOs: 1580000,
    invoiceCount: 7,
    daysOverdue: 62,
    lastPayment: '2024-04-15',
    creditLimit: 2000000,
    phone: '+91 96543 21098',
  },
  {
    id: 'sp004',
    name: 'Ganesh Weavers',
    city: 'Rajkot',
    totalOs: 432000,
    invoiceCount: 2,
    daysOverdue: 5,
    lastPayment: '2024-06-10',
    creditLimit: 600000,
    phone: '+91 95432 10987',
  },
  {
    id: 'sp005',
    name: 'Jai Ambe Silk House',
    city: 'Vadodara',
    totalOs: 920000,
    invoiceCount: 4,
    daysOverdue: 30,
    lastPayment: '2024-05-20',
    creditLimit: 1200000,
    phone: '+91 94321 09876',
  },
  {
    id: 'sp006',
    name: 'Krishnadev Traders',
    city: 'Surat',
    totalOs: 2100000,
    invoiceCount: 9,
    daysOverdue: 78,
    lastPayment: '2024-03-30',
    creditLimit: 2500000,
    phone: '+91 93210 98765',
  },
  {
    id: 'sp007',
    name: 'Mahalaxmi Textiles',
    city: 'Ahmedabad',
    totalOs: 654000,
    invoiceCount: 3,
    daysOverdue: 18,
    lastPayment: '2024-05-28',
    creditLimit: 800000,
    phone: '+91 92109 87654',
  },
  {
    id: 'sp008',
    name: 'Saraswati Cloth Merchants',
    city: 'Surat',
    totalOs: 310000,
    invoiceCount: 2,
    daysOverdue: 0,
    lastPayment: '2024-06-12',
    creditLimit: 500000,
    phone: '+91 91098 76543',
  },
];

// ─── Sales OS Invoices ────────────────────────────────────────────────────────

export const mockSalesOsInvoices: SalesOsInvoice[] = [
  // sp001
  { id: 'si001', number: 'INV-2024-001', date: '2024-04-01', amount: 350000, outstanding: 350000, daysLeft: -45, partyId: 'sp001' },
  { id: 'si002', number: 'INV-2024-015', date: '2024-04-20', amount: 420000, outstanding: 420000, daysLeft: -26, partyId: 'sp001' },
  { id: 'si003', number: 'INV-2024-032', date: '2024-05-05', amount: 280000, outstanding: 280000, daysLeft: -11, partyId: 'sp001' },
  { id: 'si004', number: 'INV-2024-048', date: '2024-05-18', amount: 125000, outstanding: 125000, daysLeft: 2, partyId: 'sp001' },
  { id: 'si005', number: 'INV-2024-061', date: '2024-06-01', amount: 70000, outstanding: 70000, daysLeft: 15, partyId: 'sp001' },
  // sp002
  { id: 'si006', number: 'INV-2024-022', date: '2024-04-25', amount: 310000, outstanding: 310000, daysLeft: -12, partyId: 'sp002' },
  { id: 'si007', number: 'INV-2024-039', date: '2024-05-10', amount: 356500, outstanding: 356500, daysLeft: 3, partyId: 'sp002' },
  { id: 'si008', number: 'INV-2024-055', date: '2024-05-28', amount: 210000, outstanding: 210000, daysLeft: 21, partyId: 'sp002' },
  // sp003
  { id: 'si009', number: 'INV-2024-008', date: '2024-03-20', amount: 280000, outstanding: 280000, daysLeft: -62, partyId: 'sp003' },
  { id: 'si010', number: 'INV-2024-019', date: '2024-04-10', amount: 320000, outstanding: 320000, daysLeft: -41, partyId: 'sp003' },
  { id: 'si011', number: 'INV-2024-028', date: '2024-04-28', amount: 250000, outstanding: 250000, daysLeft: -23, partyId: 'sp003' },
  { id: 'si012', number: 'INV-2024-042', date: '2024-05-15', amount: 410000, outstanding: 410000, daysLeft: -6, partyId: 'sp003' },
  { id: 'si013', number: 'INV-2024-058', date: '2024-06-01', amount: 200000, outstanding: 200000, daysLeft: 15, partyId: 'sp003' },
  // sp004
  { id: 'si014', number: 'INV-2024-051', date: '2024-05-22', amount: 232000, outstanding: 232000, daysLeft: -5, partyId: 'sp004' },
  { id: 'si015', number: 'INV-2024-063', date: '2024-06-08', amount: 200000, outstanding: 200000, daysLeft: 22, partyId: 'sp004' },
  // sp005
  { id: 'si016', number: 'INV-2024-025', date: '2024-04-30', amount: 280000, outstanding: 280000, daysLeft: -30, partyId: 'sp005' },
  { id: 'si017', number: 'INV-2024-041', date: '2024-05-14', amount: 240000, outstanding: 240000, daysLeft: -16, partyId: 'sp005' },
  { id: 'si018', number: 'INV-2024-056', date: '2024-05-30', amount: 220000, outstanding: 220000, daysLeft: -1, partyId: 'sp005' },
  { id: 'si019', number: 'INV-2024-065', date: '2024-06-10', amount: 180000, outstanding: 180000, daysLeft: 24, partyId: 'sp005' },
];

// ─── Sales OS Brokers ─────────────────────────────────────────────────────────

export const mockSalesOsBrokers: SalesOsBroker[] = [
  { id: 'br001', name: 'Hitesh Mehta', city: 'Surat', totalOs: 3200000, partyCount: 12, phone: '+91 99876 54321' },
  { id: 'br002', name: 'Nilesh Shah', city: 'Ahmedabad', totalOs: 1850000, partyCount: 8, phone: '+91 98765 43210' },
  { id: 'br003', name: 'Jayesh Desai', city: 'Mumbai', totalOs: 2100000, partyCount: 10, phone: '+91 97654 32109' },
  { id: 'br004', name: 'Kiran Patel', city: 'Rajkot', totalOs: 980000, partyCount: 5, phone: '+91 96543 21098' },
  { id: 'br005', name: 'Pradeep Jain', city: 'Vadodara', totalOs: 1450000, partyCount: 7, phone: '+91 95432 10987' },
];

// ─── Sales OS Areas ───────────────────────────────────────────────────────────

export const mockSalesOsAreas: SalesOsArea[] = [
  { id: 'ar001', name: 'Surat', totalOs: 3655000, partyCount: 18 },
  { id: 'ar002', name: 'Ahmedabad', totalOs: 1530500, partyCount: 11 },
  { id: 'ar003', name: 'Mumbai', totalOs: 1580000, partyCount: 7 },
  { id: 'ar004', name: 'Rajkot', totalOs: 432000, partyCount: 4 },
  { id: 'ar005', name: 'Vadodara', totalOs: 920000, partyCount: 6 },
];

// ─── Sales OS Party Groups ────────────────────────────────────────────────────

export const mockSalesOsPartyGroups: SalesOsPartyGroup[] = [
  { id: 'pg001', name: 'Retail Customers', totalOs: 2100000, partyCount: 15 },
  { id: 'pg002', name: 'Wholesale Dealers', totalOs: 4200000, partyCount: 22 },
  { id: 'pg003', name: 'Exporters', totalOs: 1580000, partyCount: 8 },
  { id: 'pg004', name: 'Local Merchants', totalOs: 1237500, partyCount: 11 },
];

// ─── Sales OS Sales Persons ───────────────────────────────────────────────────

export const mockSalesOsSalesPersons: SalesOsSalesPerson[] = [
  { id: 'slp001', name: 'Amit Trivedi', totalOs: 3200000, partyCount: 14, target: 5000000 },
  { id: 'slp002', name: 'Sonal Joshi', totalOs: 2100000, partyCount: 11, target: 3000000 },
  { id: 'slp003', name: 'Ravi Kapoor', totalOs: 1850000, partyCount: 9, target: 2500000 },
  { id: 'slp004', name: 'Meena Sharma', totalOs: 967500, partyCount: 6, target: 2000000 },
];

// ─── Purchase OS Parties ──────────────────────────────────────────────────────

export const mockPurchaseOsParties: PurchaseOsParty[] = [
  { id: 'pp001', name: 'Dhruv Yarn Mills', city: 'Surat', totalOs: 1120000, invoiceCount: 4, daysOverdue: 25, phone: '+91 98765 11111' },
  { id: 'pp002', name: 'Samarth Weavers', city: 'Ahmedabad', totalOs: 650000, invoiceCount: 3, daysOverdue: 8, phone: '+91 97654 22222' },
  { id: 'pp003', name: 'Hari Om Textiles', city: 'Surat', totalOs: 2100000, invoiceCount: 6, daysOverdue: 50, phone: '+91 96543 33333' },
  { id: 'pp004', name: 'Narmada Fibres', city: 'Vadodara', totalOs: 780000, invoiceCount: 3, daysOverdue: 0, phone: '+91 95432 44444' },
  { id: 'pp005', name: 'Tapti Silk Traders', city: 'Surat', totalOs: 430000, invoiceCount: 2, daysOverdue: 15, phone: '+91 94321 55555' },
];

export const mockPurchaseOsInvoices: PurchaseOsInvoice[] = [
  { id: 'pi001', number: 'PUR-2024-001', date: '2024-04-05', amount: 350000, outstanding: 350000, daysLeft: -25, partyId: 'pp001' },
  { id: 'pi002', number: 'PUR-2024-012', date: '2024-04-22', amount: 420000, outstanding: 420000, daysLeft: -8, partyId: 'pp001' },
  { id: 'pi003', number: 'PUR-2024-005', date: '2024-04-10', amount: 310000, outstanding: 310000, daysLeft: -8, partyId: 'pp002' },
  { id: 'pi004', number: 'PUR-2024-008', date: '2024-04-15', amount: 580000, outstanding: 580000, daysLeft: -50, partyId: 'pp003' },
  { id: 'pi005', number: 'PUR-2024-019', date: '2024-05-08', amount: 780000, outstanding: 780000, daysLeft: -15, partyId: 'pp003' },
];

// ─── Sales Register Entries ───────────────────────────────────────────────────

export const mockSalesRegisterEntries: RegisterEntry[] = [
  {
    id: 'sr001', date: '2024-06-01', partyName: 'Shree Ram Textiles', amount: 125000, type: 'Sale', invoiceNo: 'SI-2024-101',
    items: [
      { name: 'Cotton Fabric 60x80', qty: 500, unit: 'Meter', rate: 180, amount: 90000 },
      { name: 'Polyester Blend', qty: 250, unit: 'Meter', rate: 140, amount: 35000 },
    ],
    tax: 10800, discount: 800,
  },
  {
    id: 'sr002', date: '2024-06-02', partyName: 'Bhavani Sarees Pvt Ltd', amount: 78500, type: 'Sale', invoiceNo: 'SI-2024-102',
    items: [
      { name: 'Silk Saree Fabric', qty: 200, unit: 'Meter', rate: 350, amount: 70000 },
      { name: 'Zari Border', qty: 50, unit: 'Meter', rate: 170, amount: 8500 },
    ],
    tax: 7000, discount: 0,
  },
  { id: 'sr003', date: '2024-06-03', partyName: 'Laxmi Fabrics', amount: 234000, type: 'Sale', invoiceNo: 'SI-2024-103', items: [], tax: 21000, discount: 1500 },
  { id: 'sr004', date: '2024-06-04', partyName: 'Ganesh Weavers', amount: 56000, type: 'Sale', invoiceNo: 'SI-2024-104', items: [], tax: 5040, discount: 0 },
  { id: 'sr005', date: '2024-06-05', partyName: 'Jai Ambe Silk House', amount: 189000, type: 'Sale', invoiceNo: 'SI-2024-105', items: [], tax: 17000, discount: 2000 },
  { id: 'sr006', date: '2024-06-06', partyName: 'Krishnadev Traders', amount: 312000, type: 'Sale', invoiceNo: 'SI-2024-106', items: [], tax: 28000, discount: 3500 },
  { id: 'sr007', date: '2024-06-08', partyName: 'Mahalaxmi Textiles', amount: 97500, type: 'Return', invoiceNo: 'SI-2024-107', items: [], tax: 8800, discount: 0 },
  { id: 'sr008', date: '2024-06-10', partyName: 'Saraswati Cloth Merchants', amount: 43000, type: 'Sale', invoiceNo: 'SI-2024-108', items: [], tax: 3900, discount: 500 },
  { id: 'sr009', date: '2024-06-12', partyName: 'Shree Ram Textiles', amount: 167000, type: 'Sale', invoiceNo: 'SI-2024-109', items: [], tax: 15000, discount: 1200 },
  { id: 'sr010', date: '2024-06-14', partyName: 'Bhavani Sarees Pvt Ltd', amount: 88000, type: 'Sale', invoiceNo: 'SI-2024-110', items: [], tax: 7900, discount: 0 },
];

// ─── Purchase Register Entries ────────────────────────────────────────────────

export const mockPurchaseRegisterEntries: RegisterEntry[] = [
  {
    id: 'pr001', date: '2024-06-01', partyName: 'Dhruv Yarn Mills', amount: 280000, type: 'Purchase', invoiceNo: 'PI-2024-051',
    items: [
      { name: 'Cotton Yarn 30s', qty: 1000, unit: 'Kg', rate: 200, amount: 200000 },
      { name: 'Cotton Yarn 40s', qty: 400, unit: 'Kg', rate: 200, amount: 80000 },
    ],
    tax: 25200, discount: 0,
  },
  { id: 'pr002', date: '2024-06-03', partyName: 'Samarth Weavers', amount: 155000, type: 'Purchase', invoiceNo: 'PI-2024-052', items: [], tax: 13900, discount: 0 },
  { id: 'pr003', date: '2024-06-04', partyName: 'Hari Om Textiles', amount: 420000, type: 'Purchase', invoiceNo: 'PI-2024-053', items: [], tax: 37800, discount: 5000 },
  { id: 'pr004', date: '2024-06-06', partyName: 'Narmada Fibres', amount: 98000, type: 'Purchase', invoiceNo: 'PI-2024-054', items: [], tax: 8820, discount: 0 },
  { id: 'pr005', date: '2024-06-07', partyName: 'Tapti Silk Traders', amount: 67000, type: 'Purchase', invoiceNo: 'PI-2024-055', items: [], tax: 6030, discount: 1000 },
  { id: 'pr006', date: '2024-06-09', partyName: 'Dhruv Yarn Mills', amount: 310000, type: 'Purchase', invoiceNo: 'PI-2024-056', items: [], tax: 27900, discount: 0 },
  { id: 'pr007', date: '2024-06-10', partyName: 'Samarth Weavers', amount: 190000, type: 'Return', invoiceNo: 'PI-2024-057', items: [], tax: 17100, discount: 0 },
  { id: 'pr008', date: '2024-06-11', partyName: 'Hari Om Textiles', amount: 530000, type: 'Purchase', invoiceNo: 'PI-2024-058', items: [], tax: 47700, discount: 8000 },
  { id: 'pr009', date: '2024-06-13', partyName: 'Narmada Fibres', amount: 87000, type: 'Purchase', invoiceNo: 'PI-2024-059', items: [], tax: 7830, discount: 0 },
  { id: 'pr010', date: '2024-06-14', partyName: 'Tapti Silk Traders', amount: 143000, type: 'Purchase', invoiceNo: 'PI-2024-060', items: [], tax: 12870, discount: 2000 },
];

// ─── GP Register Entries ──────────────────────────────────────────────────────

export const mockGpRegisterEntries: GpRegisterEntry[] = [
  { id: 'gp001', date: '2024-06-01', partyName: 'Surat Dyeing & Processing', amount: 62500, entryNo: 'LOT-001', billNo: 'B001', description: '60x80 Cotton Dyeing' },
  { id: 'gp002', date: '2024-06-02', partyName: 'Bharat Finishing Works', amount: 45000, entryNo: 'LOT-002', billNo: 'B002', description: 'Polyester Blend Finishing' },
  { id: 'gp003', date: '2024-06-04', partyName: 'Om Prints', amount: 96000, entryNo: 'LOT-003', billNo: 'B003', description: 'Silk Rayon Printing' },
  { id: 'gp004', date: '2024-06-05', partyName: 'Surat Dyeing & Processing', amount: 50000, entryNo: 'LOT-004', billNo: 'B004', description: 'Cotton Lawn Dyeing' },
  { id: 'gp005', date: '2024-06-07', partyName: 'Kiran Process House', amount: 30000, entryNo: 'LOT-005', billNo: 'B005', description: '40x40 Cotton Bleaching' },
  { id: 'gp006', date: '2024-06-09', partyName: 'Bharat Finishing Works', amount: 70000, entryNo: 'LOT-006', billNo: 'B006', description: 'Viscose Blend Finishing' },
  { id: 'gp007', date: '2024-06-11', partyName: 'Om Prints', amount: 36000, entryNo: 'LOT-007', billNo: 'B007', description: 'Georgette Printing' },
  { id: 'gp008', date: '2024-06-13', partyName: 'Kiran Process House', amount: 70000, entryNo: 'LOT-008', billNo: 'B008', description: '60x80 Cotton Bleaching' },
];

// ─── Stock Items ──────────────────────────────────────────────────────────────

export const mockStockItems: StockItem[] = [
  // Yarn
  { id: 'st001', name: 'Cotton Yarn 30s', quality: '30s Combed', qty: 5000, unit: 'Kg', value: 1000000, location: 'Warehouse A', category: 'yarn', lotNo: 'YL-001' },
  { id: 'st002', name: 'Cotton Yarn 40s', quality: '40s Combed', qty: 3200, unit: 'Kg', value: 720000, location: 'Warehouse A', category: 'yarn', lotNo: 'YL-002' },
  { id: 'st003', name: 'Polyester Yarn', quality: '75D/36F', qty: 2800, unit: 'Kg', value: 448000, location: 'Warehouse B', category: 'yarn', lotNo: 'YL-003' },
  { id: 'st004', name: 'Viscose Yarn', quality: '20/2', qty: 1500, unit: 'Kg', value: 315000, location: 'Warehouse B', category: 'yarn', lotNo: 'YL-004' },
  { id: 'st005', name: 'Silk Yarn', quality: 'Grade A', qty: 800, unit: 'Kg', value: 480000, location: 'Warehouse C', category: 'yarn', lotNo: 'YL-005' },
  // Beam
  { id: 'st006', name: 'Cotton Beam 60x80', quality: '60x80', qty: 120, unit: 'Beam', value: 600000, location: 'Loom Floor', category: 'beam', lotNo: 'BL-001', pieces: 120 },
  { id: 'st007', name: 'Polyester Beam', quality: 'PV 60x60', qty: 80, unit: 'Beam', value: 320000, location: 'Loom Floor', category: 'beam', lotNo: 'BL-002', pieces: 80 },
  { id: 'st008', name: 'Silk Beam', quality: 'Silk 44x44', qty: 45, unit: 'Beam', value: 450000, location: 'Loom Floor', category: 'beam', lotNo: 'BL-003', pieces: 45 },
  // Non-Issue
  { id: 'st009', name: 'Cotton Gray Fabric', quality: '60x80 Cotton', qty: 8500, unit: 'Meter', value: 1275000, location: 'Gray Store', category: 'nonIssue' },
  { id: 'st010', name: 'Polyester Gray', quality: 'PV 60x60', qty: 4200, unit: 'Meter', value: 588000, location: 'Gray Store', category: 'nonIssue' },
  { id: 'st011', name: 'Undyed Silk', quality: 'Silk Grade B', qty: 1800, unit: 'Meter', value: 900000, location: 'Gray Store', category: 'nonIssue' },
];

// ─── Ledger Entries ───────────────────────────────────────────────────────────

export const mockLedgerEntries: LedgerEntry[] = [
  { id: 'le001', date: '2024-06-01', particulars: 'Opening Balance', debit: 0, credit: 0, balance: 1250000, voucherNo: 'OB-001', narration: 'Opening balance for June 2024' },
  { id: 'le002', date: '2024-06-01', particulars: 'Sales to Shree Ram Textiles', debit: 125000, credit: 0, balance: 1375000, voucherNo: 'SI-2024-101', narration: 'Cotton Fabric 60x80 - 500M' },
  { id: 'le003', date: '2024-06-02', particulars: 'Sales to Bhavani Sarees', debit: 78500, credit: 0, balance: 1453500, voucherNo: 'SI-2024-102', narration: 'Silk Saree Fabric' },
  { id: 'le004', date: '2024-06-03', particulars: 'Purchase from Dhruv Yarn Mills', debit: 0, credit: 280000, balance: 1173500, voucherNo: 'PI-2024-051', narration: 'Cotton Yarn 30s & 40s' },
  { id: 'le005', date: '2024-06-04', particulars: 'Payment Received - Ganesh Weavers', debit: 0, credit: 432000, balance: 741500, voucherNo: 'RCT-001', narration: 'Full payment against outstanding' },
  { id: 'le006', date: '2024-06-05', particulars: 'Sales to Jai Ambe Silk House', debit: 189000, credit: 0, balance: 930500, voucherNo: 'SI-2024-105', narration: 'Silk and polyester blend' },
  { id: 'le007', date: '2024-06-06', particulars: 'GP Charges - Surat Dyeing', debit: 0, credit: 62500, balance: 868000, voucherNo: 'GP-2024-001', narration: 'Dyeing charges lot LOT-001' },
  { id: 'le008', date: '2024-06-07', particulars: 'Sales to Krishnadev Traders', debit: 312000, credit: 0, balance: 1180000, voucherNo: 'SI-2024-106', narration: 'Bulk saree fabric order' },
  { id: 'le009', date: '2024-06-08', particulars: 'Purchase from Hari Om Textiles', debit: 0, credit: 420000, balance: 760000, voucherNo: 'PI-2024-053', narration: 'Gray fabric purchase' },
  { id: 'le010', date: '2024-06-09', particulars: 'Payment to Dhruv Yarn Mills', debit: 0, credit: 280000, balance: 480000, voucherNo: 'PMT-001', narration: 'Against PUR-2024-001' },
  { id: 'le011', date: '2024-06-10', particulars: 'Sales Return from Mahalaxmi', debit: 0, credit: 97500, balance: 382500, voucherNo: 'SR-2024-107', narration: 'Defective goods returned' },
  { id: 'le012', date: '2024-06-11', particulars: 'Sales to Saraswati Cloth Merchants', debit: 43000, credit: 0, balance: 425500, voucherNo: 'SI-2024-108', narration: 'Assorted fabric' },
  { id: 'le013', date: '2024-06-12', particulars: 'Payment Received - Bhavani Sarees', debit: 0, credit: 356500, balance: 69000, voucherNo: 'RCT-002', narration: 'Partial payment' },
  { id: 'le014', date: '2024-06-13', particulars: 'Bank Charges', debit: 0, credit: 1200, balance: 67800, voucherNo: 'BNK-001', narration: 'RTGS charges' },
  { id: 'le015', date: '2024-06-14', particulars: 'Sales to Shree Ram Textiles', debit: 167000, credit: 0, balance: 234800, voucherNo: 'SI-2024-109', narration: 'Cotton fabric 60x80' },
];

// ─── Async Mock Fetchers ──────────────────────────────────────────────────────

export const fetchMockCompanies = (): Promise<Company[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockCompanies), 800));

export const fetchMockSalesOsParties = (): Promise<SalesOsParty[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockSalesOsParties), 600));

export const fetchMockSalesOsInvoices = (partyId: string): Promise<SalesOsInvoice[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(mockSalesOsInvoices.filter((inv) => inv.partyId === partyId)), 500),
  );

export const fetchMockPurchaseOsParties = (): Promise<PurchaseOsParty[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockPurchaseOsParties), 600));

export const fetchMockPurchaseOsInvoices = (partyId: string): Promise<PurchaseOsInvoice[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(mockPurchaseOsInvoices.filter((inv) => inv.partyId === partyId)), 500),
  );

// ─── GP Outstanding Mock Data ─────────────────────────────────────────────────

export const mockGpOsParties: GpOsParty[] = [
  { id: 'gp1', name: 'Shree Textiles Pvt Ltd', address: 'Surat, Gujarat', totalOs: 245000, invoiceCount: 5, daysOverdue: 45, phone: '+919876543210' },
  { id: 'gp2', name: 'Mahavir Fabrics', address: 'Ahmedabad, Gujarat', totalOs: 178500, invoiceCount: 3, daysOverdue: 22, phone: '+919876543211' },
  { id: 'gp3', name: 'Krishna Processing House', address: 'Bhiwandi, Maharashtra', totalOs: 92000, invoiceCount: 2, daysOverdue: 0 },
  { id: 'gp4', name: 'Gujarat Weaving Mills', address: 'Rajkot, Gujarat', totalOs: 356700, invoiceCount: 7, daysOverdue: 60, phone: '+919876543212' },
  { id: 'gp5', name: 'Sai Silk & Fabrics', address: 'Varanasi, UP', totalOs: 67800, invoiceCount: 1, daysOverdue: 10 },
  { id: 'gp6', name: 'Patel Grey Processing', address: 'Navsari, Gujarat', totalOs: 124500, invoiceCount: 4, daysOverdue: 35, phone: '+919876543213' },
];

export const mockGpOsInvoices: Record<string, GpOsInvoice[]> = {
  gp1: [
    { id: 'gp1-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-001', billDate: '15/01/2024', balance: 75000, partyName: 'Shree Textiles Pvt Ltd', partyId: 1, address: 'Surat', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '15/02/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 150, dueDays: 120, amountBeforeGst: 70000 },
    { id: 'gp1-inv2', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-015', billDate: '20/02/2024', balance: 55000, partyName: 'Shree Textiles Pvt Ltd', partyId: 1, address: 'Surat', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '20/03/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 115, dueDays: 85, amountBeforeGst: 51000 },
    { id: 'gp1-inv3', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-028', billDate: '10/03/2024', balance: 45000, partyName: 'Shree Textiles Pvt Ltd', partyId: 1, address: 'Surat', brokerName: 'ABC Broker', brokerId: 2, dueDate: '10/04/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 96, dueDays: 66, amountBeforeGst: 42000 },
    { id: 'gp1-inv4', companyId: 2, companyRef: 'ZI', bookCode: 'GP', billNo: 'GP-2024-042', billDate: '01/04/2024', balance: 38000, partyName: 'Shree Textiles Pvt Ltd', partyId: 1, address: 'Surat', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '01/05/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 75, dueDays: 45, amountBeforeGst: 35000 },
    { id: 'gp1-inv5', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-058', billDate: '15/05/2024', balance: 32000, partyName: 'Shree Textiles Pvt Ltd', partyId: 1, address: 'Surat', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '15/06/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 31, dueDays: 1, amountBeforeGst: 30000 },
  ],
  gp2: [
    { id: 'gp2-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-005', billDate: '05/02/2024', balance: 89000, partyName: 'Mahavir Fabrics', partyId: 2, address: 'Ahmedabad', brokerName: 'PQR Broker', brokerId: 3, dueDate: '05/03/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 130, dueDays: 100, amountBeforeGst: 83000 },
    { id: 'gp2-inv2', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-022', billDate: '25/03/2024', balance: 55500, partyName: 'Mahavir Fabrics', partyId: 2, address: 'Ahmedabad', brokerName: 'PQR Broker', brokerId: 3, dueDate: '25/04/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 82, dueDays: 52, amountBeforeGst: 52000 },
    { id: 'gp2-inv3', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-039', billDate: '18/04/2024', balance: 34000, partyName: 'Mahavir Fabrics', partyId: 2, address: 'Ahmedabad', brokerName: 'ABC Broker', brokerId: 2, dueDate: '18/05/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 58, dueDays: 28, amountBeforeGst: 32000 },
  ],
  gp3: [
    { id: 'gp3-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-050', billDate: '01/05/2024', balance: 52000, partyName: 'Krishna Processing House', partyId: 3, address: 'Bhiwandi', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '01/06/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 15, dueDays: -15, amountBeforeGst: 49000 },
    { id: 'gp3-inv2', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-055', billDate: '10/05/2024', balance: 40000, partyName: 'Krishna Processing House', partyId: 3, address: 'Bhiwandi', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '10/06/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 6, dueDays: -24, amountBeforeGst: 37000 },
  ],
  gp4: [
    { id: 'gp4-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2023-150', billDate: '01/12/2023', balance: 120000, partyName: 'Gujarat Weaving Mills', partyId: 4, address: 'Rajkot', brokerName: 'ABC Broker', brokerId: 2, dueDate: '01/01/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 200, dueDays: 170, amountBeforeGst: 112000 },
    { id: 'gp4-inv2', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-003', billDate: '10/01/2024', balance: 95000, partyName: 'Gujarat Weaving Mills', partyId: 4, address: 'Rajkot', brokerName: 'ABC Broker', brokerId: 2, dueDate: '10/02/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 160, dueDays: 130, amountBeforeGst: 89000 },
    { id: 'gp4-inv3', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-012', billDate: '15/02/2024', balance: 141700, partyName: 'Gujarat Weaving Mills', partyId: 4, address: 'Rajkot', brokerName: 'PQR Broker', brokerId: 3, dueDate: '15/03/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 122, dueDays: 92, amountBeforeGst: 133000 },
  ],
  gp5: [
    { id: 'gp5-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-060', billDate: '20/05/2024', balance: 67800, partyName: 'Sai Silk & Fabrics', partyId: 5, address: 'Varanasi', brokerName: 'XYZ Broker', brokerId: 1, dueDate: '20/06/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 25, dueDays: -5, amountBeforeGst: 63000 },
  ],
  gp6: [
    { id: 'gp6-inv1', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-018', billDate: '28/02/2024', balance: 45000, partyName: 'Patel Grey Processing', partyId: 6, address: 'Navsari', brokerName: 'PQR Broker', brokerId: 3, dueDate: '28/03/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 108, dueDays: 78, amountBeforeGst: 42000 },
    { id: 'gp6-inv2', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-030', billDate: '15/03/2024', balance: 38500, partyName: 'Patel Grey Processing', partyId: 6, address: 'Navsari', brokerName: 'PQR Broker', brokerId: 3, dueDate: '15/04/2024', termDays: 30, finYear: '2023-2024', totalDueDays: 92, dueDays: 62, amountBeforeGst: 36000 },
    { id: 'gp6-inv3', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-045', billDate: '05/04/2024', balance: 21500, partyName: 'Patel Grey Processing', partyId: 6, address: 'Navsari', brokerName: 'ABC Broker', brokerId: 2, dueDate: '05/05/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 71, dueDays: 41, amountBeforeGst: 20000 },
    { id: 'gp6-inv4', companyId: 1, companyRef: 'ZL', bookCode: 'GP', billNo: 'GP-2024-062', billDate: '25/05/2024', balance: 19500, partyName: 'Patel Grey Processing', partyId: 6, address: 'Navsari', brokerName: 'PQR Broker', brokerId: 3, dueDate: '25/06/2024', termDays: 30, finYear: '2024-2025', totalDueDays: 21, dueDays: -9, amountBeforeGst: 18000 },
  ],
};

export const fetchMockGpOsParties = async (): Promise<GpOsParty[]> => {
  await new Promise((r) => setTimeout(r, 800));
  return mockGpOsParties;
};

export const fetchMockGpOsInvoices = async (partyId: string): Promise<GpOsInvoice[]> => {
  await new Promise((r) => setTimeout(r, 600));
  return mockGpOsInvoices[partyId] || [];
};

export const fetchMockSalesRegister = (): Promise<RegisterEntry[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockSalesRegisterEntries), 600));

export const fetchMockPurchaseRegister = (): Promise<RegisterEntry[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockPurchaseRegisterEntries), 600));

export const fetchMockGpRegister = (): Promise<GpRegisterEntry[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockGpRegisterEntries), 600));

// Populate the per-category grid columns (Beam / Yarn / Gray) from base stock.
const enrichStock = (items: StockItem[]): StockItem[] =>
  items.map((s) => {
    if (s.category === 'yarn') {
      return { ...s, crtn: Math.round(s.qty / 50), netWeight: s.qty, cheese: Math.round(s.qty / 1.8) };
    }
    if (s.category === 'beam') {
      const beam = s.pieces ?? s.qty;
      return { ...s, beam, meter: beam * 1200, weight: Math.round(beam * 45) };
    }
    // nonIssue → Gray
    const taka = Math.max(1, Math.round(s.qty / 120));
    const weight = Math.round(s.qty * 0.18);
    return {
      ...s,
      taka,
      meter: s.qty,
      weight,
      avgWt: Math.round((weight / taka) * 100) / 100,
      pallu: Math.round(taka * 1.5),
    };
  });

export const fetchMockStock = (): Promise<StockItem[]> =>
  new Promise((resolve) => setTimeout(() => resolve(enrichStock(mockStockItems)), 600));

export const fetchMockLedger = (): Promise<LedgerEntry[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockLedgerEntries), 600));

export const fetchMockSubUsers = (): Promise<SubUser[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockSubUsers), 600));

export const fetchMockBankAccounts = (): Promise<BankAccount[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockBankAccounts), 500));

export const fetchMockSalesReport = (): Promise<SalesReportPoint[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockSalesReport), 500));

export const fetchMockPartyLedger = (): Promise<PartyLedgerAccount[]> =>
  new Promise((resolve) => setTimeout(() => resolve(mockPartyLedger), 500));
