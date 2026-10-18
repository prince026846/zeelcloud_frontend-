import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { toDDMMYYYY } from '../utils/formatDate';
import {
  QuickDateRange,
  QUICK_DATE_RANGES,
  calculateFromDateForRange,
  getRangeBadgeLabel,
  parseIsoDate,
  toIsoDateString,
} from '../utils/dateRange';

interface LedgerDateFieldProps {
  label?: string;
  value: string; // ISO YYYY-MM-DD
  toDate: string; // ISO YYYY-MM-DD
  selectedRange: QuickDateRange;
  onSelectRange: (range: QuickDateRange, newFromDate: string) => void;
  onCustomDateChange: (iso: string) => void;
  placeholder?: string;
}

export const LedgerDateField: React.FC<LedgerDateFieldProps> = ({
  label,
  value,
  toDate,
  selectedRange,
  onSelectRange,
  onCustomDateChange,
  placeholder = 'From Date',
}) => {
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const display = toDDMMYYYY(value);
  const badgeLabel = getRangeBadgeLabel(selectedRange);

  const pickerDate: Date = parseIsoDate(value || toDate);

  const handleRangeSelect = (rangeKey: QuickDateRange) => {
    setShowRangeModal(false);
    const calculatedFrom = calculateFromDateForRange(rangeKey, toDate);
    onSelectRange(rangeKey, calculatedFrom);
  };

  const handleCustomDateOption = () => {
    setShowRangeModal(false);
    // Slight delay on iOS/Android to ensure smooth transition from range modal to calendar
    setTimeout(() => {
      setShowCalendar(true);
    }, 150);
  };

  const handleCalendarChange = (event: any, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowCalendar(false);
    }
    if (event?.type === 'dismissed' || !date) {
      return;
    }
    const iso = toIsoDateString(date);
    onCustomDateChange(iso);
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      {/* Compact input field matching standard DateField size */}
      <TouchableOpacity
        style={styles.inputRow}
        onPress={() => setShowRangeModal(true)}
        activeOpacity={0.7}
      >
        <Icon name="calendar" size={15} color={Colors.gradientStart} />
        <Text
          style={[styles.valueText, !display && styles.placeholderText]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.7}
        >
          {display || placeholder}
        </Text>
        <View style={styles.rangeBadge}>
          <Text style={styles.rangeBadgeText}>{badgeLabel}</Text>
          <Icon name="chevron-down" size={11} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Range Selection Modal Sheet */}
      <Modal
        visible={showRangeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowRangeModal(false)}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <Text style={styles.sheetTitle}>Select Date Range</Text>
                <Text style={styles.sheetSubtitle}>
                  Relative to To Date ({toDDMMYYYY(toDate)})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowRangeModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* Quick Preset Ranges */}
              <View style={styles.optionsList}>
                {QUICK_DATE_RANGES.map((opt) => {
                  const isSelected = selectedRange === opt.key;
                  const calculatedDate = calculateFromDateForRange(opt.key, toDate);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() => handleRangeSelect(opt.key)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.optionIconBox,
                          isSelected && styles.optionIconBoxSelected,
                        ]}
                      >
                        <Icon
                          name={opt.icon}
                          size={18}
                          color={isSelected ? Colors.primary : Colors.textSecondary}
                        />
                      </View>
                      <View style={styles.optionInfo}>
                        <View style={styles.optionTitleRow}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          {opt.key === 'week' ? (
                            <View style={styles.defaultTag}>
                              <Text style={styles.defaultTagText}>Default</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.optionDates}>
                          From: {toDDMMYYYY(calculatedDate)} ({opt.description})
                        </Text>
                      </View>
                      <View style={styles.radioWrapper}>
                        <Icon
                          name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                          size={20}
                          color={isSelected ? Colors.primary : Colors.gray400}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.divider} />

                {/* Custom Date Option */}
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    selectedRange === 'custom' && styles.optionRowSelected,
                  ]}
                  onPress={handleCustomDateOption}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      selectedRange === 'custom' && styles.optionIconBoxSelected,
                    ]}
                  >
                    <Icon
                      name="calendar-edit"
                      size={18}
                      color={selectedRange === 'custom' ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text
                      style={[
                        styles.optionTitle,
                        selectedRange === 'custom' && styles.optionTitleSelected,
                      ]}
                    >
                      Custom Date...
                    </Text>
                    <Text style={styles.optionDates}>
                      {selectedRange === 'custom' && display
                        ? `Selected: ${display} (tap to change)`
                        : 'Pick specific date from calendar'}
                    </Text>
                  </View>
                  <View style={styles.radioWrapper}>
                    <Icon
                      name={selectedRange === 'custom' ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selectedRange === 'custom' ? Colors.primary : Colors.gray400}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* System Calendar for Custom Date */}
      {showCalendar && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onValueChange={handleCalendarChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showCalendar}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCalendar(false)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          >
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Pick Custom From Date</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="inline"
                onValueChange={handleCalendarChange}
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
    gap: 6,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  placeholderText: {
    color: Colors.gray400,
    fontWeight: Typography.fontWeights.regular,
  },
  rangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryWashStrong,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  rangeBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
  },

  // Modal / Sheet Styles
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
    ...Shadows.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  doneText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.gradientStart,
  },

  optionsList: {
    gap: Spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    backgroundColor: Colors.primaryWash,
    borderColor: Colors.primaryLight + '50',
  },
  optionIconBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionIconBoxSelected: {
    backgroundColor: Colors.primaryWashStrong,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  optionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
  },
  optionTitleSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  defaultTag: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.success,
  },
  optionDates: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radioWrapper: {
    marginLeft: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.xs,
  },
});
