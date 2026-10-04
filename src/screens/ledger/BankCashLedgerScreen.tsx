import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { ledgerApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { formatCurrency } from '../../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { AppStackParamList, BankAccount } from '../../types';

const getAccountSubtitle = (name: string, accountNo?: string) => {
  if (accountNo) return `•••• ${accountNo.slice(-4)}`;
  return /cash/i.test(name) ? 'Cash Account' : 'Bank Account';
};

export const BankCashLedgerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { selectedCompany } = useCompanyStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipZero, setSkipZero] = useState(false);

  useEffect(() => {
    ledgerApi.getBankAccounts(selectedCompany?.id)
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedCompany?.id]);

  const visible = skipZero ? accounts.filter((a) => a.amount !== 0) : accounts;

  const renderItem = ({ item }: { item: BankAccount }) => {
    const positive = item.amount >= 0;
    const isCash = /cash/i.test(item.name);
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BankCashLedgerDetail', { 
          accountId: item.id, 
          title: item.name, 
        })}
      >
        <View style={[styles.icon, { backgroundColor: positive ? Colors.successLight : Colors.dangerLight }]}>
          <Icon name={isCash ? 'cash' : 'bank-outline'} size={22} color={positive ? Colors.success : Colors.danger} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.acc}>{getAccountSubtitle(item.name, item.accountNo)}</Text>
        </View>
        <Text style={[styles.balance, { color: positive ? Colors.success : Colors.danger }]}>
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Bank / Cash Ledger" onBack={() => navigation.goBack()} />
      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>Skip Zero Balances</Text>
        <Switch
          value={skipZero}
          onValueChange={setSkipZero}
          trackColor={{ false: Colors.gray300, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <EmptyState icon="bank-outline" title="No accounts found" /> : null}
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
  list: { padding: Spacing.md },
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
  name: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  acc: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 1 },
  balance: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold },
});
