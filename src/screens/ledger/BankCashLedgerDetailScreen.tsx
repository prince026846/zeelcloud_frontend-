import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { GradientHeader } from '../../components/GradientHeader';
import { SearchBar } from '../../components/SearchBar';
import { DateField } from '../../components/DateField';
import { EmptyState } from '../../components/EmptyState';
import { ZIcon as Icon } from '../../components/ZIcon';
import { ledgerApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { useSyncStore } from '../../store/syncStore';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYYYY } from '../../utils/formatDate';
import { generateLedgerPdf } from '../../utils/ledgerPdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, NormalizedLedgerTransaction } from '../../types';

type BankCashLedgerDetailRouteProp = RouteProp<AppStackParamList, 'BankCashLedgerDetail'>;

/**
 * Non-destructive cleaner for backend vv_trans_details in bank/cash transactions.
 * Strips empty label prefixes like "Memo No : ," while preserving real values.
 */
const cleanTransDetails = (raw?: string | null): string => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  // 1. Remove empty labels followed by comma or end of string, e.g. "Memo No : ," or "Chq. No : ,"
  str = str.replace(/(?:Memo|Chq|Bank|Desc)\s*No?\s*:\s*(?=,|$)/gi, '');

  // 2. Clean up multiple commas and extra spaces around commas
  str = str.replace(/\s*,\s*,+/g, ', ');
  str = str.replace(/^\s*,\s*/g, '');
  str = str.replace(/\s*,\s*$/g, '');
  str = str.trim();

  // 3. Normalize multiple spaces
  str = str.replace(/\s{2,}/g, ' ');

  return str;
};

/**
 * Format balance with Dr / Cr indicator.
 * Displays "₹0.00" without Dr/Cr when balance is 0.
 */
const formatLedgerBalance = (balance: number): { text: string; isZero: boolean; isDr: boolean } => {
  if (Math.abs(balance) < 0.005) {
    return { text: formatCurrency(0), isZero: true, isDr: true };
  }
  const isDr = balance > 0;
  return {
    text: `${formatCurrency(Math.abs(balance))} ${isDr ? 'Dr' : 'Cr'}`,
    isZero: false,
    isDr,
  };
};

