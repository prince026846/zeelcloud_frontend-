import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { CompanyStrip } from '../../components/CompanyStrip';
import { useAuthStore } from '../../store/authStore';
import { useCompanyStore } from '../../store/companyStore';
import { stockApi } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, StockStackParamList, StockItem } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<StockStackParamList, 'Stock'>;
};

interface StockReport {
  label: string;
  desc: string;
  category: StockItem['category'];
  icon: string;
  accent: string;
  report: 'yarn' | 'gray' | 'beam';
  permissionKey: string;
}

const reports: StockReport[] = [
  { label: 'Yarn Stock', desc: 'Cotton, polyester, viscose & silk yarn', category: 'yarn', icon: 'needle', accent: Colors.primary, report: 'yarn', permissionKey: 'Yarn Stock' },
  { label: 'Gray Stock', desc: 'Undyed / gray fabric inventory', category: 'nonIssue', icon: 'package-variant-closed', accent: Colors.success, report: 'gray', permissionKey: 'Non-Issue Stock' },
  { label: 'Beam Stock', desc: 'Warp beams on the loom floor', category: 'beam', icon: 'layers', accent: Colors.primaryLight, report: 'beam', permissionKey: 'Beam Stock' },
];

export const StockScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const appNav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  useEffect(() => {
    // Prefetch stock reports so they open instantly (utilizing the cache in api.ts)
    stockApi.getByCategory('yarn', selectedCompany?.id).catch(() => {});
    stockApi.getByCategory('nonIssue', selectedCompany?.id, 'quality', 'gray').catch(() => {});
    stockApi.getByCategory('beam', selectedCompany?.id).catch(() => {});
  }, [selectedCompany?.id]);

  const allowedFormNames = user?.allowedForms?.map(f => f.formName) || [];
  const visibleReports = user?.isSubuser
    ? reports.filter(r => allowedFormNames.includes(r.permissionKey))
    : reports;

  const canOpenMachineWise =
    !user?.isSubuser ||
    allowedFormNames.includes('Machine Wise Beam Stock') ||
    allowedFormNames.includes('Beam Stock');

  return (
    <View style={styles.container}>
      <GradientHeader title="Stock" subtitle="Inventory reports" />
      <CompanyStrip />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>Select a report to view its inventory</Text>

        {visibleReports.map((r) => {
          return (
            <TouchableOpacity
              key={r.report}
              style={styles.card}
              onPress={() => navigation.navigate('StockFilter', { report: r.report })}
              activeOpacity={0.85}
            >
              <View style={[styles.icon, { backgroundColor: `${r.accent}1A` }]}>
                <Icon name={r.icon} size={24} color={r.accent} />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.desc}>{r.desc}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={Colors.gray400} />
            </TouchableOpacity>
          );
        })}

        {canOpenMachineWise ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => appNav.navigate('MachineWiseStack')}
            activeOpacity={0.85}
          >
            <View style={[styles.icon, { backgroundColor: `${Colors.purple600}1A` }]}>
              <Icon name="cog-outline" size={24} color={Colors.purple600} />
            </View>
            <View style={styles.info}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Machine Wise Beam Stock</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={styles.desc}>Temporarily unavailable — opening shows Coming Soon</Text>
            </View>
            <Icon name="chevron-right" size={22} color={Colors.gray400} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  hint: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  icon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  label: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  desc: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 1 },
  comingSoonBadge: {
    backgroundColor: Colors.lightWash,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  stats: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeights.medium, marginTop: 6 },
});
