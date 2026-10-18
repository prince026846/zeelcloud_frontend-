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
import { quotationsApi } from '../../services/api';
import { toDDMMYYYY } from '../../utils/formatDate';
import { openQuotationPdfPreview, shareQuotationPdfFile } from '../../utils/quotationPdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { QuotationStackParamList, Quotation } from '../../types';

export const QuotationListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<QuotationStackParamList>>();
  const { selectedCompany } = useCompanyStore();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotationsApi.getAll({
        company_id: selectedCompany?.recordId,
      });
      setQuotations(data);
    } catch (error) {
      console.error('Failed to load quotations:', error);
      Alert.alert('Error', 'Unable to fetch quotations list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompany?.recordId]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuotations();
  };

  const filteredQuotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter(
      (item) =>
        item.quotationNo.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q)
    );
  }, [quotations, searchQuery]);

  const handlePreviewPdf = (item: Quotation) => {
    openQuotationPdfPreview(item, selectedCompany);
  };

  const handleSharePdf = async (item: Quotation) => {
    try {
      await shareQuotationPdfFile(item, selectedCompany);
    } catch (err) {
      Alert.alert('Share Error', 'Could not share Quotation PDF.');
    }
  };

  const handleDelete = (item: Quotation) => {
    Alert.alert(
      'Delete Quotation',
      `Are you sure you want to delete quotation ${item.quotationNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await quotationsApi.delete(item.id);
              setQuotations((prev) => prev.filter((q) => q.id !== item.id));
              Alert.alert('Deleted', `Quotation ${item.quotationNo} has been deleted.`);
            } catch (err) {
              console.error('Failed to delete quotation:', err);
              Alert.alert('Error', 'Could not delete quotation.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Quotation }) => {
    const itemCount = item.items ? item.items.length : 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('QuotationDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.quotationNo}>{item.quotationNo}</Text>
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
            onPress={() => navigation.navigate('CreateQuotation', { quotation: item })}
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
            <Text style={styles.headerTitle}>Quotations</Text>
            <Text style={styles.headerSub}>{selectedCompany?.name || 'All Companies'}</Text>
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateQuotation')}
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
            placeholder="Search by quote # or customer name..."
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading quotations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredQuotations}
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
              title="No Quotations Found"
              message={
                searchQuery
                  ? 'No quotations match your search query.'
                  : 'Create your first quotation with automatic numbering and PDF generation.'
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
  quotationNo: {
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