export const BankCashLedgerDetailScreen: React.FC = () => {
  const route = useRoute<BankCashLedgerDetailRouteProp>();
  const { accountId, title } = route.params;
  
  const { selectedCompany } = useCompanyStore();
  const lastSynced = useSyncStore((s) => s.lastSynced);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Default dates using local date to prevent timezone backward shift
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [isCommonCompany, setIsCommonCompany] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch API for Bank/Cash Ledger (is_bankcash: '1')
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    ledgerApi.getLedgerDetails(accountId, {
      is_bankcash: '1',
      company: isCommonCompany ? undefined : selectedCompany?.id ? Number(selectedCompany.id) : undefined,
      from_date: fromDate,
      to_date: toDate,
    })
      .then((res) => {
        if (mounted) {
          setData(res.data);
          setOpeningBalance(res.openingBalance);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    return () => { mounted = false; };
  }, [accountId, isCommonCompany, selectedCompany?.id, fromDate, toDate]);

  // Normalize API data once, computing running balance from opening balance
  const normalizedData = useMemo<NormalizedLedgerTransaction[]>(() => {
    let running = openingBalance;
    return data.map((item, index) => {
      const dr = typeof item.vn_debit_amt === 'number' ? item.vn_debit_amt : 0;
      const cr = typeof item.vn_credit_amt === 'number' ? item.vn_credit_amt : 0;
      const isDr = dr > 0;
      const amount = isDr ? dr : cr;
      
      // Running balance formula: previous + debit - credit
      running = running + (dr - cr);

      const displayDate = item.vd_date ? toDDMMYYYY(String(item.vd_date)) : '';
      const voucherType = item.vv_type ? String(item.vv_type).trim() : '—';
      const voucherNo = String(item.vn_vch_no ?? item.vn_no ?? '').trim();
      const particulars = String(item.vv_perticular || item.vv_details || item.vv_party_name || '—').trim();
      
      // Clean transaction details (cheque, memo, bank, desc)
      const rawDetails = item.vv_trans_details || (item.vv_details && item.vv_details !== particulars ? item.vv_details : '') || '';
      const transDetails = cleanTransDetails(rawDetails);

      const searchKey = `${voucherType} ${displayDate} ${voucherNo} ${particulars} ${transDetails} ${amount} ${dr} ${cr}`.toLowerCase();

      return {
        id: String(item.vn_transaction_id ?? item.id ?? index.toString()),
        date: String(item.vd_date || ''),
        displayDate,
        voucherType,
        voucherNo,
        particulars,
        debit: dr,
        credit: cr,
        isDebit: isDr,
        amount,
        runningBalance: running,
        transDetails,
        hasTransDetails: transDetails.length > 0,
        rawBalance: typeof item.vn_balance === 'number' ? item.vn_balance : undefined,
        searchKey,
      };
    });
  }, [data, openingBalance]);

  // Filter normalized data using debounced search
  const filteredData = useMemo(() => {
    const lowerSearch = debouncedSearch.trim().toLowerCase();
    if (!lowerSearch) return normalizedData;
    return normalizedData.filter((item) => item.searchKey.includes(lowerSearch));
  }, [normalizedData, debouncedSearch]);

  const closingBalance = normalizedData.length > 0 
    ? normalizedData[normalizedData.length - 1].runningBalance 
    : openingBalance;

  const handleGeneratePdf = () => {
    generateLedgerPdf({
      partyName: title,
      companyName: selectedCompany?.name || '',
      fromDate,
      toDate,
      openingBalance,
      closingBalance,
      transactions: filteredData.map((t) => ({
        date: t.date,
        voucherNo: t.voucherNo,
        vchNo: t.voucherNo,
        particulars: t.particulars,
        narration: t.transDetails,
        debit: t.debit,
        credit: t.credit,
        runningBalance: t.runningBalance,
      })),
    });
  };

  const renderHeader = () => {
    const obFormatted = formatLedgerBalance(openingBalance);
    const obDate = fromDate ? toDDMMYYYY(fromDate) : normalizedData[0]?.displayDate || '';
    return (
      <View style={styles.listHeaderRow}>
        <View style={styles.listHeaderTop}>
          <Text style={styles.listHeaderParty}>Account Name</Text>
          <Text style={styles.listHeaderDrCr}>DR/CR</Text>
        </View>
        <View style={styles.openingBalanceRow}>
          <Text style={styles.openingBalanceLabel}>Opening Balance</Text>
          <Text style={[styles.openingBalanceValue, obFormatted.isZero ? styles.textZero : obFormatted.isDr ? styles.textDr : styles.textCr]}>
            {obFormatted.text}
          </Text>
        </View>
        <View style={styles.openingTransactionRow}>
          <View style={styles.itemRowTop}>
            <View style={styles.leftMetaContainer}>
              <Text style={styles.itemDate}>{obDate}</Text>
            </View>
            <Text style={[styles.itemAmount, obFormatted.isZero ? styles.textZero : obFormatted.isDr ? styles.textDr : styles.textCr]}>
              {obFormatted.text}
            </Text>
          </View>
          <View style={styles.itemRowBottom}>
            <Text style={styles.openingItemParticulars}>OPENING BALANCE</Text>
            <Text style={styles.itemBalance}>
              {formatCurrency(Math.abs(openingBalance))}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: NormalizedLedgerTransaction }) => {
    return (
      <View style={styles.listItem}>
        {/* LINE 1: [Voucher Type]  [Date]  [Voucher No in Red]    [Amount Dr/Cr] */}
        <View style={styles.itemRowTop}>
          <View style={styles.leftMetaContainer}>
            <Text style={styles.itemVchType}>{item.voucherType}</Text>
            <Text style={styles.itemDate}>{item.displayDate}</Text>
            {item.voucherNo ? (
              <Text style={styles.itemVchNo}>{item.voucherNo}</Text>
            ) : null}
          </View>
          <Text style={[styles.itemAmount, item.isDebit ? styles.textDr : styles.textCr]}>
            {formatCurrency(item.amount)} {item.isDebit ? 'Dr' : 'Cr'}
          </Text>
        </View>

        {/* LINE 2: [Particular / Account Name]                 [Running Balance] */}
        <View style={styles.itemRowBottom}>
          <Text style={styles.itemParticulars} numberOfLines={2}>
            {item.particulars}
          </Text>
          <Text style={styles.itemBalance}>
            {formatCurrency(Math.abs(item.runningBalance))}
          </Text>
        </View>

        {/* LINE 3: [Transaction Details] (Conditional) */}
        {item.hasTransDetails ? (
          <View style={styles.itemRowDetails}>
            <Text style={styles.itemTransDetails} numberOfLines={3}>
              {item.transDetails}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const cbFormatted = formatLedgerBalance(closingBalance);
  const headerSubtitle = selectedCompany?.name
    ? `${selectedCompany.name}${lastSynced ? ` • Last Synced: ${lastSynced}` : ''}`
    : lastSynced
    ? `Last Synced: ${lastSynced}`
    : undefined;

  return (
    <View style={styles.container}>
      <GradientHeader title={title} subtitle={headerSubtitle} />
      
      <View style={styles.filterSection}>
        <View style={styles.dateRow}>
          <View style={styles.dateLabelWrapper}><Text style={styles.dateLabel}>From :</Text></View>
          <View style={styles.dateItem}>
            <DateField value={fromDate} onChange={setFromDate} placeholder="From Date" />
          </View>
          <View style={styles.dateLabelWrapper}><Text style={styles.dateLabel}> To :</Text></View>
          <View style={styles.dateItem}>
            <DateField value={toDate} onChange={setToDate} placeholder="To Date" />
          </View>
        </View>
        
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search Account, Date, Amount, Chq.N..." />
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={handleGeneratePdf} activeOpacity={0.7}>
            <Icon name="whatsapp" size={24} color={Colors.success} />
          </TouchableOpacity>
        </View>

        <View style={styles.commonRow}>
          <Text style={styles.toggleLabel}>Common Company</Text>
          <Switch
            value={isCommonCompany}
            onValueChange={setIsCommonCompany}
            trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
            thumbColor={isCommonCompany ? Colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredData.length === 0 && openingBalance === 0 ? (
        <EmptyState icon="file-document-outline" title="No Transactions" subtitle="No ledger entries found for this period." />
      ) : (
        <>
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            removeClippedSubviews={true}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <View style={styles.stickyFooter}>
            <Text style={styles.footerLabel}>Closing Balance</Text>
            <Text style={[styles.footerValue, cbFormatted.isZero ? styles.textZero : cbFormatted.isDr ? styles.textDr : styles.textCr]}>
              {cbFormatted.text}
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterSection: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
    zIndex: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateLabelWrapper: {
    marginRight: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateItem: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  listHeaderRow: {
    backgroundColor: Colors.surface,
  },
  listHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryWash,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listHeaderParty: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  listHeaderDrCr: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  openingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  openingBalanceLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  openingBalanceValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: 'bold',
  },
  openingTransactionRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  openingItemParticulars: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingRight: Spacing.sm,
  },
  listItem: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  itemRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  leftMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  itemVchType: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  itemVchNo: {
    fontSize: Typography.fontSizes.sm,
    color: '#E05656',
    fontWeight: '700',
  },
  itemAmount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: '700',
  },
  itemRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemParticulars: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    marginRight: Spacing.sm,
  },
  itemBalance: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemRowDetails: {
    marginTop: 4,
    paddingTop: 2,
  },
  itemTransDetails: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  stickyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.sm,
  },
  footerLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  footerValue: {
    fontSize: Typography.fontSizes.md,
    fontWeight: 'bold',
  },
  textDr: {
    color: Colors.success,
  },
  textCr: {
    color: Colors.danger,
  },
  textZero: {
    color: Colors.textPrimary,
  },
});
