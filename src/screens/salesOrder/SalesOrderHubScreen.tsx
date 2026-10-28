import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import type { SalesOrderStackParamList } from '../../types';

export const SalesOrderHubScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SalesOrderStackParamList>>();
  const hasAccess = useAuthStore((s) => s.user?.isSalesOrderCreationAllowed === true);

  useEffect(() => {
    if (!hasAccess) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('Dashboard');
      }
    }
  }, [hasAccess, navigation]);

  if (!hasAccess) {
    return null;
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation.getParent()?.canGoBack()) {
      navigation.getParent()?.goBack();
    } else {
      (navigation as any).navigate('Company', { screen: 'Entry' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Orders</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SalesOrderList')}
        >
          <View style={styles.iconWrap}>
            <Icon name="format-list-bulleted" size={32} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>See Created Orders</Text>
            <Text style={styles.cardSubtitle}>View all sales orders for the selected company</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateSalesOrder')}
        >
          <View style={styles.iconWrap}>
            <Icon name="plus-box-multiple-outline" size={32} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Create Sales Order</Text>
            <Text style={styles.cardSubtitle}>Draft and submit a new sales order</Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.md,
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
    shadowColor: Colors.primary,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
});
