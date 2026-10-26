import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useSubUserStore } from '../../store/subUserStore';
import { confirmAction, showAlert } from '../../utils/alert';
import { getInitials } from '../../utils/strings';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { SubUserStackParamList } from '../../types';

const splitName = (name: string) => {
  const parts = name.trim().split(' ');
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
};

export const SubUserDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SubUserStackParamList>>();
  const route = useRoute<RouteProp<SubUserStackParamList, 'SubUserDetail'>>();
  const { getById, fetchSubUserById, deactivateSubUserViaAPI } = useSubUserStore();
  const [user, setUser] = useState(() => getById(route.params.userId));
  const [isLoading, setIsLoading] = useState(true);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    fetchSubUserById(route.params.userId)
      .then((subUser) => setUser(subUser))
      .finally(() => setIsLoading(false));
  }, [fetchSubUserById, route.params.userId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GradientHeader title="Sub User Details" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <GradientHeader title="Sub User Details" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Icon name="account-off-outline" size={48} color={Colors.gray300} />
          <Text style={styles.missingText}>This sub user no longer exists.</Text>
        </View>
      </View>
    );
  }

  const { first, last } = splitName(user.name);

  const handleDeactivate = () => {
    confirmAction(
      'Deactivate Sub User',
      `Deactivate ${user.name}? They will no longer be able to sign in.`,
      async () => {
        setIsDeactivating(true);
        try {
          await deactivateSubUserViaAPI(user.id);
          navigation.popToTop();
          showAlert('Sub User Deactivated', `${user.name} has been deactivated.`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate sub user';
          showAlert('Deactivate Failed', errorMessage);
        } finally {
          setIsDeactivating(false);
        }
      },
      { confirmText: 'Deactivate', destructive: true },
    );
  };

  const infoRows: { icon: string; label: string; value: string }[] = [
    { icon: 'account-outline', label: 'Username', value: user.username },
    { icon: 'card-account-details-outline', label: 'First Name', value: first },
    { icon: 'card-account-details-outline', label: 'Last Name', value: last || '—' },
    { icon: 'phone-outline', label: 'Contact', value: user.phone || '—' },
    { icon: 'email-outline', label: 'Email', value: user.email || '—' },
    { icon: 'office-building-outline', label: 'Company', value: user.companyName || '—' },
  ];

  const displayedModules = user.isSalesOrderCreationAllowed
    ? [...user.allowedModules, 'Sales Order Creation']
    : user.allowedModules;

  return (
    <View style={styles.container}>
      <GradientHeader title="Sub User Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileHandle}>@{user.username}</Text>
            <Text style={styles.profileCompany}>{user.companyName || '—'}</Text>
          </View>
          <View style={[styles.statusBadge, user.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <View style={[styles.statusDot, { backgroundColor: user.isActive ? Colors.success : Colors.gray400 }]} />
            <Text style={[styles.statusText, { color: user.isActive ? Colors.success : Colors.gray500 }]}>
              {user.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>User Information</Text>
          {infoRows.map((row, idx) => (
            <View key={row.label} style={[styles.infoRow, idx === infoRows.length - 1 && styles.infoRowLast]}>
              <View style={styles.infoIcon}>
                <Icon name={row.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Allowed Modules ({displayedModules.length})</Text>
          {displayedModules.length === 0 ? (
            <Text style={styles.noModules}>No modules assigned.</Text>
          ) : (
            <View style={styles.moduleWrap}>
              {displayedModules.map((m) => (
                <View key={m} style={styles.moduleChip}>
                  <Icon name="check-circle" size={14} color={Colors.success} />
                  <Text style={styles.moduleText}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {user.isActive ? (
          <>
            <PrimaryButton
              title="Edit Sub User"
              icon="pencil-outline"
              onPress={() => navigation.navigate('EditSubUser', { userId: user.id })}
              style={styles.actionBtn}
            />
            <PrimaryButton
              title="Deactivate Sub User"
              icon="account-off-outline"
              variant="danger"
              onPress={handleDeactivate}
              loading={isDeactivating}
              disabled={isDeactivating}
            />
          </>
        ) : (
          <PrimaryButton
            title="Edit Sub User"
            icon="pencil-outline"
            onPress={() => navigation.navigate('EditSubUser', { userId: user.id })}
          />
        )}
      </ScrollView>
      {isDeactivating ? <LoadingOverlay message="Deactivating sub user..." /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  missing: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  missingText: { fontSize: Typography.fontSizes.base, color: Colors.textSecondary },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  profileHandle: { fontSize: Typography.fontSizes.sm, color: Colors.primary },
  profileCompany: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  activeBadge: { backgroundColor: Colors.successLight },
  inactiveBadge: { backgroundColor: Colors.gray100 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold },

  card: { marginBottom: Spacing.md },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  infoLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, width: 110 },
  infoValue: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'right',
  },
  noModules: { fontSize: Typography.fontSizes.sm, color: Colors.textMuted },
  moduleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  moduleText: { fontSize: Typography.fontSizes.xs, color: Colors.textPrimary },
  actionBtn: { marginBottom: Spacing.sm },
});
