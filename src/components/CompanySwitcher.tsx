import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from './ZIcon';
import { useCompanyStore } from '../store/companyStore';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import type { AppStackParamList, Company } from '../types';

// Global company (customer/account) switcher — dropdown pill + picker modal.
export const CompanySwitcher: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { companies, selectedCompany, selectCompany } = useCompanyStore();
  const [open, setOpen] = useState(false);

  const initial = selectedCompany?.name?.charAt(0).toUpperCase() ?? 'Z';

  const choose = (c: Company) => {
    selectCompany(c);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={styles.tile}>
          <Text style={styles.tileText}>{initial}</Text>
        </View>
        <View style={styles.pillInfo}>
          <Text style={styles.pillLabel}>Company</Text>
          <Text style={styles.pillName} numberOfLines={1}>
            {selectedCompany?.name ?? 'Select Company'}
          </Text>
        </View>
        <Icon name="chevron-down" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Switch Company</Text>
            <FlatList
              data={companies}
              keyExtractor={(c) => c.id}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item.id === selectedCompany?.id;
                return (
                  <TouchableOpacity style={styles.row} onPress={() => choose(item)} activeOpacity={0.7}>
                    <View style={[styles.rowTile, active && styles.rowTileActive]}>
                      <Text style={[styles.rowTileText, active && styles.rowTileTextActive]}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, active && styles.rowNameActive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowCity}>{item.city}</Text>
                    </View>
                    {active ? <Icon name="check-circle" size={20} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => {
                setOpen(false);
                navigation.navigate('AccountTabs');
              }}
              activeOpacity={0.8}
            >
              <Icon name="office-building-cog-outline" size={18} color={Colors.primary} />
              <Text style={styles.manageText}>View all companies</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.purple100,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileText: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textWhite },
  pillInfo: { flex: 1 },
  pillLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted },
  pillName: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },

  backdrop: { flex: 1, backgroundColor: 'rgba(66,64,150,0.45)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  sheet: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, maxHeight: '70%', borderWidth: 1, borderColor: Colors.hairline },
  sheetTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  rowTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: Colors.lightWash,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTileActive: { backgroundColor: Colors.primaryLight },
  rowTileText: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textSecondary },
  rowTileTextActive: { color: Colors.primary },
  rowInfo: { flex: 1 },
  rowName: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },
  rowNameActive: { color: Colors.primary },
  rowCity: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  manageText: { fontSize: Typography.fontSizes.base, color: Colors.primary, fontWeight: Typography.fontWeights.semiBold },
});
