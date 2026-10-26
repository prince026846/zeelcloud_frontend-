import { Switch } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { CompanyStrip } from '../../components/CompanyStrip';
import { GridTable, GridTableHeader, GridColumn, GridText } from '../../components/GridTable';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { InlineInterestCalculator, useInlineInterest } from '../../components/InlineInterestCalculator';
import { salesOsApi } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { SalesOsStackParamList, SalesOsParty, SalesOsInvoice } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYY } from '../../utils/formatDate';
import { generateOutstandingReportPDF } from '../../utils/pdfGenerator';
import { useCompanyStore } from '../../store/companyStore';
import { layoutSalesOsBillColumns, salesOsTermHeader } from './salesOsBillLayout';

// This grid is sized in fixed pixels so every default column fits a 360dp phone.
// Uncapped Android font scaling widens the 10/11px text until headers break
// mid-word and amounts clip. The cap is only on this table; the summary, toggles,
// and buttons above it still follow the system font size.
const PARTY_GRID_FONT_CAP = 1;
const partyGridMetrics = {
  cellPaddingHorizontal: 2,
  maxFontSizeMultiplier: PARTY_GRID_FONT_CAP,
  constrainText: true,
} as const;

function PartyGridText(props: React.ComponentProps<typeof GridText>) {
  return <GridText {...props} fitWidth maxFontSizeMultiplier={PARTY_GRID_FONT_CAP} />;
}

function GridHScroll({
  enabled,
  width,
  viewportWidth,
  scrollRef,
  onScroll,
  showIndicator = false,
  pointerEvents,
  children,
}: {
  enabled: boolean;
  width: number;
  viewportWidth: number;
  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showIndicator?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  children: React.ReactNode;
}) {
  if (!enabled) return <View style={{ width: '100%' }}>{children}</View>;
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      bounces={false}
      overScrollMode="never"
      pointerEvents={pointerEvents}
      showsHorizontalScrollIndicator={showIndicator}
      scrollEventThrottle={16}
      onScroll={onScroll}
      style={{ width: viewportWidth }}
    >
      <View style={{ width }}>{children}</View>
    </ScrollView>
  );
}

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsPartyDetail'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsPartyDetail'>;
};


