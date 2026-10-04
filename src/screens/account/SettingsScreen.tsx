import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../theme';
import type { AppStackParamList } from '../../types';

interface Row {
  icon: string;
  label: string;
  type: 'toggle' | 'link';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
}

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { deactivateSession, appLockEnabled, setAppLockEnabled, lockApp } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const handleDeactivate = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => deactivateSession() },
    ]);
  };

  const handleSwitchAccount = () => {
    // Bubbles to RootNavigator (AccountSwitcher is outside AppStackParamList)
    (navigation as any).navigate('AccountSwitcher');
  };

  const handleAppLockToggle = (enabled: boolean) => {
    setAppLockEnabled(enabled);
  };

  const handleLockNow = () => {
    if (!appLockEnabled) {
      Alert.alert('App Lock Off', 'Turn on App Lock first to use this.');
      return;
    }
    lockApp();
  };

  const preferences: Row[] = [
    { icon: 'bell-outline', label: 'Push Notifications', type: 'toggle', value: notifications, onToggle: setNotifications },
    {
      icon: 'lock-outline',
      label: 'App Lock',
      type: 'toggle',
      value: appLockEnabled,
      onToggle: handleAppLockToggle,
    },
    { icon: 'fingerprint', label: 'Biometric Login', type: 'toggle', value: biometric, onToggle: setBiometric },
    {
      icon: 'shield-lock-outline',
      label: 'Lock App Now',
      type: 'link',
      onPress: handleLockNow,
    },
    {
      icon: 'lock-reset',
      label: 'Change Password',
      type: 'link',
      onPress: () => Alert.alert('Change Password', 'Please contact your administrator to reset your password.'),
    },
  ];

  const about: Row[] = [
    { icon: 'information-outline', label: 'About ZeelCloud', type: 'link', onPress: () => navigation.navigate('About') },
    { icon: 'phone-outline', label: 'Contact Us', type: 'link', onPress: () => navigation.navigate('Contact') },
  ];

  const renderRow = (row: Row, isLast: boolean) => (
    <TouchableOpacity
      key={row.label}
      style={[styles.row, isLast && styles.rowLast]}
      activeOpacity={row.type === 'link' ? 0.7 : 1}
      onPress={row.onPress}
      disabled={row.type === 'toggle'}
    >
      <View style={styles.rowIcon}>
        <Icon name={row.icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{row.label}</Text>
      {row.type === 'toggle' ? (
        <Switch
          value={row.value}
          onValueChange={row.onToggle}
          trackColor={{ false: Colors.gray300, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      ) : (
        <Icon name="chevron-right" size={20} color={Colors.gray400} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Preferences and account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Preferences</Text>
        <Card style={styles.card}>{preferences.map((r, i) => renderRow(r, i === preferences.length - 1))}</Card>

        <Text style={styles.sectionLabel}>About</Text>
        <Card style={styles.card}>{about.map((r, i) => renderRow(r, i === about.length - 1))}</Card>

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
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  headerSub: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  content: { padding: Spacing.md },
  sectionLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  card: { padding: 0, marginBottom: Spacing.lg, overflow: 'hidden' },
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
  rowLabel: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  switchButton: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  logout: { marginTop: 0 },
});
