import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { salesOrdersApi } from '../../services/api';
import { useCompanyStore } from '../../store/companyStore';
import { formatCurrency } from '../../utils/currency';
import { toDDMMYYYY } from '../../utils/formatDate';
import type { SalesOrder } from '../../types';

import type { SalesOrderStackParamList } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const SalesOrderListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SalesOrderStackParamList>>();
  const { selectedCompany } = useCompanyStore();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await salesOrdersApi.getAll(selectedCompany?.recordId ? String(selectedCompany.recordId) : undefined);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch sales orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedCompany?.recordId]);

  // Optionally, you might want to refresh when returning from Create/Edit screen.
  // Using useFocusEffect or a simpler listener:
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation, selectedCompany?.recordId]);

  const handleDelete = (id: string | number) => {
    Alert.alert(
      'Delete Sales Order',
      'Are you sure you want to delete this sales order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await salesOrdersApi.delete(String(id));
              setOrders((prev) => prev.filter((o) => String(o.id) !== String(id)));
            } catch (error) {
              console.error('Failed to delete sales order', error);
              Alert.alert('Error', 'Failed to delete sales order');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: SalesOrder }) => {
    const totalQty = item.items?.reduce((sum, i) => sum + (i.qnty || 0), 0) || 0;

    return (
      <View style={styles.card}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.orderNoBadge}>
              <Text style={styles.orderNoText}>Order No: {item.orderNo || 'N/A'}</Text>
            </View>
            <View style={[styles.syncBadge, { backgroundColor: item.is_synced ? Colors.success + '20' : Colors.warning + '20' }]}>
              <Text style={[styles.syncBadgeText, { color: item.is_synced ? Colors.success : Colors.warning }]}>
                {item.is_synced ? 'Synced' : 'Not Synced'}
              </Text>
            </View>
          </View>
          {!item.is_synced && (
            <View style={styles.actionIcons}>
              <TouchableOpacity 
                style={styles.iconButton} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CreateSalesOrder', { orderId: String(item.id) })}
              >
                <Icon name="pencil" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton} 
                activeOpacity={0.7}
                onPress={() => handleDelete(item.id)}
              >
                <Icon name="trash-can-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Grid Section */}
        {/* Row 1 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{item.date ? toDDMMYYYY(item.date) : '-'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Items</Text>
            <Text style={styles.value}>{item.items?.length || 0} Item(s)</Text>
          </View>
          <View style={styles.gridCol} /> {/* Empty column to balance a 3-column grid feel */}
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCol, { flex: 1 }]}>
            <Text style={styles.label}>Party</Text>
            <Text style={[styles.value, styles.valueBold]} numberOfLines={2}>
              {item.partyName}
            </Text>
          </View>
        </View>

        {/* Row 3 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Total Qty</Text>
            <Text style={styles.valueBold}>{totalQty.toFixed(3)}</Text>
          </View>
          <View style={styles.gridCol}>
            {item.discount > 0 ? (
              <>
                <Text style={styles.label}>Discount</Text>
                <Text style={styles.valueBold}>{formatCurrency(item.discount)}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Net Total</Text>
            <Text style={styles.valueBold}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        </View>

        {/* Row 4 (Optional) */}
        {item.remark ? (
          <View style={[styles.gridRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[styles.gridCol, { flex: 1 }]}>
              <Text style={styles.label}>Remarks</Text>
              <Text style={styles.value}>{item.remark}</Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Created Orders</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Icon name="file-document-outline" size={48} color={Colors.gray300} />
          <Text style={styles.emptyText}>No sales orders found.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.md }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    shadowColor: Colors.primary,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  orderNoBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  orderNoText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  syncBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  syncBadgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: 4,
  },
  gridRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  gridCol: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  valueBold: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.semiBold,
  },
});
