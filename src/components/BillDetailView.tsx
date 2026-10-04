import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Share, StyleSheet } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { GradientHeader } from './GradientHeader';
import { CompanyStrip } from './CompanyStrip';
import { LoadingOverlay } from './LoadingOverlay';
import { EmptyState } from './EmptyState';
import { GridTable, GridColumn, GridText } from './GridTable';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { toDDMMYYYY } from '../utils/formatDate';
import { generateInvoicePDF } from '../utils/invoicePdfGenerator';
import type { BillDetail, BillDetailItem } from '../types';

export type BillModule = 'sales' | 'purchase' | 'gp';

interface BillDetailViewProps {
  title: string; // "Sales Bill Details" | "Purchase Bill Details" | "GP Bill Details"
  module: BillModule;
  detail?: BillDetail;
  loading: boolean;
  onBack: () => void;
}

// Two decimals everywhere (app-wide rule).
const money = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const num3 = money;

// Items grid columns per module — exactly the OG *RegisterDetails column sets.
const itemColumnsFor = (module: BillModule, detail?: BillDetail): GridColumn<BillDetailItem>[] => {
  const name: GridColumn<BillDetailItem> = {
    key: 'name', label: 'Item Name', flex: 1.9, align: 'left',
    render: (i) => <GridText bold>{i.name}</GridText>,
  };
  const amount: GridColumn<BillDetailItem> = {
    key: 'amount', label: 'Amount', flex: 1.3, align: 'right',
    render: (i) => <GridText>{money(i.amount)}</GridText>,
  };
  if (module === 'sales') {
    const cols: GridColumn<BillDetailItem>[] = [name];
    
    // Check if the API indicates this is "Cartons" (Combination 2)
    const isCombo2 = [detail?.field1, detail?.field2, detail?.field3]
      .some(f => f?.toLowerCase().includes('crtn') || f?.toLowerCase().includes('carton'));

    if (isCombo2) {
      // Combination 2: Crtn, Pallu, Weight, Cops, Amount
      cols.push(
        { key: 'taka', label: 'Crtn', flex: 0.7, render: (i) => <GridText>{String(i.taka ?? 0)}</GridText> },
        { key: 'pallu', label: 'Pallu', flex: 0.7, render: (i) => <GridText>{String(i.pallu ?? 0)}</GridText> },
        { key: 'weight', label: 'Weight', flex: 1, render: (i) => <GridText>{num3(i.weight ?? 0)}</GridText> },
        { key: 'meter', label: 'Cops', flex: 1.1, render: (i) => <GridText>{num3(i.meter ?? 0)}</GridText> }
      );
    } else {
      // Combination 1: Taka, Pallu, Meter, Weight, Amount
      cols.push(
        { key: 'taka', label: 'Taka', flex: 0.7, render: (i) => <GridText>{String(i.taka ?? 0)}</GridText> },
        { key: 'pallu', label: 'Pallu', flex: 0.7, render: (i) => <GridText>{String(i.pallu ?? 0)}</GridText> },
        { key: 'meter', label: 'Meter', flex: 1.1, render: (i) => <GridText>{num3(i.meter ?? 0)}</GridText> },
        { key: 'weight', label: 'Weight', flex: 1, render: (i) => <GridText>{num3(i.weight ?? 0)}</GridText> }
      );
    }
    
    cols.push(amount);
    return cols;
  }
  if (module === 'purchase') {
    return [
      name,
      { key: 'nos', label: 'Nos', flex: 0.7, render: (i) => <GridText>{String(i.nos ?? 0)}</GridText> },
      { key: 'qty', label: 'Qty', flex: 1, render: (i) => <GridText>{num3(i.qty ?? 0)}</GridText> },
      { key: 'cut', label: 'Cut', flex: 0.7, render: (i) => <GridText>{String(i.cut ?? 0)}</GridText> },
      amount,
    ];
  }
  return [
    { ...name, flex: 2.4 },
    { key: 'qty', label: 'Qty', flex: 1, render: (i) => <GridText>{num3(i.qty ?? 0)}</GridText> },
    amount,
  ];
};

interface TotalsRow { label: string; value: number }

