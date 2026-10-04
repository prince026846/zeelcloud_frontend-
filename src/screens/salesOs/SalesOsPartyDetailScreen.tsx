import { Switch } from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
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

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsPartyDetail'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsPartyDetail'>;
};


export const SalesOsPartyDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { partyId, partyName, filter } = route.params;
  const [party, setParty] = useState<SalesOsParty | undefined>(undefined);
  const [invoices, setInvoices] = useState<SalesOsInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyDue, setOnlyDue] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const interestCalc = useInlineInterest();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // OG .NET grid (SalesOsPartyDetailPage): ✓ | Ref Cmp | Book Code | Bill No |
  // Date | Terms | Total Due | Due Days | Amount — fixed 30/35px + star columns,
  // everything fits the screen width (no horizontal scroll).
  const billColumns: GridColumn<SalesOsInvoice>[] = [
    {
      key: 'sel', label: '', width: 24,
      render: (inv) => (
        <Icon
          name={selectedIds.includes(inv.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={17}
          color={selectedIds.includes(inv.id) ? Colors.gradientStart : Colors.gray400}
        />
      ),
    },
    { key: 'bookCode', label: 'Book', width: 32, align: 'left' },
    { key: 'number', label: 'Bill No', flex: showInterest ? 0.65 : 0.8, align: 'left', render: (inv) => <GridText align="left" bold fontSize={showInterest ? 10 : undefined}>{inv.number}</GridText> },
    { key: 'date', label: 'Date', flex: 1.1, render: (inv) => <GridText>{toDDMMYY(inv.date)}</GridText> },
    { key: 'termDays', label: 'Terms', width: 35, align: 'right', render: (inv) => <GridText align="right">{String(inv.termDays ?? 0)}</GridText> },
    { key: 'totalDueDays', label: 'Total Due', width: 32, render: (inv) => <GridText>{String(inv.totalDueDays ?? 0)}</GridText> },
    {
      key: 'dueDays', label: 'Due Days', width: 32,
      render: (inv) => (
        <GridText bold color={-inv.daysLeft > 0 ? Colors.danger : Colors.success}>
          {String(-inv.daysLeft)}
        </GridText>
      ),
    },
    { key: 'outstanding', label: 'Amount', flex: 1.4, render: (inv) => <GridText>{`₹${inv.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</GridText> },
    ...(showInterest ? [{
      key: 'interest',
      label: 'Interest',
      flex: 1.3,
      render: (inv: any) => <GridText>{`₹ ${interestCalc.calculateBillInterest(inv.outstanding ?? inv.balance ?? inv.netBalance ?? 0, inv.totalDueDays ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`}</GridText>
    }] : [])
  ];

  const handleShare = async () => {
    if (!party) return;
    const billsToPrint = selectedIds.length > 0 ? selectedInvoices : visibleInvoices;
    const billAmountTotal = billsToPrint.reduce((sum, inv) => sum + inv.outstanding, 0);
    const intAmountTotal = Math.round(billsToPrint.reduce((sum, inv) => sum + interestCalc.calculateBillInterest(inv.outstanding, inv.totalDueDays ?? 0), 0));
    const gst = intAmountTotal * 0.05;
    const tds = Math.round(intAmountTotal * 0.10);
    const netInterest = intAmountTotal + gst - tds;
    const totalSelectedOs = billAmountTotal + netInterest;

    await generateOutstandingReportPDF({
      title: 'Party Wise Sales Outstanding Report',
      companyName: 'VARNI TEXTILE', // Fallback, could be fetched from global state
      companyAddress: 'PLOT NO. 147 TO 151,SUNSHINE IND. ESTATE PART-1, NR. SAYAN SUGAR FACTORY, SAYAN, SURAT, GUJARAT, 394130',
      partyName: party.name,
      partyAddress: party.city || '',
      partyBroker: brokerName || 'DIRECT',
      periodFrom: filter?.fromDate,
      periodTo: filter?.toDate,
      date: new Date().toISOString(),
      invoices: billsToPrint,
      showInterest,
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
        onBack={() => navigation.goBack()}
        rightElement={null}
      />

      <CompanyStrip />

      {/* Fixed summary — does not scroll with bills */}
      <View style={styles.ogSummary}>
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ogParty} numberOfLines={1}>{party.name}</Text>
            <Text style={styles.ogAddress} numberOfLines={1}>
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
            {selectedInvoices.length > 0 ? (
              <>
                <Text style={styles.ogSub}>{selectedInvoices.length} bills selected</Text>
                <View style={styles.selectedSummaryRow}>
                  <Text style={styles.selectedLabel}>Selected Bill Total</Text>
                  <Text style={styles.selectedValue}>{formatCurrency(selectedTotal)}</Text>
                </View>
              </>
            ) : null}
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
              selectedBillAmount={selectedTotal}
              totalInterest={selectedInvoices.reduce((sum, inv) => sum + interestCalc.calculateBillInterest((inv as any).outstanding ?? (inv as any).balance ?? (inv as any).netBalance ?? 0, inv.totalDueDays ?? 0), 0)}
            />
          </View>
        )}
        <GridTableHeader columns={billColumns} />
      </View>

      <ScrollView
        style={styles.billScroll}
        contentContainerStyle={styles.billScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GridTable
          columns={billColumns}
          data={visibleInvoices}
          keyExtractor={(inv, idx) => `${inv.id}-${idx}`}
          onRowPress={(inv) => toggleBill(inv.id)}
          rowStyle={(inv) => (selectedIds.includes(inv.id) ? styles.rowSelected : undefined)}
          emptyText="No pending invoices"
          hideHeader
        />

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
  summaryBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
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
  selectedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingRight: Spacing.sm,
  },
  selectedLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeights.medium },
  selectedValue: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
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
