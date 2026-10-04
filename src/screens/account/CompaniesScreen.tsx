import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { ZeelCloudLogo } from '../../components/ZeelCloudLogo';
import { SearchBar } from '../../components/SearchBar';
import { useCompanyStore } from '../../store/companyStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { Company, AppStackParamList } from '../../types';

const TILE_COLORS = [Colors.primary, Colors.primaryLight, Colors.purple500, Colors.success, Colors.warning];

export const CompaniesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { companies, isLoading, fetchCompanies, selectCompany } = useCompanyStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [companies.length, fetchCompanies]);

  const lower = search.toLowerCase();
  const filtered = companies.filter(
    (c) => c.name.toLowerCase().includes(lower) || c.gstinNo?.toLowerCase().includes(lower)
  );

  const handleSelect = (company: Company) => {
    selectCompany(company);
    navigation.navigate('Company');
  };

  const renderItem = ({ item, index }: { item: Company; index: number }) => {
    const color = TILE_COLORS[index % TILE_COLORS.length];
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.8}>
        <View style={[styles.tile, { backgroundColor: `${color}1A` }]}>
          <Icon name="office-building" size={22} color={color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.gstinRow}>
            <Icon name="card-account-details-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.cardGstin}>{item.gstinNo || 'GSTIN not available'}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={22} color={Colors.gray400} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.brandRow}>
          <ZeelCloudLogo size={36} />
          <Text style={styles.brand}>
            ZEEL <Text style={styles.brandLight}>CLOUD</Text>
          </Text>
        </View>
        <Text style={styles.welcome}>Welcome 👋</Text>
        <Text style={styles.title}>Select Company</Text>
        <Text style={styles.subtitle}>Choose a company to continue</Text>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search company..." />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Your Companies</Text>
            <Text style={styles.sectionSub}>Select a company to view its dashboard and data</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchCompanies}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="office-building-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>No companies found</Text>
          </View>
        }
      />
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  brand: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.extraBold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  brandLight: { color: Colors.primaryLight },
  welcome: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  title: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  subtitle: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  searchWrap: { marginTop: Spacing.md },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  listHeader: { paddingVertical: Spacing.md },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  sectionSub: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  gstinRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  cardGstin: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizes.base, color: Colors.textSecondary },
});
