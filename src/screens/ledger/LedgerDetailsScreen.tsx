import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { GradientHeader } from '../../components/GradientHeader';
import { SearchBar } from '../../components/SearchBar';
import { DateField } from '../../components/DateField';
import { LedgerDateField } from '../../components/LedgerDateField';
import { EmptyState } from '../../components/EmptyState';
import { ZIcon as Icon } from '../../components/ZIcon';
import { ledgerApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { useSyncStore } from '../../store/syncStore';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYYYY } from '../../utils/formatDate';
import { generateLedgerPdf } from '../../utils/ledgerPdfGenerator';
import { processOpeningBalance, formatLedgerBalance } from '../../utils/ledgerUtils';
import { QuickDateRange, getDefaultLedgerDates, calculateFromDateForRange } from '../../utils/dateRange';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, NormalizedLedgerTransaction } from '../../types';

type LedgerDetailsRouteProp = RouteProp<AppStackParamList, 'LedgerDetails'>;

/**
 * Non-destructive cleaner for backend vv_trans_details string.
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

export const LedgerDetailsScreen: React.FC = () => {
  const route = useRoute<LedgerDetailsRouteProp>();
  const { accountId, title, is_bankcash } = route.params;
  
  const { selectedCompany } = useCompanyStore();
  const lastSynced = useSyncStore((s) => s.lastSynced);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Default dates: Week range (From: Current date - 7 days, To: Current date)
  const defaultDates = useMemo(() => getDefaultLedgerDates(), []);
  const [selectedRange, setSelectedRange] = useState<QuickDateRange>(defaultDates.selectedRange);
  const [fromDate, setFromDate] = useState(defaultDates.fromDate);
  const [toDate, setToDate] = useState(defaultDates.toDate);
  const [isCommonCompany, setIsCommonCompany] = useState(false);

  const handleToDateChange = (newToDate: string) => {
    setToDate(newToDate);
    if (selectedRange !== 'custom') {
      setFromDate(calculateFromDateForRange(selectedRange, newToDate));
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch API
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    ledgerApi.getLedgerDetails(accountId, {
      is_bankcash,
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
  }, [accountId, is_bankcash, isCommonCompany, selectedCompany?.id, fromDate, toDate]);

  // Process opening balance and normalize trade transactions for Ledger
  const { effectiveOpeningBalance, normalizedData } = useMemo(() => {
    const { effectiveOpeningBalance: effOb, genuineTransactions } = processOpeningBalance(data, openingBalance);

    let running = effOb;
    const normalized = genuineTransactions.map((item, index) => {
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
      
      // Clean transaction details
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

    return {
      effectiveOpeningBalance: effOb,
      normalizedData: normalized,
    };
  }, [data, openingBalance]);

  // Filter normalized data using debounced search
  const filteredData = useMemo(() => {
    const lowerSearch = debouncedSearch.trim().toLowerCase();
    if (!lowerSearch) return normalizedData;
    return normalizedData.filter((item) => item.searchKey.includes(lowerSearch));
  }, [normalizedData, debouncedSearch]);

  const closingBalance = normalizedData.length > 0 
    ? normalizedData[normalizedData.length - 1].runningBalance 
    : effectiveOpeningBalance;

  const handleGeneratePdf = () => {
    generateLedgerPdf({
      partyName: title,
      companyName: selectedCompany?.name || '',
      address: selectedCompany?.city || '',
      gstNo: selectedCompany?.gstinNo || '',
      fromDate,
      toDate,
      openingBalance: effectiveOpeningBalance,
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
    const obFormatted = formatLedgerBalance(effectiveOpeningBalance);
    return (
      <View style={styles.listHeaderRow}>
        <View style={styles.listHeaderTop}>
          <Text style={styles.listHeaderParty}>Party Name</Text>
          <Text style={styles.listHeaderDrCr}>DR/CR</Text>
        </View>
        <View style={styles.openingBalanceRow}>
          <Text style={styles.openingBalanceLabel}>Opening Balance</Text>
          <Text style={[styles.openingBalanceValue, obFormatted.isZero ? styles.textZero : obFormatted.isDr ? styles.textDr : styles.textCr]}>
            {obFormatted.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: NormalizedLedgerTransaction }) => {
    const balFormatted = formatLedgerBalance(item.runningBalance);
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
          <Text
            style={[
              styles.itemBalance,
              balFormatted.isZero
                ? styles.textZero
                : balFormatted.isDr
                ? styles.textDr
                : styles.textCr,
            ]}
          >
            {balFormatted.text}
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
            <LedgerDateField
              value={fromDate}
              toDate={toDate}
              selectedRange={selectedRange}
              onSelectRange={(range, newFrom) => {
                setSelectedRange(range);
                setFromDate(newFrom);
              }}
              onCustomDateChange={(newFrom) => {
                setSelectedRange('custom');
                setFromDate(newFrom);
              }}
              placeholder="From Date"
            />
          </View>
          <View style={styles.dateLabelWrapper}><Text style={styles.dateLabel}> To :</Text></View>
          <View style={styles.dateItem}>
            <DateField value={toDate} onChange={handleToDateChange} placeholder="To Date" />
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
      ) : filteredData.length === 0 && effectiveOpeningBalance === 0 ? (
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
