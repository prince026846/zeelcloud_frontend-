import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Share, Linking } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { CompanyStrip } from '../../components/CompanyStrip';
import { Card } from '../../components/Card';
import { Badge, getDaysBadgeVariant } from '../../components/Badge';
import { GridTable, GridColumn, GridText } from '../../components/GridTable';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { InlineInterestCalculator, useInlineInterest } from '../../components/InlineInterestCalculator';
import { gpOsApi } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { GpOsStackParamList, GpOsParty, GpOsInvoice } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYY } from '../../utils/formatDate';
import { generateOutstandingReportPDF } from '../../utils/pdfGenerator';

type Props = {
  navigation: NativeStackNavigationProp<GpOsStackParamList, 'GpOsPartyDetail'>;
  route: RouteProp<GpOsStackParamList, 'GpOsPartyDetail'>;
};

// Adapter: bridge GP invoice fields → the shape toInterestBill() expects.
const gpInvoiceToInterestInput = (inv: GpOsInvoice) => ({
  id: inv.id,
  outstanding: inv.balance,             // Vn_balance → "outstanding"
  amount: inv.balance,                  // same as outstanding for GP
  daysLeft: -inv.dueDays,               // due_days positive when overdue; daysLeft negative when overdue
  totalDueDays: inv.totalDueDays,       // Total_due_days → direct map
  termDays: inv.termDays,               // Vn_due_days → direct map
  amountBeforeGst: inv.amountBeforeGst, // VN_Amount_Befor_Gst → direct map
});

