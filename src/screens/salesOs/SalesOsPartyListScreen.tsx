import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, Linking, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { CompanyStrip } from '../../components/CompanyStrip';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { salesOsApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { SalesOsStackParamList, SalesOsParty } from '../../types';
import { toDDMMYYYY } from '../../utils/formatDate';
import {
  buildOutstandingReminderMessage,
  openSmsReminder,
  openWhatsAppReminder,
} from '../../utils/outstandingReminder';

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsPartyList'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsPartyList'>;
};

const money = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

// OG "Sales O/s Party Wise Summary": company strip → info frame (Total O/s,
// From/To, search, Only Due + Common Company) → Party Name | Amount table.
// Rows show the party name, address and mobile with call / WhatsApp actions.
export const SalesOsPartyListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { selectedCompany } = useCompanyStore();
  const [parties, setParties] = useState<SalesOsParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [commonCompany, setCommonCompany] = useState(false);

  // Re-fetch whenever a toggle changes (mirrors the OG getSummary() re-fetch).
  useEffect(() => {
    setLoading(true);
    const filter = { ...route.params.filter, onlyDue, commonCompany, companyId: String(selectedCompany?.recordId || selectedCompany?.id) };
    salesOsApi.getParties(filter).then((data) => {
      setParties(data);
      setLoading(false);
    })
      .catch(() => setLoading(false));
  }, [onlyDue, commonCompany, selectedCompany?.recordId, selectedCompany?.id]);

  const lowerSearch = search.toLowerCase();
  const filtered = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerSearch) ||
      p.city.toLowerCase().includes(lowerSearch),
  );

  const totalOs = parties.reduce((sum, p) => sum + p.totalOs, 0);
  const fromDate = route.params.filter?.fromDate;
  const toDate = route.params.filter?.toDate;

  const call = (phone?: string) => phone && Linking.openURL(`tel:${phone}`).catch(() => {});
  const reminder = (name: string, amount: number) =>
    buildOutstandingReminderMessage({ recipientName: name, amount, company: selectedCompany });

  const renderItem = ({ item }: { item: SalesOsParty }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('SalesOsPartyDetail', {
        partyId: item.id,
        partyName: item.name,
        filter: { ...route.params.filter, onlyDue, commonCompany, companyId: String(selectedCompany?.recordId || selectedCompany?.id) },
      })}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.partyName} numberOfLines={1}>{item.name}</Text>
        {item.city ? <Text style={styles.address} numberOfLines={2}>{item.city}</Text> : null}
        {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>₹ {money(item.totalOs)}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => call(item.phone)} activeOpacity={0.7}>
            <Icon name="phone" size={14} color={Colors.call} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.smsBtn]}
            onPress={() => openSmsReminder(item.phone, reminder(item.name, item.totalOs))}
            activeOpacity={0.7}
          >
            <Icon name="message-text-outline" size={14} color={Colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.waBtn]}
            onPress={() => openWhatsAppReminder(item.phone, reminder(item.name, item.totalOs))}
            activeOpacity={0.7}
          >
            <Icon name="whatsapp" size={14} color={Colors.whatsapp} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <GradientHeader title="Sales O/s Party Wise Summary" onBack={() => navigation.goBack()} />
      <CompanyStrip />

      {/* OG info frame: total + period + search + toggles */}
      <View style={styles.infoFrame}>
        <Text style={styles.totalLine}>Total O/s Amount : ₹ {money(totalOs)}</Text>
        {fromDate || toDate ? (
          <Text style={styles.periodLine}>
            From: {toDDMMYYYY(fromDate)}   To: {toDDMMYYYY(toDate)}
          </Text>
        ) : null}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search Party" />
        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>Only Due</Text>
            <Switch
              value={onlyDue}
              onValueChange={setOnlyDue}
              trackColor={{ false: Colors.gray300, true: Colors.primary }}
              thumbColor={Colors.surface}
              ios_backgroundColor={Colors.gray300}
              style={styles.switch}
            />
          </View>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>Common Company</Text>
            <Switch
              value={commonCompany}
              onValueChange={setCommonCompany}
              trackColor={{ false: Colors.gray300, true: Colors.primary }}
              thumbColor={Colors.surface}
              ios_backgroundColor={Colors.gray300}
              style={styles.switch}
            />
          </View>
        </View>
      </View>

      {/* Table header: Party Name | Amount */}
      <View style={styles.tableHeader}>
        <Text style={styles.th}>Party Name</Text>
        <Text style={[styles.th, styles.thRight]}>Amount</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? <EmptyState icon="account-search" title="No parties found" subtitle="Try adjusting your search" /> : null
        }
      />
      <LoadingOverlay visible={loading} message="Loading parties..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  infoFrame: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalLine: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  periodLine: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary, marginTop: 2, marginBottom: Spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginTop: 2 },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  toggleLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  switch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightWash,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  th: { fontSize: 10, fontWeight: Typography.fontWeights.semiBold, color: Colors.textSecondary },
  thRight: { textAlign: 'right' },
  list: { paddingBottom: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLeft: { flex: 1, paddingRight: Spacing.sm },
  partyName: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  address: { fontSize: 9, color: Colors.textSecondary, marginTop: 2 },
  phone: { fontSize: 9, fontStyle: 'italic', color: Colors.textSecondary, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.gradientStart },
  actionRow: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 28,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: { borderColor: Colors.call, backgroundColor: Colors.callLight },
  smsBtn: { borderColor: Colors.info, backgroundColor: Colors.infoLight },
  waBtn: { borderColor: Colors.whatsapp, backgroundColor: Colors.whatsappLight },
});
