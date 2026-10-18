import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

import { useState, useEffect, useMemo } from 'react';

export type InterestBaseMode = 'net' | 'basic';

/**
 * Extract normalized overdue days from any invoice object.
 * Logic:
 * 1. If totalDueDays and termDays exist: max(0, totalDueDays - termDays).
 * 2. If dueDays exists (e.g. GpOsInvoice where due_days = totalDueDays - termDays): max(0, dueDays).
 * 3. If daysLeft exists (Sales/Purchase where negative means overdue): max(0, -daysLeft).
 * 4. Fallback: max(0, totalDueDays ?? 0).
 */
export const getOverdueDays = (inv: any): number => {
  if (!inv) return 0;
  if (typeof inv.totalDueDays === 'number' && typeof inv.termDays === 'number') {
    return Math.max(0, inv.totalDueDays - inv.termDays);
  }
  if (typeof inv.dueDays === 'number') {
    return Math.max(0, inv.dueDays);
  }
  if (typeof inv.daysLeft === 'number') {
    return Math.max(0, -inv.daysLeft);
  }
  if (typeof inv.totalDueDays === 'number') {
    return Math.max(0, inv.totalDueDays);
  }
  return 0;
};

/**
 * Extract the base amount for interest calculation:
 * - Net mode (default): uses outstanding / balance.
 * - Basic mode: uses amountBeforeGst (VN_Amount_Befor_Gst). If 0/missing/invalid, safely falls back to net amount.
 */
export const getBillBaseAmount = (inv: any, base: InterestBaseMode = 'net'): number => {
  if (!inv) return 0;
  const netAmount = Number(inv.outstanding ?? inv.balance ?? inv.netBalance ?? inv.amount ?? 0) || 0;
  if (base === 'basic') {
    const preGst = Number(inv.amountBeforeGst ?? inv.vn_amount_befor_gst ?? inv.VN_Amount_Befor_Gst ?? 0);
    return preGst > 0 ? preGst : netAmount;
  }
  return netAmount;
};

export const useInlineInterest = () => {
  const [interestType, setInterestType] = useState<'yearly' | 'monthly'>('yearly');
  const [interestRate, setInterestRate] = useState('18');
  const [interestDays, setInterestDays] = useState('365');
  const [extraDays, setExtraDays] = useState('');
  const [interestBase, setInterestBase] = useState<InterestBaseMode>('net');

  useEffect(() => {
    if (interestType === 'yearly') {
      setInterestRate('18');
      setInterestDays('365');
    } else {
      setInterestRate('1.5');
      setInterestDays('30');
    }
  }, [interestType]);

  const calculateBillInterest = (
    invOrAmount: any,
    daysOrOverdue?: number,
    mode?: InterestBaseMode
  ): number => {
    let baseAmt = 0;
    let overdueDays = 0;

    if (typeof invOrAmount === 'object' && invOrAmount !== null) {
      const activeMode = mode ?? interestBase;
      baseAmt = getBillBaseAmount(invOrAmount, activeMode);
      overdueDays = getOverdueDays(invOrAmount);
    } else {
      baseAmt = Number(invOrAmount) || 0;
      overdueDays = Number(daysOrOverdue) || 0;
    }

    // Bills that have not exceeded credit terms must accrue zero interest
    if (overdueDays <= 0 || baseAmt <= 0) {
      return 0;
    }

    const rate = parseFloat(interestRate) || 0;
    const baseDays = parseInt(interestDays, 10) || (interestType === 'yearly' ? 365 : 30);
    const extra = parseInt(extraDays, 10) || 0;
    // Add user-entered +Days only after determining overdue days, clamped to zero
    const calcDays = Math.max(0, overdueDays + extra);

    if (calcDays <= 0) return 0;

    const interest = (baseAmt * rate / 100 / baseDays) * calcDays;
    return Math.round((interest + Number.EPSILON) * 100) / 100;
  };

  const calculateSelectedBillAmount = (invoices: any[], mode?: InterestBaseMode): number => {
    const activeMode = mode ?? interestBase;
    return invoices.reduce((sum, inv) => sum + getBillBaseAmount(inv, activeMode), 0);
  };

  const calculateTotalInterest = (invoices: any[], mode?: InterestBaseMode): number => {
    const activeMode = mode ?? interestBase;
    return invoices.reduce((sum, inv) => sum + calculateBillInterest(inv, undefined, activeMode), 0);
  };

  return {
    interestType, setInterestType,
    interestRate, setInterestRate,
    interestDays, setInterestDays,
    extraDays, setExtraDays,
    interestBase, setInterestBase,
    calculateBillInterest,
    calculateSelectedBillAmount,
    calculateTotalInterest,
    getBillBaseAmount,
    getOverdueDays,
  };
};