export const SalesOsPartyDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { partyId, partyName, filter } = route.params;
  const { selectedCompany, companies } = useCompanyStore();
  const currentCompany = filter?.companyId
    ? (companies.find((c) => String(c.recordId || c.id) === String(filter.companyId)) || selectedCompany)
    : selectedCompany;
  const [party, setParty] = useState<SalesOsParty | undefined>(undefined);
  const [invoices, setInvoices] = useState<SalesOsInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyDue, setOnlyDue] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const interestCalc = useInlineInterest();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { width: windowWidth } = useWindowDimensions();
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      salesOsApi.getPartyById(partyId, filter),
      salesOsApi.getPartyInvoices(partyId, filter),
    ])
      .then(([partyData, invoiceData]) => {
        setParty(partyData ?? {
          id: partyId,
          name: partyName,
          city: '',
          totalOs: invoiceData.reduce((sum, inv) => sum + inv.outstanding, 0),
          invoiceCount: invoiceData.length,
          daysOverdue: 0,
          lastPayment: '',
        });
        setInvoices(invoiceData);
      })
      .finally(() => setLoading(false));
  }, [partyId, partyName, filter]);

  // "Only Due" (passed from the summary list) → show only overdue invoices.
  const visibleInvoices = filter.onlyDue ? invoices.filter((i) => i.daysLeft < 0) : invoices;

  const toggleBill = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () =>
    setSelectedIds((prev) => (prev.length === visibleInvoices.length ? [] : visibleInvoices.map((i) => i.id)));

  const selectedInvoices = visibleInvoices.filter((i) => selectedIds.includes(i.id));
  const selectedTotal = selectedInvoices.reduce((sum, i) => sum + i.outstanding, 0);



  // OG summary: broker comes from the party's bills (vv_brocker_name).
  const brokerName = invoices.find((i) => i.brokerName)?.brokerName;

  // Common Company ON aggregates bills across companies (company=0). The short
  // code already mapped from vv_cmp is only useful in that combined grid.
  const showCompanyRef = filter?.commonCompany === true;

  // Same columns as the OG .NET grid: checkbox, optional company code, book,
  // bill number, date, term, total due, due days, amount, optional interest.
  // Widths are absolute so a long bill number cannot steal space from Amount.
  const billLayout = useMemo(
    () => layoutSalesOsBillColumns({
      windowWidth,
      showCompanyRef,
      showInterest,
      interestOnBasic: interestCalc.interestBase === 'basic',
    }),
    [windowWidth, showCompanyRef, showInterest, interestCalc.interestBase],
  );
  const colWidth = (key: string) => billLayout.widths[key];

  const billColumns: GridColumn<SalesOsInvoice>[] = [
    {
      key: 'sel', label: '', width: colWidth('sel'),
      render: (inv) => (
        <Icon
          name={selectedIds.includes(inv.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={17}
          color={selectedIds.includes(inv.id) ? Colors.gradientStart : Colors.gray400}
        />
      ),
    },
    ...(showCompanyRef
      ? [{
          key: 'companyRef',
          label: 'Cmp',
          width: colWidth('companyRef'),
          numberOfLines: 1,
          headerNumberOfLines: 1,
          render: (inv) => <PartyGridText numberOfLines={1}>{inv.companyRef || ''}</PartyGridText>,
        } satisfies GridColumn<SalesOsInvoice>]
      : []),
    { key: 'bookCode', label: 'Book', width: colWidth('bookCode'), align: 'left' },
    {
      key: 'number',
      label: 'Bill No',
      width: colWidth('number'),
      align: 'left',
      render: (inv) => <PartyGridText align="left" bold numberOfLines={2}>{inv.number}</PartyGridText>,
    },
    {
      key: 'date',
      label: 'Date',
      width: colWidth('date'),
      render: (inv) => (
        <PartyGridText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
          {toDDMMYY(inv.date)}
        </PartyGridText>
      ),
    },
    {
      key: 'termDays',
      label: salesOsTermHeader(colWidth('termDays')),
      width: colWidth('termDays'),
      headerNumberOfLines: 1,
      align: 'right',
      render: (inv) => <PartyGridText align="right" numberOfLines={1}>{String(inv.termDays ?? 0)}</PartyGridText>,
    },
    {
      key: 'totalDueDays',
      label: 'Total Due',
      width: colWidth('totalDueDays'),
      render: (inv) => <PartyGridText numberOfLines={1}>{String(inv.totalDueDays ?? 0)}</PartyGridText>,
    },
    {
      key: 'dueDays',
      label: 'Due Days',
      width: colWidth('dueDays'),
      render: (inv) => (
        <PartyGridText bold numberOfLines={1} color={-inv.daysLeft > 0 ? Colors.danger : Colors.success}>
          {String(-inv.daysLeft)}
        </PartyGridText>
      ),
    },
    {
      key: 'outstanding',
      label: 'Amount',
      width: colWidth('outstanding'),
      render: (inv) => (
        <PartyGridText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {`₹${inv.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
        </PartyGridText>
      ),
    },
    ...(showInterest ? [{
      key: 'interest',
      label: interestCalc.interestBase === 'basic' ? 'Int (Basic)' : 'Interest',
      width: colWidth('interest'),
      render: (inv: SalesOsInvoice) => (
        <PartyGridText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {`₹ ${interestCalc.calculateBillInterest(inv).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`}
        </PartyGridText>
      ),
    }] : [])
  ];

  useEffect(() => {
    scrollX.current = 0;
    headerScrollRef.current?.scrollTo({ x: 0, animated: false });
    bodyScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [billLayout.tableWidth, billLayout.scrolls]);

  const onBodyGridScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    if (Math.abs(x - scrollX.current) < 0.5) return;
    scrollX.current = x;
    headerScrollRef.current?.scrollTo({ x, animated: false });
  };

  const handleShare = async () => {
    if (!party) return;
    const billsToPrint = selectedIds.length > 0 ? selectedInvoices : visibleInvoices;
    const billAmountTotal = interestCalc.calculateSelectedBillAmount(billsToPrint);
    const intAmountTotal = Math.round(interestCalc.calculateTotalInterest(billsToPrint));
    const gst = intAmountTotal * 0.05;
    const tds = Math.round(intAmountTotal * 0.10);
    const netInterest = intAmountTotal + gst - tds;
    const totalSelectedOs = billAmountTotal + netInterest;

    await generateOutstandingReportPDF({
      title: 'Party Wise Sales Outstanding Report',
      reportType: 'sales_os',
      companyName: currentCompany?.name || '',
      companyAddress: currentCompany?.city || '',
      partyName: party.name,
      partyAddress: party.city || '',
      partyBroker: brokerName || 'DIRECT',
      periodFrom: filter?.fromDate,
      periodTo: filter?.toDate,
      date: new Date().toISOString(),
      invoices: billsToPrint,
      showCompanyCode: showCompanyRef,
      showInterest,
      interestBase: interestCalc.interestBase,
      totals: {
        totalOs: party.totalOs,
        selectedBillAmount: billAmountTotal,
        interestAmount: intAmountTotal,
        gst,
        tds,
        netInterest,
        totalSelectedOs
      },
      calculateInterest: showInterest ? interestCalc.calculateBillInterest : undefined
    });
  };

  if (loading || !party) return <LoadingOverlay visible message="Loading..." />;

  return (
    <View style={styles.container}>
      <GradientHeader title="Sales O/s (Party Wise)"
        subtitle={party.city}
        wrapSubtitle
        onBack={() => navigation.goBack()}
        rightElement={null}
      />

      <CompanyStrip />

      {/* Fixed summary — does not scroll with bills */}
      <View style={styles.ogSummary}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryCopy}>
            <Text style={styles.ogParty} numberOfLines={1}>{party.name}</Text>
            <Text style={styles.ogAddress}>
              {party.city ? `${party.city} | ` : ''}Broker: {brokerName || 'DIRECT'}
            </Text>
            {filter?.fromDate || filter?.toDate ? (
              <Text style={styles.ogLine}>
                From {toDDMMYY(filter.fromDate)} To {toDDMMYY(filter.toDate)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.8}
            style={styles.waIcon}
          >
            <Icon name="file-pdf-box" size={24} color={Colors.pdf} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ogTotal}>Total O/s: {formatCurrency(party.totalOs)}</Text>
            <Text style={styles.ogSub}>{party.invoiceCount} bills</Text>
          </View>
          <View style={styles.compactToggles}>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Due</Text>
              <Switch
                value={onlyDue}
                onValueChange={setOnlyDue}
                trackColor={{ false: Colors.gray300, true: Colors.gradientEnd }}
                thumbColor={Colors.surface}
                ios_backgroundColor={Colors.gray300}
                style={styles.switch}
              />
            </View>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Interest</Text>
              <Switch
                value={showInterest}
                onValueChange={setShowInterest}
                trackColor={{ false: Colors.gray300, true: Colors.gradientEnd }}
                thumbColor={Colors.surface}
                ios_backgroundColor={Colors.gray300}
                style={styles.switch}
              />
            </View>
          </View>
        </View>
        {selectedInvoices.length > 0 ? (
          <View style={styles.selectedSummaryBlock}>
            <Text style={styles.ogSub}>{selectedInvoices.length} bills selected</Text>
            <View style={styles.selectedSummaryRow}>
              <Text style={styles.selectedLabel}>Selected Bill Total</Text>
              <View style={styles.selectedValueWrap}>
                <Text
                  style={styles.selectedValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {formatCurrency(selectedTotal)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.invoicesToolbar}>
        <View style={[styles.invoicesHeader, styles.sectionPad]}>
          <Text style={styles.cardTitle}>
            {filter?.onlyDue ? 'Due Invoices' : 'Pending Invoices'} ({visibleInvoices.length})
          </Text>
          {visibleInvoices.length > 0 ? (
            <TouchableOpacity style={styles.selectAll} onPress={toggleSelectAll} activeOpacity={0.7}>
              <Icon
                name={selectedIds.length === visibleInvoices.length ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={18}
                color={Colors.gradientStart}
              />
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {showInterest && selectedInvoices.length > 0 && (
          <View style={styles.sectionPad}>
            <InlineInterestCalculator
              {...interestCalc}
              selectedBillAmount={interestCalc.calculateSelectedBillAmount(selectedInvoices)}
              totalInterest={interestCalc.calculateTotalInterest(selectedInvoices)}
            />
          </View>
        )}
        <GridHScroll
          enabled={billLayout.scrolls}
          width={billLayout.tableWidth}
          viewportWidth={windowWidth}
          scrollRef={headerScrollRef}
          pointerEvents="none"
        >
          <GridTableHeader columns={billColumns} {...partyGridMetrics} />
        </GridHScroll>
      </View>

      <ScrollView
        style={styles.billScroll}
        contentContainerStyle={styles.billScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <GridHScroll
          enabled={billLayout.scrolls}
          width={billLayout.tableWidth}
          viewportWidth={windowWidth}
          scrollRef={bodyScrollRef}
          showIndicator
          onScroll={onBodyGridScroll}
        >
          <GridTable
            columns={billColumns}
            data={visibleInvoices}
            keyExtractor={(inv, idx) => `${inv.id}-${idx}`}
            onRowPress={(inv) => toggleBill(inv.id)}
            rowStyle={(inv) => (selectedIds.includes(inv.id) ? styles.rowSelected : undefined)}
            emptyText="No pending invoices"
            hideHeader
            {...partyGridMetrics}
          />
        </GridHScroll>

        <View style={[styles.actions, styles.sectionPad]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => Linking.openURL(`whatsapp://send?phone=91${party.name}`)}
            activeOpacity={0.85}
          >
            <Icon name="phone" size={20} color={Colors.textWhite} />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.shareActionBtn]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Icon name="share-variant" size={20} color={Colors.gradientStart} />
            <Text style={[styles.actionBtnText, { color: Colors.gradientStart }]}>Share Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LoadingOverlay visible={loading} message="Loading invoices..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 0,
  },
  ogSummary: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryCopy: { flex: 1, flexShrink: 1, minWidth: 0, paddingRight: Spacing.sm },
  summaryBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ogParty: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  ogAddress: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginBottom: 2 },
  waIcon: { padding: 4 },
  ogLine: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary, marginTop: 2 },
  ogTotal: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
  ogSub: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  compactToggles: { flexDirection: 'row', gap: Spacing.md, marginLeft: Spacing.sm },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  switch: { transform: [{ scaleX: 0.70 }, { scaleY: 0.70 }] },
  invoicesToolbar: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.sm,
  },
  sectionPad: { paddingHorizontal: Spacing.md },
  rowSelected: { backgroundColor: Colors.purple100 },
  invoicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectAllText: { fontSize: Typography.fontSizes.xs, color: Colors.gradientStart, fontWeight: Typography.fontWeights.semiBold },
  selectedSummaryBlock: { width: '100%', marginTop: 6 },
  selectedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 2,
    gap: 8,
  },
  selectedLabel: {
    flex: 1.15,
    minWidth: 0,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  selectedValueWrap: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  selectedValue: {
    width: '100%',
    textAlign: 'right',
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.gradientStart,
  },
  billScroll: { flex: 1, backgroundColor: Colors.surface },
  billScrollContent: { paddingBottom: Spacing.xl },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  callBtn: {
    backgroundColor: Colors.call,
  },
  shareActionBtn: {
    backgroundColor: Colors.purple100,
    borderWidth: 1.5,
    borderColor: Colors.gradientStart,
  },
  actionBtnText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textWhite,
  },
});
