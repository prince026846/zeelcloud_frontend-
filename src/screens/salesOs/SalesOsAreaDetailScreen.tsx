import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { CompanyStrip } from '../../components/CompanyStrip';
import { GridTable, GridTableHeader, GridColumn, GridText } from '../../components/GridTable';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { InlineInterestCalculator, useInlineInterest } from '../../components/InlineInterestCalculator';
import { salesOsApi } from '../../services/api';
import { Colors, Typography, Spacing } from '../../theme';
import type { SalesOsStackParamList, SalesOsArea, SalesOsParty, SalesOsInvoice } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYY } from '../../utils/formatDate';
import { generateOutstandingReportPDF } from '../../utils/pdfGenerator';

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsAreaDetail'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsAreaDetail'>;
};

export const SalesOsAreaDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { areaId, areaName, filter } = route.params;
  const [area, setArea] = useState<SalesOsArea | undefined>(undefined);
  const [parties, setParties] = useState<SalesOsParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyDue, setOnlyDue] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const interestCalc = useInlineInterest();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      salesOsApi.getAreaById(areaId, filter),
      salesOsApi.getPartiesForArea(areaName, filter),
    ])
      .then(([areaData, partyData]) => {
        setArea(areaData);
        setParties(partyData);
      })
      .finally(() => setLoading(false));
  }, [areaId, areaName, filter]);

  const toggleBill = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allInvoices = parties.flatMap((p) => p.bills || []);
  const visibleInvoices = filter?.onlyDue ? allInvoices.filter((i) => i.daysLeft < 0) : allInvoices;

  const selectedInvoices = visibleInvoices.filter((i) => selectedIds.includes(i.id));
  const selectedTotal = selectedInvoices.reduce((sum, i) => sum + i.outstanding, 0);

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
    {
      key: 'dueDays', label: 'Due Days', width: 40,
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
    if (!area) return;
    const billsToPrint = selectedIds.length > 0 ? selectedInvoices : visibleInvoices;
    const billAmountTotal = billsToPrint.reduce((sum, inv) => sum + inv.outstanding, 0);
    const intAmountTotal = Math.round(billsToPrint.reduce((sum, inv) => sum + interestCalc.calculateBillInterest(inv.outstanding, inv.totalDueDays ?? 0), 0));
    const gst = intAmountTotal * 0.05;
    const tds = Math.round(intAmountTotal * 0.10);
    const netInterest = intAmountTotal + gst - tds;
    const totalSelectedOs = billAmountTotal + netInterest;

    await generateOutstandingReportPDF({
      title: 'Area Wise Sales Outstanding Report',
      companyName: 'VARNI TEXTILE',
      companyAddress: 'PLOT NO. 147 TO 151,SUNSHINE IND. ESTATE PART-1, NR. SAYAN SUGAR FACTORY, SAYAN, SURAT, GUJARAT, 394130',
      partyName: areaName || 'Unknown Area',
      partyAddress: '',
      partyBroker: '',
      periodFrom: filter?.fromDate,
      periodTo: filter?.toDate,
      date: new Date().toISOString(),
      invoices: billsToPrint,
      showInterest,
      totals: {
        totalOs: area.totalOs,
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

  if (loading) return <LoadingOverlay visible message="Loading..." />;
  if (!area) return null;

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Sales O/s (Area Wise)"
        subtitle={areaName || 'Unknown Area'}
        onBack={() => navigation.goBack()}
        rightElement={null}
      />
      <CompanyStrip />

      <View style={styles.ogSummary}>
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ogParty} numberOfLines={1}>{areaName || 'Unknown Area'}</Text>
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
            <Text style={styles.ogTotal}>Total O/s: {formatCurrency(area.totalOs)}</Text>
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

      <View style={styles.stickyHeaderWrap}>
        <GridTableHeader columns={billColumns} />
      </View>

      <ScrollView
        style={styles.billScroll}
        contentContainerStyle={styles.billScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {parties.map((party) => {
          const partyBills = filter?.onlyDue
            ? (party.bills || []).filter(b => b.daysLeft < 0)
            : (party.bills || []);

          const partySelectedInvoices = partyBills.filter(b => selectedIds.includes(b.id));
          const partySelectedTotal = partySelectedInvoices.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);

          if (partyBills.length === 0) return null;

          return (
            <View key={party.id} style={styles.partyContainer}>
              <View style={styles.partyHeader}>
                <Icon name="asterisk" size={14} color={Colors.textSecondary} />
                <Text style={styles.partyTitle}>{party.name}</Text>
              </View>

              <View style={styles.tableBleed}>
                {showInterest && partySelectedInvoices.length > 0 && (
                  <View style={styles.sectionPad}>
                    <InlineInterestCalculator
                      {...interestCalc}
                      selectedBillAmount={partySelectedTotal}
                      totalInterest={partySelectedInvoices.reduce((sum, inv) => sum + interestCalc.calculateBillInterest((inv as any).outstanding ?? (inv as any).balance ?? (inv as any).netBalance ?? 0, inv.totalDueDays ?? 0), 0)}
                    />
                  </View>
                )}

                <GridTable
                  columns={billColumns}
                  data={partyBills}
                  keyExtractor={(inv, idx) => `${inv.id}-${idx}`}
                  onRowPress={(inv) => toggleBill(inv.id)}
                  rowStyle={(inv) => (selectedIds.includes(inv.id) ? styles.rowSelected : undefined)}
                  emptyText="No bills"
                  hideHeader
                />
              </View>
              <View style={styles.partyFooter}>
                <Text style={styles.partyFooterText}>Party Total {formatCurrency(party.totalOs)}</Text>
              </View>
            </View>
          );
        })}

        {parties.length === 0 && (
          <View style={{ alignItems: 'center', padding: Spacing.xl }}>
            <Icon name="map-marker-off" size={36} color={Colors.gray300} />
            <Text style={{ fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.sm }}>
              No parties listed for this area.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionPad: { paddingHorizontal: Spacing.md },
  container: { flex: 1, backgroundColor: Colors.background },
  ogSummary: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  ogParty: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  waIcon: { padding: 4 },
  ogLine: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary, marginTop: 2 },
  ogTotal: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
  ogSub: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  compactToggles: { flexDirection: 'row', gap: Spacing.md, marginLeft: Spacing.sm },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  switch: { transform: [{ scaleX: 0.70 }, { scaleY: 0.70 }] },
  selectedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingRight: Spacing.sm,
  },
  selectedLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  selectedValue: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
  stickyHeaderWrap: { backgroundColor: Colors.surface },
  billScroll: { flex: 1, backgroundColor: Colors.background },
  billScrollContent: { paddingBottom: Spacing.xl },
  partyContainer: { marginBottom: Spacing.md },
  tableBleed: { backgroundColor: Colors.surface },
  rowSelected: { backgroundColor: Colors.purple100 },
  partyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 0, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.lightWash, borderBottomWidth: 1, borderBottomColor: Colors.gray200 },
  partyTitle: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary, textTransform: 'uppercase' },
  partyFooter: { alignItems: 'flex-end', paddingHorizontal: Spacing.md, marginTop: Spacing.xs },
  partyFooterText: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
});