export const GpOsPartyDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { partyId, partyName, filter } = route.params;
  const [party, setParty] = useState<GpOsParty | undefined>(undefined);
  const [invoices, setInvoices] = useState<GpOsInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [onlyDue, setOnlyDue] = useState(filter.onlyDue ?? false);
  const [showInterest, setShowInterest] = useState(false);
  const interestCalc = useInlineInterest();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      gpOsApi.getPartyById(partyId, filter),
      gpOsApi.getPartyInvoices(partyId, filter),
    ])
      .then(([partyData, invoiceData]) => {
        setParty(partyData ?? {
          id: partyId,
          name: partyName,
          address: '',
          totalOs: invoiceData.reduce((sum, inv) => sum + inv.balance, 0),
          invoiceCount: invoiceData.length,
          daysOverdue: 0,
        });
        setInvoices(invoiceData);
      })
      .finally(() => setLoading(false));
  }, [partyId, partyName, filter]);

  // "Only Due" → show only overdue bills (due_days > 0).
  const visibleInvoices = onlyDue ? invoices.filter((i) => i.dueDays > 0) : invoices;

  const toggleBill = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () =>
    setSelectedIds((prev) => (prev.length === visibleInvoices.length ? [] : visibleInvoices.map((i) => i.id)));

  const selectedInvoices = visibleInvoices.filter((i) => selectedIds.includes(i.id));
  const selectedTotal = selectedInvoices.reduce((sum, i) => sum + i.balance, 0);

    

  // OG summary: broker comes from the party's bills (Vv_brocker_name).
  const brokerName = invoices.find((i) => i.brokerName)?.brokerName;

  // OG .NET grid (GPOsPartyDetailPage): same fit-to-width column layout.
  const billColumns: GridColumn<GpOsInvoice>[] = [
    {
      key: 'sel', label: '', width: 24,
      render: (inv) => (
        <Icon
          name={selectedIds.includes(inv.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={17}
          color={selectedIds.includes(inv.id) ? Colors.gradientEnd : Colors.gray400}
        />
      ),
    },
    { key: 'bookCode', label: 'Book', width: 32, align: 'left' },
    { key: 'billNo', label: 'Bill No', flex: showInterest ? 0.65 : 0.8, align: 'left', render: (inv) => <GridText align="left" bold fontSize={showInterest ? 10 : undefined}>{inv.billNo}</GridText> },
    { key: 'billDate', label: 'Date', flex: 1.1, render: (inv) => <GridText>{toDDMMYY(inv.billDate)}</GridText> },
    { key: 'termDays', label: 'Terms', width: 35, align: 'right', render: (inv) => <GridText align="right">{String(inv.termDays)}</GridText> },
    { key: 'totalDueDays', label: 'Total Due', width: 32, render: (inv) => <GridText fontSize={showInterest ? 10 : undefined}>{String(inv.totalDueDays)}</GridText> },
    {
      key: 'dueDays', label: 'Due Days', width: 40,
      render: (inv) => (
        <GridText bold color={inv.dueDays > 0 ? Colors.danger : Colors.success}>
          {String(inv.dueDays)}
        </GridText>
      ),
    },
    { key: 'balance', label: 'Amount', flex: 1.4, render: (inv) => <GridText>{`₹${inv.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</GridText> },
    ...(showInterest ? [{
      key: 'interest',
      label: 'Interest',
      flex: 1.3,
      render: (inv: any) => <GridText>{`₹${interestCalc.calculateBillInterest(inv.outstanding ?? inv.balance ?? inv.netBalance ?? 0, inv.totalDueDays ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`}</GridText>
    }] : [])
  ];

  const handleShare = async () => {
    if (!party) return;
    const billsToPrint = selectedIds.length > 0 ? selectedInvoices : visibleInvoices;
    const billAmountTotal = billsToPrint.reduce((sum, inv) => sum + (inv.balance ?? 0), 0);
    const intAmountTotal = Math.round(billsToPrint.reduce((sum, inv) => sum + interestCalc.calculateBillInterest(inv.balance ?? 0, inv.totalDueDays ?? 0), 0));
    const gst = intAmountTotal * 0.05;
    const tds = Math.round(intAmountTotal * 0.10);
    const netInterest = intAmountTotal + gst - tds;
    const totalSelectedOs = billAmountTotal + netInterest;

    await generateOutstandingReportPDF({
      title: 'Party Wise GP Outstanding Report',
      companyName: 'VARNI TEXTILE',
      companyAddress: 'PLOT NO. 147 TO 151,SUNSHINE IND. ESTATE PART-1, NR. SAYAN SUGAR FACTORY, SAYAN, SURAT, GUJARAT, 394130',
      partyName: party.name,
      partyAddress: party.address || '',
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

  if (!party) return <LoadingOverlay visible message="Loading..." />;

  return (
    <View style={styles.container}>
      <GradientHeader title="GP O/s (Party Wise)"
        onBack={() => navigation.goBack()}
        rightElement={null}
      />
      <CompanyStrip />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* OG-style summary header (GPOsPartyDetailPage): party, address, broker,
            dates, Total O/s. */}
        <View style={styles.ogSummary}>
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ogParty} numberOfLines={1}>{party.name}</Text>
              <Text style={styles.ogAddress} numberOfLines={1}>
                {party.address ? `${party.address} | ` : ''}Broker: {brokerName || 'DIRECT'}
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
            <View>
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
        </View>



        {/* Bills — full-bleed table section (no card, edge-to-edge) */}
        <View style={styles.invoicesSection}>
          <View style={[styles.invoicesHeader, styles.sectionPad]}>
            <Text style={styles.cardTitle}>
              {onlyDue ? 'Due Invoices' : 'Pending Invoices'} ({visibleInvoices.length})
            </Text>
          </View>

          {visibleInvoices.length > 0 ? (
            <TouchableOpacity style={[styles.selectAll, styles.sectionPad]} onPress={toggleSelectAll} activeOpacity={0.7}>
              <Icon
                name={selectedIds.length === visibleInvoices.length ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={18}
                color={Colors.gradientEnd}
              />
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          ) : null}

          {showInterest && selectedInvoices.length > 0 && (
            <View style={styles.sectionPad}>
              <InlineInterestCalculator
                {...interestCalc}
                selectedBillAmount={selectedTotal}
                totalInterest={selectedInvoices.reduce((sum, inv) => sum + interestCalc.calculateBillInterest((inv as any).outstanding ?? (inv as any).balance ?? (inv as any).netBalance ?? 0, inv.totalDueDays ?? 0), 0)}
              />
            </View>
          )}

          <GridTable
            columns={billColumns}
            data={visibleInvoices}
            keyExtractor={(inv, idx) => `${inv.id}-${idx}`}
            onRowPress={(inv) => toggleBill(inv.id)}
            rowStyle={(inv) => (selectedIds.includes(inv.id) ? styles.rowSelected : undefined)}
            emptyText="No pending invoices"
          />

          {visibleInvoices.length > 0 && !showInterest ? (
            <View style={[styles.selectedRow, styles.sectionPad]}>
              <Text style={styles.selectedLabel}>Selected Bill Total</Text>
              <Text style={styles.selectedValue}>{formatCurrency(selectedTotal)}</Text>
            </View>
          ) : null}
        </View>


      </ScrollView>

      
      <LoadingOverlay visible={loading} message="Loading invoices..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  shareBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeRow: { marginBottom: Spacing.md },
  card: { marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', gap: Spacing.sm },
  gridItem: { flex: 1, backgroundColor: Colors.gray50, borderRadius: BorderRadius.md, padding: Spacing.md },
  gridIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  gridValue: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  gridLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  phone: { fontSize: Typography.fontSizes.base, color: Colors.textPrimary, fontWeight: Typography.fontWeights.medium },

  // OG-style summary header block (light blue, like the .NET Blue400Accent frame).
  ogSummary: {
    backgroundColor: Colors.infoLight,
    marginHorizontal: -Spacing.md,
    marginTop: -Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  ogParty: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 2 },
  ogAddress: { flex: 1, fontSize: 10, fontStyle: 'italic', color: Colors.textSecondary },
  waIcon: { padding: 4, backgroundColor: Colors.whatsappLight, borderRadius: 20 },
  ogLine: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary, marginTop: 2 },
  ogTotal: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientEnd },
  ogSub: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  invoicesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlyDueToggle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  onlyDueLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textSecondary },
  
  compactToggles: { flexDirection: 'row', gap: Spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.md },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  switch: { transform: [{ scaleX: 0.70 }, { scaleY: 0.70 }] },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  selectAllText: { fontSize: Typography.fontSizes.xs, color: Colors.gradientEnd, fontWeight: Typography.fontWeights.semiBold },
  // Full-bleed table section: cancels the ScrollView's horizontal padding so the
  // grid uses the entire screen width.
  invoicesSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: -Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionPad: { paddingHorizontal: Spacing.md },
  interestBtnPad: { marginHorizontal: Spacing.md },
  rowSelected: { backgroundColor: Colors.purple100 },

  invoiceItem: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  invNumberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  billNo: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.gradientEnd },
  dueBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  dueBadgeText: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metaItem: { width: '33.33%', paddingVertical: 5 },
  metaLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 1 },
  metaValue: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  amountLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  amountValue: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.danger },

  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  selectedLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeights.medium },
  selectedValue: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientEnd },
  interestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gradientEnd,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  interestBtnText: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semiBold, color: Colors.textWhite },

  noInvoices: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
});
