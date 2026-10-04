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
import { formatCurrency } from '../../utils/currency';
import { toDDMMYYYY } from '../../utils/formatDate';
import { generateLedgerPdf } from '../../utils/ledgerPdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, LedgerEntry } from '../../types';

type LedgerDetailsRouteProp = RouteProp<AppStackParamList, 'LedgerDetails'>;

export const LedgerDetailsScreen: React.FC = () => {
  const route = useRoute<LedgerDetailsRouteProp>();
  const { accountId, title, is_bankcash } = route.params;
  
  const { selectedCompany } = useCompanyStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Default dates: First day of current month to today
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isCommonCompany, setIsCommonCompany] = useState(false);

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

  // Process data for running balance and search
  const processedData = useMemo(() => {
    let running = openingBalance;
    const processed = data.map((item) => {
      // Logic from API viewset: vn_debit_amt, vn_credit_amt
      const dr = typeof item.vn_debit_amt === 'number' ? item.vn_debit_amt : 0;
      const cr = typeof item.vn_credit_amt === 'number' ? item.vn_credit_amt : 0;
      
      // Update running balance: standard accounting (Dr is positive for party/bank, Cr is negative. Adjust if needed)
      running = running + (dr - cr);
      
      return {
        ...item,
        id: String(item.vn_transaction_id),
        date: String(item.vd_date),
        particulars: String(item.vv_narration || ''),
        debit: dr,
        credit: cr,
        voucherNo: item.vv_voucher_no,
        runningBalance: running,
      };
    });

    const lowerSearch = debouncedSearch.toLowerCase();
    if (!lowerSearch) return processed;
    
    return processed.filter((p) => 
      p.particulars.toLowerCase().includes(lowerSearch) ||
      (p.voucherNo && p.voucherNo.toLowerCase().includes(lowerSearch))
    );
  }, [data, openingBalance, debouncedSearch]);

  const closingBalance = processedData.length > 0 
    ? processedData[processedData.length - 1].runningBalance 
    : openingBalance;

  const handleGeneratePdf = () => {
    generateLedgerPdf({
      partyName: title,
      companyName: selectedCompany?.name || '',
      fromDate,
      toDate,
      openingBalance,
      closingBalance,
      transactions: processedData,
    });
  };

  const renderHeader = () => (
    <View style={styles.listHeaderRow}>
      <View style={styles.listHeaderTop}>
        <Text style={styles.listHeaderParty}>Party Name</Text>
        <Text style={styles.listHeaderDrCr}>DR/CR</Text>
      </View>
      <View style={styles.openingBalanceRow}>
        <Text style={styles.openingBalanceLabel}>Opening Balance</Text>
        <Text style={[styles.openingBalanceValue, openingBalance >= 0 ? styles.textDr : styles.textCr]}>
          {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}
        </Text>
      </View>
      {processedData.length > 0 && (
        <View style={styles.openingTransactionRow}>
          <Text style={styles.itemDate}>{toDDMMYYYY(processedData[0]?.date)}</Text>
          <Text style={styles.openingItemParticulars}>OPENING BALANCE</Text>
          <Text style={styles.openingItemAmount}>{formatCurrency(Math.abs(openingBalance))}</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isDr = item.debit > 0;
    const amount = isDr ? item.debit : item.credit;
    return (
      <View style={styles.listItem}>
        <View style={styles.itemRowTop}>
          <Text style={styles.itemVch}>{item.voucherNo}</Text>
          <Text style={styles.itemDate}>{toDDMMYYYY(item.date)}</Text>
          <Text style={styles.itemBill}>{/* Assume bill no could be parsed, let's put Vch again or leave blank for now */}</Text>
          <Text style={[styles.itemAmount, isDr ? styles.textDr : styles.textCr]}>
            {formatCurrency(amount)} {isDr ? 'Dr' : 'Cr'}
          </Text>
        </View>
        <View style={styles.itemRowBottom}>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.particulars}</Text>
          <Text style={styles.itemBalance}>
            {formatCurrency(Math.abs(item.runningBalance))}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader title={title} subtitle={selectedCompany?.name} />
      
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
      ) : processedData.length === 0 && openingBalance === 0 ? (
        <EmptyState icon="file-document-outline" title="No Transactions" subtitle="No ledger entries found for this period." />
      ) : (
        <>
          <FlatList
            data={processedData}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <View style={styles.stickyFooter}>
            <Text style={styles.footerLabel}>Closing Balance</Text>
            <Text style={[styles.footerValue, closingBalance >= 0 ? styles.textDr : styles.textCr]}>
              {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  openingItemParticulars: {
    flex: 1,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.sm,
  },
  openingItemAmount: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  listItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  itemRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemVch: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginRight: Spacing.sm,
  },
  itemDate: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  itemBill: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.danger,
    flex: 1,
  },
  itemAmount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: '600',
  },
  itemDesc: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
    fontStyle: 'italic',
  },
  itemBalance: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
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
});