// OG totals block: two side-by-side label/value columns → NET AMOUNT banner.
const totalsFor = (module: BillModule, d: BillDetail): { left: TotalsRow[]; right: TotalsRow[] } => {
  if (module === 'sales') {
    return {
      left: [
        { label: 'Grant Total', value: d.grandTotal },
        { label: 'Claim', value: d.claim },
        { label: 'Discount', value: d.discount },
        { label: 'Add Other', value: d.addOther1 },
        { label: 'Freight', value: d.freight },
        { label: 'IGST', value: d.igst },
      ],
      right: [
        { label: 'SGST', value: d.sgst },
        { label: 'CGST', value: d.cgst },
        { label: 'Freight', value: d.bFreight },
        { label: 'Add Other', value: d.addOther2 },
        { label: 'Add Less', value: d.addLess },
        { label: 'TCS', value: d.tcs },
        { label: 'Round Off', value: d.roundOf },
      ],
    };
  }
  if (module === 'purchase') {
    return {
      left: [
        { label: 'Grant Total', value: d.grandTotal },
        { label: 'Discount', value: d.discount },
        { label: 'Add Other', value: d.addOther1 },
        { label: 'Freight', value: d.freight },
        { label: 'IGST', value: d.igst },
      ],
      right: [
        { label: 'SGST', value: d.sgst },
        { label: 'CGST', value: d.cgst },
        { label: 'Add Other', value: d.addOther2 },
        { label: 'Add Less', value: d.addLess },
        { label: 'TCS', value: d.tcs },
        { label: 'Round Off', value: d.roundOf },
      ],
    };
  }
  return {
    left: [
      { label: 'Grant Total', value: d.grandTotal },
      { label: 'Discount', value: d.discount },
      { label: 'Add Other', value: d.addOther1 },
      { label: 'IGST', value: d.igst },
    ],
    right: [
      { label: 'SGST', value: d.sgst },
      { label: 'CGST', value: d.cgst },
      { label: 'Add Other', value: d.addOther2 },
      { label: 'Add Less', value: d.addLess },
      { label: 'TCS', value: d.tcs },
      { label: 'Round Off', value: d.roundOf },
    ],
  };
};

const REPORT_OPTIONS = ['Tax Invoice', 'Job Work Tax Invoice', 'Multi GST Tax Invoice'];

// OG register bill page (SalesRegisterDetails & siblings), section for section:
// company strip → invoice header (No/Date/party/ADD + Select Report + WhatsApp)
// → items grid → pinned totals block → NET AMOUNT banner.
export const BillDetailView: React.FC<BillDetailViewProps> = ({
  title,
  module,
  detail,
  loading,
  onBack,
}) => {
  const [reportType, setReportType] = useState(REPORT_OPTIONS[0]);

  const pickReport = () => {
    Alert.alert(
      'Select Report',
      undefined,
      [
        ...REPORT_OPTIONS.map((o) => ({ text: o, onPress: () => setReportType(o) })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const handleShare = async () => {
    if (!detail) return;
    await generateInvoicePDF(detail, module, reportType);
  };

  if (loading) return <LoadingOverlay visible message="Loading..." />;

  return (
    <View style={styles.container}>
      <GradientHeader title={title} onBack={onBack} />
      <CompanyStrip />

      {!detail ? (
        <EmptyState icon="file-document-outline" title="Bill not found" />
      ) : (
        <>
          {/* Invoice header (OG dark info frame) */}
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerLine}>Invoice No: {detail.invoiceNo}</Text>
                <Text style={styles.headerLine}>Date: {toDDMMYYYY(detail.date)}</Text>
                <Text style={styles.partyName}>{detail.partyName}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.selectLabel}>Select Report</Text>
                <TouchableOpacity onPress={pickReport} activeOpacity={0.7}>
                  <Text style={styles.selectValue}>{reportType}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.waBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Icon name="file-pdf-box" size={20} color={Colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>
            {detail.partyAddress ? (
              <Text style={styles.address}>ADD:- {detail.partyAddress}</Text>
            ) : null}
          </View>

          {/* Items grid */}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <GridTable
              columns={itemColumnsFor(module, detail)}
              data={detail.items}
              keyExtractor={(_, idx) => String(idx)}
              emptyText="No items"
            />
          </ScrollView>

          {/* Pinned totals block (OG bottom frame) */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsColumns}>
              {[totalsFor(module, detail).left, totalsFor(module, detail).right].map((rows, colIdx) => (
                <View key={colIdx} style={styles.totalsCol}>
                  {rows.map((r, i) => (
                    <View key={`${r.label}-${i}`} style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, i === 0 && colIdx === 0 && styles.totalsLabelBold]}>
                        {r.label}
                      </Text>
                      <Text style={[styles.totalsValue, i === 0 && colIdx === 0 && styles.totalsLabelBold]}>
                        {money(r.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.netRow}>
              <Text style={styles.netText}>NET AMOUNT : ₹ {money(detail.netAmount)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBlock: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: Spacing.sm },
  headerLine: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary, marginBottom: 2 },
  partyName: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary, marginTop: 2 },
  headerRight: { alignItems: 'center', gap: 4 },
  selectLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold, color: Colors.textSecondary },
  selectValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary,
    paddingBottom: 1,
  },
  waBtn: {
    marginTop: 4,
    width: 44,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.pdf,
    justifyContent: 'center',
    alignItems: 'center',
  },
  address: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 4 },
  list: { paddingBottom: Spacing.md },
  totalsBlock: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  totalsColumns: { flexDirection: 'row', gap: Spacing.lg },
  totalsCol: { flex: 1 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalsLabel: { fontSize: 11, color: Colors.textPrimary },
  totalsLabelBold: { fontWeight: Typography.fontWeights.bold },
  totalsValue: { fontSize: 11, color: Colors.textPrimary },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  netText: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
});
