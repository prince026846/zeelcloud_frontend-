import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { LastSyncBadge } from '../../components/LastSyncBadge';
import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useRecentReportsStore } from '../../store/recentReportsStore';
import { relativeTime } from '../../utils/relativeTime';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList } from '../../types';

interface ReportModule {
  label: string;
  desc: string;
  icon: string;
  color: string;
  route: keyof AppStackParamList;
  permissionKey: string;
  /** Extra form names that also unlock this module (OR with permissionKey). */
  permissionKeys?: string[];
  comingSoon?: boolean;
}

const reportModules: ReportModule[] = [
  { label: 'Sales Outstanding', desc: 'Party / broker / area wise', icon: 'currency-inr', color: Colors.success, route: 'SalesOsStack', permissionKey: 'Sales OS' },
  { label: 'Purchase Outstanding', desc: 'Supplier outstanding', icon: 'cart-outline', color: Colors.warning, route: 'PurchaseOsStack', permissionKey: 'Purchase OS' },
  { label: 'GP Outstanding', desc: 'General purchase outstanding', icon: 'file-document-check-outline', color: Colors.purple500, route: 'GpOsStack', permissionKey: 'GP OS' },
  { label: 'Sales Register', desc: 'Sales invoice register', icon: 'receipt', color: Colors.primary, route: 'SalesRegisterStack', permissionKey: 'Sales Register' },
  { label: 'Purchase Register', desc: 'Purchase invoice register', icon: 'clipboard-list-outline', color: Colors.primaryLight, route: 'PurchaseRegisterStack', permissionKey: 'Purchase Register' },
  { label: 'GP Register', desc: 'Job work / processing', icon: 'chart-bar', color: Colors.blue500, route: 'GpRegisterStack', permissionKey: 'GP Register' },
  { label: 'Non-Issue', desc: 'Yarn / beam / gray', icon: 'format-list-text', color: Colors.danger, route: 'StockStack', permissionKey: 'Non-Issue Stock' },
  {
    label: 'Machine Wise Beam Stock',
    desc: 'Coming soon — temporarily unavailable',
    icon: 'cog-outline',
    color: Colors.gray600,
    route: 'MachineWiseStack',
    permissionKey: 'Machine Wise Beam Stock',
    permissionKeys: ['Machine Wise Beam Stock', 'Beam Stock'],
    comingSoon: true,
  },
  { label: 'Bank / Cash Ledger', desc: 'Bank & cash balances', icon: 'bank-outline', color: '#06B6D4', route: 'BankCashLedger', permissionKey: 'Bank Cash Ledger' },
  { label: 'Party Ledger', desc: 'Party-wise balances', icon: 'account-cash-outline', color: '#EC4899', route: 'PartyLedger', permissionKey: 'Party Ledger' },
];

export const ReportsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { selectedCompany } = useCompanyStore();
  const { user } = useAuthStore();
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const { recents, recordReport, clearRecents } = useRecentReportsStore();
  const [editing, setEditing] = useState(false);

  const allowedFormNames = user?.allowedForms?.map(f => f.formName) || [];
  const visibleModules = user?.isSubuser
    ? reportModules.filter((m) => {
        const keys = m.permissionKeys ?? [m.permissionKey];
        return keys.some((k) => allowedFormNames.includes(k));
      })
    : reportModules;

  const visibleRecents = user?.isSubuser
    ? recents.filter(r => visibleModules.some(m => m.route === r.route))
    : recents;

  const openReport = (m: ReportModule) => {
    recordReport({ route: m.route, label: m.label, icon: m.icon, color: m.color });
    navigation.navigate(m.route as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {editing ? 'Tap a module to bookmark it' : selectedCompany?.name ?? 'All reports'}
            </Text>
            <LastSyncBadge />
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing((e) => !e)} activeOpacity={0.8}>
            <Icon name={editing ? 'check' : 'bookmark-outline'} size={15} color={Colors.primary} />
            <Text style={styles.editText}>{editing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {editing ? (
          <View style={styles.hintRow}>
            <Icon name="information-outline" size={16} color={Colors.primary} />
            <Text style={styles.hintText}>Bookmarked modules appear on your Dashboard for quick access.</Text>
          </View>
        ) : null}

        {!editing && visibleRecents.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <View style={styles.recentTitleRow}>
                <Icon name="history" size={16} color={Colors.textSecondary} />
                <Text style={styles.recentTitle}>Recently Opened</Text>
              </View>
              <TouchableOpacity onPress={clearRecents} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {visibleRecents.map((r) => (
                <TouchableOpacity
                  key={r.route}
                  style={styles.recentCard}
                  onPress={() => {
                    recordReport({ route: r.route, label: r.label, icon: r.icon, color: r.color });
                    navigation.navigate(r.route as any);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.recentIcon, { backgroundColor: `${r.color}1A` }]}>
                    <Icon name={r.icon} size={18} color={r.color} />
                  </View>
                  <Text style={styles.recentLabel} numberOfLines={2}>{r.label}</Text>
                  <Text style={styles.recentTime}>{relativeTime(r.at)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.allLabel}>All Reports</Text>
          </View>
        ) : null}

        {visibleModules.map((m) => {
          const marked = bookmarks.includes(m.route);
          return (
            <TouchableOpacity
              key={m.route}
              style={styles.card}
              onPress={() => (editing ? toggleBookmark(m.route) : openReport(m))}
              activeOpacity={0.85}
            >
              <View style={[styles.icon, { backgroundColor: `${m.color}1A` }]}>
                <Icon name={m.icon} size={22} color={m.color} />
              </View>
              <View style={styles.info}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{m.label}</Text>
                  {m.comingSoon ? (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.desc}>{m.desc}</Text>
              </View>
              {editing ? (
                <Icon
                  name={marked ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={marked ? Colors.primary : Colors.gray400}
                />
              ) : (
                <View style={styles.rightNormal}>
                  {marked ? <Icon name="bookmark" size={16} color={Colors.primary} /> : null}
                  <Icon name="chevron-right" size={22} color={Colors.gray400} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderTopWidth: 3,
    borderTopColor: Colors.primaryLight,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: Typography.fontSizes.xl, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  headerSub: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.purple100,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  editText: { fontSize: Typography.fontSizes.sm, color: Colors.primary, fontWeight: Typography.fontWeights.semiBold },
  content: { padding: Spacing.md },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  hintText: { flex: 1, fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  recentSection: { marginBottom: Spacing.sm },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: { fontSize: Typography.fontSizes.xs, color: Colors.primary, fontWeight: Typography.fontWeights.semiBold },
  recentRow: { gap: Spacing.sm, paddingRight: Spacing.md },
  recentCard: {
    width: 108,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  recentIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  recentLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },
  recentTime: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  allLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  label: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  desc: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 1 },
  comingSoonBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    color: '#B45309',
  },
  rightNormal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