export interface InlineInterestCalculatorProps {
  interestType: 'yearly' | 'monthly';
  setInterestType: (type: 'yearly' | 'monthly') => void;
  interestRate: string;
  setInterestRate: (rate: string) => void;
  interestDays: string;
  setInterestDays: (days: string) => void;
  extraDays: string;
  setExtraDays: (days: string) => void;
  interestBase?: InterestBaseMode;
  setInterestBase?: (base: InterestBaseMode) => void;
  totalInterest: number;
  selectedBillAmount: number;
}

const formatMoney = (n: number): string =>
  `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export const InlineInterestCalculator: React.FC<InlineInterestCalculatorProps> = ({
  interestType,
  setInterestType,
  interestRate,
  setInterestRate,
  interestDays,
  setInterestDays,
  extraDays,
  setExtraDays,
  interestBase = 'net',
  setInterestBase,
  totalInterest,
  selectedBillAmount,
}) => {
  const roundedInterest = Math.round(totalInterest);
  const gst = roundedInterest * 0.05;
  const tds = Math.round(roundedInterest * 0.10);
  const netInterest = roundedInterest + gst - tds;
  const totalOs = selectedBillAmount + netInterest;
  const isBasic = interestBase === 'basic';

  return (
    <View style={styles.container}>
      {/* Settings Row (All inline) */}
      <View style={styles.settingsRow}>
        <TouchableOpacity style={styles.compactTypeBtn} onPress={() => setInterestType(interestType === 'yearly' ? 'monthly' : 'yearly')} activeOpacity={0.7}>
          <Text style={styles.compactTypeBtnText}>{interestType === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
          <Icon name="swap-horizontal" size={14} color={Colors.primary} />
        </TouchableOpacity>

        {setInterestBase && (
          <View style={styles.baseSegment}>
            <TouchableOpacity
              style={[styles.baseSegmentBtn, !isBasic && styles.baseSegmentBtnActive]}
              onPress={() => setInterestBase('net')}
              activeOpacity={0.7}
            >
              <Text style={[styles.baseSegmentText, !isBasic && styles.baseSegmentTextActive]}>Net</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.baseSegmentBtn, isBasic && styles.baseSegmentBtnActive]}
              onPress={() => setInterestBase('basic')}
              activeOpacity={0.7}
            >
              <Text style={[styles.baseSegmentText, isBasic && styles.baseSegmentTextActive]}>Basic</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.compactInputGroup}>
          <Text style={styles.inputLabel}>Int(%)</Text>
          <TextInput style={styles.compactInput} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" />
        </View>
        <View style={styles.compactInputGroup}>
          <Text style={styles.inputLabel}>Days</Text>
          <TextInput style={styles.compactInput} value={interestDays} onChangeText={setInterestDays} keyboardType="numeric" />
        </View>
        <View style={styles.compactInputGroup}>
          <Text style={styles.inputLabel}>+Days</Text>
          <TextInput style={styles.compactInput} value={extraDays} onChangeText={setExtraDays} keyboardType="numeric" placeholder="0" />
        </View>
      </View>

      {/* Selected Bills Total O/s Card (Single Column List) */}
      <View style={styles.card}>
        <Text style={styles.cardTitleCentered}>Selected Bills Total O/s</Text>
        
        <View style={styles.rowCompact}>
          <Text style={styles.labelCompact}>Bills Interest Amount{isBasic ? ' (Basic)' : ''}:</Text>
          <Text style={styles.valueCompact}>{formatMoney(roundedInterest)}</Text>
        </View>
        <View style={styles.rowCompact}>
          <Text style={styles.labelCompact}>GST(5%):</Text>
          <Text style={styles.valueCompact}>+ {formatMoney(gst)}</Text>
        </View>
        <View style={styles.rowCompact}>
          <Text style={styles.labelCompact}>TDS(10%):</Text>
          <Text style={styles.valueCompact}>- {formatMoney(tds)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowCompact}>
          <Text style={styles.labelCompact}>Net Interest Amount After TDS:</Text>
          <Text style={styles.valueCompact}>{formatMoney(netInterest)}</Text>
        </View>
        <View style={styles.rowCompact}>
          <Text style={styles.labelCompact}>Selected Bill Amount{isBasic ? ' (Basic)' : ''}:</Text>
          <Text style={styles.valueCompact}>{formatMoney(selectedBillAmount)}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.rowCompact}>
          <Text style={styles.labelBold}>Total Selected Bill O/s:</Text>
          <Text style={styles.valueBold}>{formatMoney(totalOs)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  compactTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 32,
    backgroundColor: Colors.surface,
  },
  compactTypeBtnText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  baseSegment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 32,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  baseSegmentBtn: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  baseSegmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  baseSegmentText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  baseSegmentTextActive: {
    color: '#ffffff',
    fontWeight: Typography.fontWeights.bold,
  },
  compactInputGroup: {
    flex: 1,
    minWidth: 50,
  },
  inputLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.semiBold,
    marginBottom: 2,
    textAlign: 'center',
  },
  compactInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 4,
    height: 32,
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
  },
  cardTitleCentered: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary, // Brand indigo
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  rowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  labelCompact: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  valueCompact: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  labelBold: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.bold,
  },
  valueBold: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.bold,
  },
});
