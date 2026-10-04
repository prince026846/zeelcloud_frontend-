import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ledgerApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { getInitials } from '../../utils/strings';
import { formatCurrency } from '../../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, PartyLedgerAccount } from '../../types';

export const PartyLedgerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { selectedCompany } = useCompanyStore();
  const [parties, setParties] = useState<PartyLedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipZero, setSkipZero] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    ledgerApi.getPartyLedger({
      reportType: 'party',
      fromDate: '',
      toDate: '',
      companyId: selectedCompany?.id,
    })
      .then((data) => {
        setParties(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedCompany?.id]);

  const lowerSearch = search.toLowerCase();
  const visible = parties
    .filter((p) => (skipZero ? p.balance !== 0 : true))
    .filter((p) => p.name.toLowerCase().includes(lowerSearch));

  const renderItem = ({ item }: { item: PartyLedgerAccount }) => {
    const positive = item.balance >= 0;
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PartyLedgerDetail', { 
          accountId: item.id, 
          title: item.name, 
        })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity
            style={styles.phoneRow}
            onPress={() => Alert.alert('Call', `Calling ${item.phone}`)}
            activeOpacity={0.7}
          >
            <Icon name="phone-outline" size={12} color={Colors.call} />
            <Text style={styles.phone}>{item.phone}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.balanceBox}>
          <Text style={[styles.balance, { color: positive ? Colors.moneyIn : Colors.moneyOut }]}>
            {formatCurrency(Math.abs(item.balance))}
          </Text>
          <Text style={styles.drcr}>{item.balance === 0 ? '—' : positive ? 'Dr' : 'Cr'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Party Ledger" onBack={() => navigation.goBack()} />
      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>Skip Zero Balances</Text>
        <Switch
          value={skipZero}
          onValueChange={setSkipZero}
          trackColor={{ false: Colors.gray300, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>
      <View style={styles.searchWrapper}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search parties..." />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <EmptyState icon="account-search" title="No parties found" /> : null}
      />
      <LoadingOverlay visible={loading} message="Loading..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolbarText: { fontSize: Typography.fontSizes.sm, color: Colors.textPrimary, fontWeight: Typography.fontWeights.medium },
  searchWrapper: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  phone: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  balanceBox: { alignItems: 'flex-end' },
  balance: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold },
  drcr: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted, marginTop: 1 },
});
