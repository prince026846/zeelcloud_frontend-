import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { SearchBar } from '../../components/SearchBar';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useSubUserStore } from '../../store/subUserStore';
import { useAuthStore } from '../../store/authStore';
import { confirmAction, showAlert } from '../../utils/alert';
import { getInitials } from '../../utils/strings';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { SubUser, SubUserStackParamList } from '../../types';

export const SubUserListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SubUserStackParamList>>();
  const { subUsers, isLoading, loaded, fetchSubUsers, deactivateSubUserViaAPI } = useSubUserStore();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const isAdmin = user?.isSubuser === false && user.parentUserId === null;

  useEffect(() => {
    if (isAdmin && !loaded) fetchSubUsers();
  }, [isAdmin, loaded, fetchSubUsers]);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={styles.headerTitle}>Sub User Management</Text>
        </View>
        <View style={styles.restricted}>
          <Icon name="shield-lock-outline" size={48} color={Colors.gray300} />
          <Text style={styles.restrictedTitle}>Admin access required</Text>
          <Text style={styles.restrictedText}>Only an admin or super user can view and manage sub users.</Text>
        </View>
      </View>
    );
  }

  const lower = search.toLowerCase();
  const filtered = subUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(lower) ||
      u.username.toLowerCase().includes(lower),
  );

  const confirmDeactivate = (subUser: SubUser) => {
    if (!subUser.isActive) return;

    confirmAction(
      'Deactivate Sub User',
      `Deactivate ${subUser.name}? They will no longer be able to sign in.`,
      async () => {
        setDeactivatingId(subUser.id);
        try {
          await deactivateSubUserViaAPI(subUser.id);
          showAlert('Sub User Deactivated', `${subUser.name} has been deactivated.`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate sub user';
          showAlert('Deactivate Failed', errorMessage);
        } finally {
          setDeactivatingId(null);
        }
      },
      { confirmText: 'Deactivate', destructive: true },
    );
  };

  const renderItem = ({ item }: { item: SubUser }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.mainPress}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('SubUserDetail', { userId: item.id })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? Colors.success : Colors.gray400 }]} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
          <Text style={styles.company} numberOfLines={1}>{item.companyName || '—'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.viewBtn]}
          onPress={() => navigation.navigate('SubUserDetail', { userId: item.id })}
          activeOpacity={0.7}
        >
          <Icon name="eye-outline" size={18} color={Colors.blue600} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate('EditSubUser', { userId: item.id })}
          activeOpacity={0.7}
        >
          <Icon name="pencil-outline" size={18} color={Colors.warning} />
        </TouchableOpacity>
        {item.isActive ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => confirmDeactivate(item)}
            activeOpacity={0.7}
            disabled={deactivatingId === item.id}
          >
            <Icon name="account-off-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Sub User Management</Text>
        <Text style={styles.headerSub}>Manage and control access for your sub users</Text>
        <PrimaryButton
          title="Create New Sub User"
          icon="account-plus-outline"
          onPress={() => navigation.navigate('CreateSubUser')}
          style={styles.createBtn}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or username..." />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>Available Sub Users</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalText}>Total: {subUsers.length}</Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchSubUsers}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="account-off-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>No sub users found</Text>
          </View>
        }
      />
      {deactivatingId ? <LoadingOverlay message="Deactivating sub user..." /> : null}
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
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  headerSub: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  createBtn: { marginVertical: Spacing.md },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  totalBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  totalText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  mainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  info: { flex: 1 },
  name: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  username: { fontSize: Typography.fontSizes.sm, color: Colors.primary },
  company: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtn: { backgroundColor: Colors.infoLight },
  editBtn: { backgroundColor: Colors.warningLight },
  deleteBtn: { backgroundColor: Colors.dangerLight },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizes.base, color: Colors.textSecondary },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  restrictedTitle: { fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  restrictedText: { fontSize: Typography.fontSizes.base, color: Colors.textSecondary, textAlign: 'center' },
});
