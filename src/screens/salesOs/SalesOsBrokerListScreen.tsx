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
import type { SalesOsStackParamList, SalesOsBroker } from '../../types';
import { toDDMMYYYY } from '../../utils/formatDate';
import {
  buildOutstandingReminderMessage,
  openSmsReminder,
  openWhatsAppReminder,
} from '../../utils/outstandingReminder';

type Props = {
  navigation: NativeStackNavigationProp<SalesOsStackParamList, 'SalesOsBrokerList'>;
  route: RouteProp<SalesOsStackParamList, 'SalesOsBrokerList'>;
};

const money = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

// OG "Sales O/s Broker Summary": company strip → info frame (Total O/s Amount,
// From/To, Search Broker + Common Company) → Broker Name | Amount table with
// phone + call / SMS / WhatsApp actions on every row.
export const SalesOsBrokerListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { selectedCompany } = useCompanyStore();
  const [brokers, setBrokers] = useState<SalesOsBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [commonCompany, setCommonCompany] = useState(false);

  useEffect(() => {
    setLoading(true);
    const filter = { ...route.params.filter, commonCompany, companyId: selectedCompany?.id };
    salesOsApi.getBrokers(filter).then((data) => {
      setBrokers(data);
      setLoading(false);
    })
      .catch(() => setLoading(false));
  }, [commonCompany, selectedCompany?.id]);

  const lowerSearch = search.toLowerCase();
  const filtered = brokers.filter((b) => b.name.toLowerCase().includes(lowerSearch));
  const totalOs = brokers.reduce((sum, b) => sum + b.totalOs, 0);

  const fromDate = route.params.filter?.fromDate;
  const toDate = route.params.filter?.toDate;

  const call = (phone?: string) => phone && Linking.openURL(`tel:${phone}`).catch(() => {});
  const reminder = (name: string, amount: number) =>
    buildOutstandingReminderMessage({ recipientName: name, amount, company: selectedCompany });

  const renderItem = ({ item }: { item: SalesOsBroker }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('SalesOsBrokerDetail', {
        brokerId: item.id,
        brokerName: item.name,
        filter: { ...route.params.filter, commonCompany, companyId: selectedCompany?.id },
      })}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.brokerName} numberOfLines={1}>{item.name}</Text>
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
            style={[styles.actionBtn, styles.waActionBtn]}
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
      <GradientHeader title="Sales O/s Broker Summary" onBack={() => navigation.goBack()} />
      <CompanyStrip />

      {/* OG info frame: total + period + search + Common Company */}
      <View style={styles.infoFrame}>
        <Text style={styles.totalLine}>Total O/s Amount : ₹ {money(totalOs)}</Text>
        {fromDate || toDate ? (
          <Text style={styles.periodLine}>
            From: {toDDMMYYYY(fromDate)}   To: {toDDMMYYYY(toDate)}
          </Text>
        ) : null}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search Broker" />
        <View style={styles.commonRow}>
          <Text style={styles.commonLabel}>Common Company</Text>
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

      {/* Table header: Broker Name | Amount */}
      <View style={styles.tableHeader}>
        <Text style={styles.th}>Broker Name</Text>
        <Text style={[styles.th, styles.thRight]}>Amount</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <EmptyState icon="handshake-outline" title="No brokers found" /> : null}
      />
      <LoadingOverlay visible={loading} message="Loading brokers..." />
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
  commonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 },
  commonLabel: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
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
  brokerName: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  phone: { fontSize: Typography.fontSizes.xs, fontStyle: 'italic', color: Colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  actionRow: { flexDirection: 'row', gap: 6 },
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
  waActionBtn: { borderColor: Colors.whatsapp, backgroundColor: Colors.whatsappLight },
});
