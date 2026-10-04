import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { OutstandingToggleBar } from '../../components/OutstandingToggleBar';
import { salesOsApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { SalesOsStackParamList, SalesOsSalesPerson } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/currency';

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsSalesPersonList'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsSalesPersonList'>;
};


export const SalesOsSalesPersonListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { selectedCompany } = useCompanyStore();
  const [persons, setPersons] = useState<SalesOsSalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [commonCompany, setCommonCompany] = useState(false);

  // Re-fetch whenever a toggle changes (mirrors the OG getSummary() re-fetch).
  useEffect(() => {
    setLoading(true);
    const filter = { ...route.params.filter, onlyDue, commonCompany, companyId: selectedCompany?.id };
    salesOsApi.getSalesPersons(filter).then((data) => {
      setPersons(data);
      setLoading(false);
    })
      .catch(() => setLoading(false));
  }, [onlyDue, commonCompany, selectedCompany?.id]);

  const filtered = persons.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: SalesOsSalesPerson }) => {
    const achievePct = item.target ? Math.min(100, (item.totalOs / item.target) * 100) : 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SalesOsSalesPersonDetail', {
          salesPersonId: item.id,
          salesPersonName: item.name,
          filter: { ...route.params.filter, onlyDue, commonCompany, companyId: selectedCompany?.id },
        })}
        activeOpacity={0.85}
      >
        <View style={styles.avatar}>
          <Icon name="account-tie" size={22} color={Colors.textWhite} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.amount}>{formatCurrency(item.totalOs)}</Text>
          </View>
          <Text style={styles.meta}>{item.partyCount} parties</Text>
          {item.target != null && item.target > 0 ? (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${achievePct}%` }]} />
              </View>
              <Text style={styles.achieveText}>
                {formatPercent(achievePct)}% of target ({formatCurrency(item.target)})
              </Text>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Sales OS" subtitle="Sales Person Wise" onBack={() => navigation.goBack()} />
      <OutstandingToggleBar
        onlyDue={onlyDue}
        commonCompany={commonCompany}
        onOnlyDueChange={setOnlyDue}
        onCommonCompanyChange={setCommonCompany}
      />
      <View style={styles.searchWrapper}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search persons..." />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="account-search" title="No sales persons found" />}
      />
      <LoadingOverlay visible={loading} message="Loading..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrapper: { padding: Spacing.md, paddingBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },
  amount: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
  meta: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginBottom: 8 },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gradientStart,
    borderRadius: 3,
  },
  achieveText: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
});
