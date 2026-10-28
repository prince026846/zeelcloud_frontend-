import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';

interface EntryOption {
  key: 'order' | 'quotation' | 'proforma';
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}

export const EntryHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedCompany } = useCompanyStore();
  const { user } = useAuthStore();

  const isOwner = !user?.isSubuser;
  const allowedForms = user?.allowedForms || [];

  const hasSalesOrderAccess = isOwner || user?.isSalesOrderCreationAllowed === true;
  const hasQuotationAccess =
    isOwner ||
    allowedForms.some((f) => f.id === 14 || f.formName === 'Quotation' || f.formName === 'Quotations');
  const hasProformaAccess =
    isOwner ||
    allowedForms.some(
      (f) =>
        f.id === 15 ||
        f.formName === 'Proforma Invoice' ||
        f.formName === 'Pro Forma Invoice' ||
        f.formName === 'Performa' ||
        f.formName === 'Performa Invoice'
    );

  const options: EntryOption[] = [];

  if (hasSalesOrderAccess) {
    options.push({
      key: 'order',
      title: 'Order',
      subtitle: 'Create & manage client sales orders',
      icon: 'file-document-outline',
      iconBg: '#EFF6FF',
      iconColor: Colors.primary,
      onPress: () => navigation.navigate('SalesOrderStack'),
    });
  }

  if (hasQuotationAccess) {
    options.push({
      key: 'quotation',
      title: 'Quotation',
      subtitle: 'Draft quotes, items & instant PDF preview',
      icon: 'clipboard-text-outline',
      iconBg: '#EEF2FF',
      iconColor: '#6366F1',
      onPress: () => navigation.navigate('QuotationStack'),
    });
  }

  if (hasProformaAccess) {
    options.push({
      key: 'proforma',
      title: 'Performa',
      subtitle: 'Pro Forma Invoice creation, numbering & dispatch',
      icon: 'file-document-edit-outline',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      onPress: () => navigation.navigate('ProformaInvoiceStack'),
    });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Entry</Text>
          <Text style={styles.headerSub}>{selectedCompany?.name || 'All Companies'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeading}>Select Entry Type</Text>

        {options.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="lock-outline" size={40} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>No Entry Access</Text>
            <Text style={styles.emptyDesc}>
              You do not currently have permissions enabled for Order, Quotation, or Performa.
            </Text>
          </View>
        ) : (
          options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.card}
              activeOpacity={0.85}
              onPress={opt.onPress}
            >
              <View style={[styles.iconWrap, { backgroundColor: opt.iconBg }]}>
                <Icon name={opt.icon} size={28} color={opt.iconColor} />
              </View>
              <View style={styles.cardText}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  {opt.badge ? <Text style={styles.badge}>{opt.badge}</Text> : null}
                </View>
                <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.gray400} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  headerContent: {
    gap: 2,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeading: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  badge: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.primary,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
