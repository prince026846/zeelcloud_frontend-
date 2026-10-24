import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useCompanyStore } from '../../store/companyStore';
import { proformaInvoicesApi } from '../../services/api';
import { toDDMMYYYY } from '../../utils/formatDate';
import { openProformaInvoicePdfPreview, shareProformaInvoicePdfFile } from '../../utils/proformaInvoicePdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { ProformaInvoiceStackParamList, ProformaInvoice } from '../../types';

export const ProformaInvoiceListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProformaInvoiceStackParamList>>();
  const { selectedCompany } = useCompanyStore();

  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await proformaInvoicesApi.getAll({
        company_id: selectedCompany?.recordId,
      });
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load proforma invoices:', error);
      Alert.alert('Error', 'Unable to fetch pro forma invoices list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompany?.recordId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (item) =>
        item.invoiceNo.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  const handlePreviewPdf = (item: ProformaInvoice) => {
    openProformaInvoicePdfPreview(item, selectedCompany);
  };

  const handleSharePdf = async (item: ProformaInvoice) => {
    try {
      await shareProformaInvoicePdfFile(item, selectedCompany);
    } catch (err) {
      Alert.alert('Share Error', 'Could not share Pro Forma Invoice PDF.');
    }
  };

  const handleDelete = (item: ProformaInvoice) => {
    Alert.alert(
      'Delete Pro Forma Invoice',
      `Are you sure you want to delete invoice ${item.invoiceNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await proformaInvoicesApi.delete(item.id);
              setInvoices((prev) => prev.filter((q) => q.id !== item.id));
              Alert.alert('Deleted', `Pro Forma Invoice ${item.invoiceNo} has been deleted.`);
            } catch (err) {
              console.error('Failed to delete proforma invoice:', err);
              Alert.alert('Error', 'Could not delete pro forma invoice.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ProformaInvoice }) => {
    const itemCount = item.items ? item.items.length : 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProformaInvoiceDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.invoiceNo}>{item.invoiceNo}</Text>
            <Text style={styles.dateText}>{toDDMMYYYY(item.date)}</Text>
          </View>
          <View style={styles.amountWrap}>
            <Text style={styles.amountText}>₹ {item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.itemCountText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          </View>
        </View>

        <View style={styles.partyRow}>
          <Icon name="account-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.partyName} numberOfLines={1}>
            {item.partyName || 'Counter Customer'}
          </Text>
        </View>

        {item.remark ? (
          <Text style={styles.remarkText} numberOfLines={1}>
            {item.remark}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handlePreviewPdf(item)}
            activeOpacity={0.7}
          >
            <Icon name="file-pdf-box" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleSharePdf(item)}
            activeOpacity={0.7}
          >
            <Icon name="share-variant-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateProformaInvoice', { invoice: item })}
            activeOpacity={0.7}
          >
            <Icon name="pencil-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <Icon name="trash-can-outline" size={16} color={Colors.danger} />
            <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Pro Forma Invoices</Text>
            <Text style={styles.headerSub}>{selectedCompany?.name || 'All Companies'}</Text>
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateProformaInvoice')}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={18} color="#ffffff" />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by invoice # or customer name..."
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading pro forma invoices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="No Pro Forma Invoices Found"
              message={
                searchQuery
                  ? 'No invoices match your search query.'
                  : 'Create your first pro forma invoice with automatic numbering and PDF generation.'
              }
            />
          }
        />
      )}
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
  },
  searchWrap: {
    marginTop: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNo: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  itemCountText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  partyName: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
    flex: 1,
  },
  remarkText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  actionText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
  },
});
