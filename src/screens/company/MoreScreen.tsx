import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { useCompanyStore } from '../../store/companyStore';
import { getInitials } from '../../utils/strings';
import { Colors, Typography, Spacing } from '../../theme';
import type { AppStackParamList } from '../../types';

interface MoreItem {
  icon: string;
  label: string;
  onPress: () => void;
}

export const MoreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user, deactivateSession, refreshProfile } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleDeactivate = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => deactivateSession() },
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  const handleSwitchAccount = () => {
    // Cast to any to bypass the AppStackParamList typing since it bubbles up to RootNavigator
    (navigation as any).navigate('AccountSwitcher');
  };

  const items: MoreItem[] = [
    { icon: 'swap-horizontal', label: 'Switch Company', onPress: () => navigation.navigate('AccountTabs') },
    { icon: 'account-group-outline', label: 'Sub Users', onPress: () => navigation.navigate('AccountTabs') },
    { icon: 'refresh', label: isRefreshing ? 'Syncing...' : 'Sync Profile & Permissions', onPress: handleRefresh },
    { icon: 'information-outline', label: 'About ZeelCloud', onPress: () => navigation.navigate('About') },
    { icon: 'phone-outline', label: 'Contact Us', onPress: () => navigation.navigate('Contact') },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name ? getInitials(user.name) : 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.userCompany} numberOfLines={1}>{selectedCompany?.name ?? 'ZeelCloud'}</Text>
          </View>
        </Card>

        <Card style={styles.listCard}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.row, idx === items.length - 1 && styles.rowLast]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Icon name={item.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </Card>

        <PrimaryButton title="Switch Account" icon="account-switch" onPress={handleSwitchAccount} style={styles.switchButton} />
        <PrimaryButton title="Sign Out of this Account" icon="logout" variant="danger" onPress={handleDeactivate} style={styles.logout} />
      </ScrollView>
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
  headerTitle: { fontSize: Typography.fontSizes.xl, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  content: { padding: Spacing.md },
  userCard: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  userInfo: { flex: 1 },
  userName: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  userCompany: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 1 },
  listCard: { padding: 0, overflow: 'hidden', marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowLabel: { flex: 1, fontSize: Typography.fontSizes.base, color: Colors.textPrimary, fontWeight: Typography.fontWeights.medium },
  switchButton: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  logout: { marginTop: 0 },
});
