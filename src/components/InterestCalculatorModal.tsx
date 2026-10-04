import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

// ─── Bill model (mirrors OG fields) ───────────────────────────────────────────
export interface InterestBill {
  id: string;
  net: number; // Vn_balance (full balance incl GST)
  basic: number; // VN_Amount_Befor_Gst (before GST)
  totalDueDays: number; // Total_due_days (total days outstanding)
}

const GST_RATE = 0.18;
const DEFAULT_TERM_DAYS = 30;
const ACCENT = Colors.primary;

// Map an outstanding invoice to the fields the interest calc needs, with
// sensible fallbacks for the current mock data (the real API supplies these).
export const toInterestBill = (inv: {
  id: string;
  outstanding: number;
  amount: number;
  daysLeft: number;
  totalDueDays?: number;
  termDays?: number;
  amountBeforeGst?: number;
}): { bill: InterestBill; termDays: number } => {
  const termDays = inv.termDays ?? DEFAULT_TERM_DAYS;
  const overdue = Math.max(0, -inv.daysLeft);
  const totalDueDays = inv.totalDueDays ?? termDays + overdue;
  const basic = inv.amountBeforeGst ?? Math.round(inv.outstanding / (1 + GST_RATE));
  return { bill: { id: inv.id, net: inv.outstanding, basic, totalDueDays }, termDays };
};

const leapYearDays = (): number => {
  const y = new Date().getFullYear();
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return leap ? 366 : 365;
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const formatMoney = (n: number): string =>
  `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface InterestCalculatorModalProps {
  visible: boolean;
  bills: InterestBill[];
  defaultDueDays: number; // Vn_due_days from first selected bill
  onClose: () => void;
}

export const InterestCalculatorModal: React.FC<InterestCalculatorModalProps> = ({
  visible,
  bills,
  defaultDueDays,
  onClose,
}) => {
  const [onBasic, setOnBasic] = useState(false); // "On Net" default
  const [unpaidAmount, setUnpaidAmount] = useState('');
  const [rate, setRate] = useState('18');
  const [annualDays, setAnnualDays] = useState(String(leapYearDays()));
  const [dueDays, setDueDays] = useState(String(defaultDueDays));
  const [interest, setInterest] = useState<number | null>(null);
  const [netAmount, setNetAmount] = useState<number | null>(null);

  const principalSum = (basisBasic: boolean) =>
    bills.reduce((sum, b) => sum + (basisBasic ? b.basic : b.net), 0);

  // (Re)initialise whenever the popup opens or the selection changes.
  useEffect(() => {
    if (!visible) return;
    setOnBasic(false);
    setRate('18');
    setAnnualDays(String(leapYearDays()));
    setDueDays(String(defaultDueDays));
    setUnpaidAmount(String(Math.round(principalSum(false) * 100) / 100));
    setInterest(null);
    setNetAmount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultDueDays, bills]);

  const selectBasis = (basic: boolean) => {
    setOnBasic(basic);
    setUnpaidAmount(String(Math.round(principalSum(basic) * 100) / 100));
    setInterest(null);
    setNetAmount(null);
  };

  const handleCalculate = () => {
    const r = parseFloat(rate) || 0;
    const dY = parseInt(annualDays, 10) || leapYearDays();
    const grace = parseInt(dueDays, 10) || 0;

    // Simple interest per bill: round(P × R/100 / DaysInYear × (TotalDueDays − DueDays), 2)
    let intAmount = 0;
    bills.forEach((b) => {
      const p = onBasic ? b.basic : b.net;
      intAmount += round2(((p * r) / 100 / dY) * (b.totalDueDays - grace));
    });
    const principal = principalSum(onBasic);

    // Profita logic: GST (5%) is added on the interest and TDS (10%) is deducted
    // from it — Net Interest After TDS = interest + GST − TDS; the net amount is
    // the selected bill amount plus that net interest.
    const gst = round2(intAmount * 0.05);
    const tds = round2(intAmount * 0.10);
    const netInterest = round2(intAmount + gst - tds);

    setInterest(intAmount);
    setNetAmount(principal + netInterest);
  };

  const handleExit = () => {
    setInterest(null);
    setNetAmount(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleExit}>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>:: Interest Calculation ::</Text>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* On Net / On Basic */}
            <View style={styles.radioRow}>
              <TouchableOpacity style={styles.radio} onPress={() => selectBasis(false)} activeOpacity={0.7}>
                <Icon name={!onBasic ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={Colors.primary} />
                <Text style={styles.radioLabel}>On Net</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radio} onPress={() => selectBasis(true)} activeOpacity={0.7}>
                <Icon name={onBasic ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={Colors.primary} />
                <Text style={styles.radioLabel}>On Basic</Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <Field label="Unpaid Amount" value={unpaidAmount} onChangeText={setUnpaidAmount} keyboardType="numeric" />
            <Field label="Interest Rate (%)" value={rate} onChangeText={setRate} keyboardType="numeric" />
            <Field label="Annual / Month Days" value={annualDays} onChangeText={setAnnualDays} keyboardType="numeric" />
            <Field label="Due Days" value={dueDays} onChangeText={setDueDays} keyboardType="numeric" />

            {/* Calculate */}
            <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} activeOpacity={0.85}>
              <Icon name="calculator-variant-outline" size={18} color={Colors.textWhite} />
              <Text style={styles.calcBtnText}>Calculate</Text>
            </TouchableOpacity>

            {/* Results */}
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Interest Amount</Text>
              <Text style={styles.resultValue}>{interest === null ? '—' : formatMoney(interest)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Amount</Text>
              <Text style={styles.resultValue}>{netAmount === null ? '—' : formatMoney(netAmount)}</Text>
            </View>

            <Text style={styles.billsNote}>
              {bills.length} bill{bills.length > 1 ? 's' : ''} selected · Simple interest + GST 5% − TDS 10%
            </Text>
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity style={styles.exitBtn} onPress={handleExit} activeOpacity={0.85}>
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'numeric' | 'default';
}> = ({ label, value, onChangeText, keyboardType = 'default' }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholderTextColor={Colors.gray400}
    />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(66,64,150,0.55)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  popup: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  headerText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  body: { padding: Spacing.lg },
  radioRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioLabel: { fontSize: Typography.fontSizes.base, color: Colors.textPrimary, fontWeight: Typography.fontWeights.medium },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  fieldInput: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  calcBtnText: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.semiBold, color: Colors.textWhite },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeights.medium },
  resultValue: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.warning },
  billsNote: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xs },
  exitBtn: {
    backgroundColor: ACCENT,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  exitText: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textWhite },
});
