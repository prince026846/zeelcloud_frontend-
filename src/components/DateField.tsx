import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

// ─── format helpers: value is always ISO (YYYY-MM-DD); UI shows DD/MM/YYYY ──────

const pad = (n: number): string => String(n).padStart(2, '0');

const isoToDisplay = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const dateToIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const isoToDate = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

interface DateFieldProps {
  label?: string;
  value: string; // ISO YYYY-MM-DD, or '' for "no date"
  onChange: (iso: string) => void;
  placeholder?: string;
  // Date the calendar opens on when no value is set yet.
  // OG .NET app default for "From": 01/04/2017 (FromdatePicker Date="04/01/2017").
  defaultDate?: string; // ISO YYYY-MM-DD
  // Show an inline ✕ to clear the date (used where "All" / no-date is allowed).
  allowClear?: boolean;
}

// Calendar-only date field (typing removed by client request): tapping ANYWHERE
// on the field opens the system date picker — Android's dialog, or an inline
// calendar sheet on iOS. The value can only be set from the calendar.
export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  defaultDate,
  allowClear = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const pickerDate: Date =
    isoToDate(value) ?? (defaultDate ? isoToDate(defaultDate) : null) ?? new Date();

  const handleValueChange = (event: any, date?: Date) => {
    if (Platform.OS !== 'ios') setShowPicker(false); // Android dialog closes itself
    if (!date) return;
    onChange(dateToIso(date));
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  const display = isoToDisplay(value);

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.inputRow} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <Icon name="calendar" size={16} color={Colors.gradientStart} />
        <Text 
          style={[styles.valueText, !display && styles.placeholderText]} 
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.5}
        >
          {display || placeholder}
        </Text>
        {allowClear && display ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={15} color={Colors.gray400} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {/* Android: system calendar dialog. iOS: inline calendar in a bottom sheet. */}
      {showPicker && Platform.OS !== 'ios' && (
        <DateTimePicker value={pickerDate} mode="date" display="default" onValueChange={handleValueChange} onDismiss={handleDismiss} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{label || 'Select date'}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="inline"
                onValueChange={handleValueChange}
                onDismiss={handleDismiss}
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueText: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  placeholderText: {
    color: Colors.gray400,
    fontWeight: Typography.fontWeights.regular,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
  },
  doneText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.gradientStart,
  },
});
