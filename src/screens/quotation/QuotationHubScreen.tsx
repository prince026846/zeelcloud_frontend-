import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { useCompanyStore } from '../../store/companyStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { QuotationStackParamList } from '../../types';

export const QuotationHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<QuotationStackParamList>>();
  const { selectedCompany } = useCompanyStore();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Quotation Management</Text>
          <Text style={styles.headerSub}>{selectedCompany?.name || 'All Companies'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('QuotationList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="format-list-bulleted" size={30} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>View Quotations</Text>
            <Text style={styles.cardSubtitle}>Browse, preview PDF, search, email and share existing quotations</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreateQuotation')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="plus-box-multiple-outline" size={30} color={Colors.success} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Create Quotation</Text>
            <Text style={styles.cardSubtitle}>Draft a new quotation, calculate taxes and generate instant PDF</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('QuotationItemMaster')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="package-variant-closed" size={30} color={Colors.warning} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Item Master Catalog</Text>
            <Text style={styles.cardSubtitle}>Manage quotation products, MRP, GST %, and upload product images</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.gray400} />
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
