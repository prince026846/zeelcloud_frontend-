import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/strings';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const startEditing = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setNameError('');
    setEmailError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setNameError('');
    setEmailError('');
    let valid = true;
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    }
    if (!valid) return;

    setSaving(true);
    await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setSaving(false);
    setEditing(false);
    Alert.alert('Profile Updated', 'Your details have been saved successfully.');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSub}>{editing ? 'Edit your details' : 'View your details'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name ? getInitials(user.name) : 'U'}</Text>
            </View>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <View style={styles.roleBadge}>
              <Icon name="shield-account" size={13} color={Colors.primary} />
              <Text style={styles.roleText}>{user?.role ?? 'User'}</Text>
            </View>
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Account Information</Text>

            <View style={styles.readonlyRow}>
              <View style={styles.readonlyIcon}>
                <Icon name="account-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.readonlyInfo}>
                <Text style={styles.readonlyLabel}>Username</Text>
                <Text style={styles.readonlyValue}>{user?.username ?? '-'}</Text>
              </View>
              <Icon name="lock-outline" size={16} color={Colors.gray400} />
            </View>

            {editing ? (
              <View style={styles.form}>
                <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" leftIcon="card-account-details-outline" error={nameError} autoCapitalize="words" />
                <InputField label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" leftIcon="email-outline" keyboardType="email-address" error={emailError} />
                <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" leftIcon="phone-outline" keyboardType="phone-pad" />
              </View>
            ) : (
              <>
                <View style={styles.readonlyRow}>
                  <View style={styles.readonlyIcon}>
                    <Icon name="card-account-details-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.readonlyInfo}>
                    <Text style={styles.readonlyLabel}>Full Name</Text>
                    <Text style={styles.readonlyValue}>{user?.name ?? '-'}</Text>
                  </View>
                </View>
                <View style={styles.readonlyRow}>
                  <View style={styles.readonlyIcon}>
                    <Icon name="email-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.readonlyInfo}>
                    <Text style={styles.readonlyLabel}>Email</Text>
                    <Text style={styles.readonlyValue}>{user?.email || 'Not set'}</Text>
                  </View>
                </View>
                <View style={[styles.readonlyRow, styles.readonlyRowLast]}>
                  <View style={styles.readonlyIcon}>
                    <Icon name="phone-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.readonlyInfo}>
                    <Text style={styles.readonlyLabel}>Phone</Text>
                    <Text style={styles.readonlyValue}>{user?.phone || 'Not set'}</Text>
                  </View>
                </View>
              </>
            )}
          </Card>

          {editing ? (
            <>
              <PrimaryButton title="Save Changes" onPress={handleSave} loading={saving} icon="content-save-outline" style={styles.actionButton} />
              <PrimaryButton title="Cancel" onPress={() => setEditing(false)} variant="outline" icon="close" style={styles.actionButton} />
            </>
          ) : (
            <PrimaryButton title="Edit Profile" onPress={startEditing} icon="pencil-outline" style={styles.actionButton} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
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
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.extraBold,
    color: Colors.primary,
  },
  profileName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  card: { marginBottom: Spacing.lg },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  form: { marginTop: Spacing.md },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  readonlyRowLast: { borderBottomWidth: 0 },
  readonlyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  readonlyInfo: { flex: 1 },
  readonlyLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted, marginBottom: 2 },
  readonlyValue: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  actionButton: { marginBottom: Spacing.md },
});
