import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Checkbox } from '../../components/Checkbox';
import { PERMISSION_MODULES } from '../../constants/options';
import { Colors, Typography, Spacing } from '../../theme';
import { useCompanyStore } from '../../store/companyStore';
import { useAuthStore } from '../../store/authStore';
import type { SubUser } from '../../types';

export interface SubUserFormValues {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  companyName: string;
  isActive: boolean;
  isSalesOrderCreationAllowed: boolean;
  allowedModules: string[];
}

interface SubUserFormProps {
  initial?: SubUser;
  submitLabel: string;
  submitIcon?: string;
  showActive?: boolean;
  onSubmit: (values: SubUserFormValues) => void;
}

const splitName = (name?: string) => {
  if (!name) return { first: '', last: '' };
  const parts = name.trim().split(' ');
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const SubUserForm: React.FC<SubUserFormProps> = ({
  initial,
  submitLabel,
  submitIcon = 'check',
  showActive = false,
  onSubmit,
}) => {
  const initialName = splitName(initial?.name);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const { selectedCompany, companies } = useCompanyStore();
  const currentUser = useAuthStore((s) => s.user);
  const backendCompanyName = selectedCompany?.name || companies[0]?.name || currentUser?.companyName || '';

  const [companyName, setCompanyName] = useState(initial?.companyName ?? backendCompanyName);

  useEffect(() => {
    if (!initial?.companyName && !companyName && backendCompanyName) {
      setCompanyName(backendCompanyName);
    }
  }, [backendCompanyName, initial?.companyName]);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isSalesOrderCreationAllowed, setIsSalesOrderCreationAllowed] = useState(initial?.isSalesOrderCreationAllowed ?? false);
  const [allowed, setAllowed] = useState<string[]>(initial?.allowedModules ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allSelected = allowed.length === PERMISSION_MODULES.length;

  const toggleModule = (m: string) => {
    setAllowed((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const toggleAll = () => {
    setAllowed(allSelected ? [] : [...PERMISSION_MODULES]);
  };

  const handleSubmit = () => {
    const next: Record<string, string> = {};
    const isEditMode = !!initial;

    // In create mode, require firstName, username, and password
    // In edit mode, all fields are optional
    if (!isEditMode) {
      if (!firstName.trim()) next.firstName = 'First name is required';
      if (!username.trim()) next.username = 'Username is required';
      if (!phone.trim()) next.phone = 'Contact number is required';
      if (!password.trim()) {
        next.password = 'Password is required';
      } else if (password.length < 4) {
        next.password = 'At least 4 characters';
      }
      if (allowed.length === 0) next.allowedModules = 'Select at least one module';
    } else {
      // Edit mode: only validate password if provided
      if (password && password.length > 0 && password.length < 6) {
        next.password = 'At least 6 characters';
      }
    }
    
    // Email validation applies to both modes: only validate if provided
    if (email.trim() && !isValidEmail(email.trim())) next.email = 'Enter a valid email';
    
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      username: username.trim(),
      password,
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim(),
      isActive,
      isSalesOrderCreationAllowed,
      allowedModules: allowed,
    });
  };

  return (
    <View>
      {/* User information */}
      <Card style={styles.card}>
        <View style={styles.sectionRow}>
          <Icon name="account-outline" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>User Information</Text>
        </View>

        {showActive ? (
          <View style={styles.activeRow}>
            <Text style={styles.activeLabel}>Account Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Colors.gray300, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        ) : null}

        <InputField label="Username" value={username} onChangeText={setUsername} placeholder="Enter username" leftIcon="account-outline" error={errors.username} />
        <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" leftIcon="lock-outline" error={errors.password} />
        <InputField label="Contact Number" value={phone} onChangeText={setPhone} placeholder="Enter contact number" leftIcon="phone-outline" keyboardType="phone-pad" error={errors.phone} />
        <InputField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Enter first name" leftIcon="card-account-details-outline" error={errors.firstName} autoCapitalize="words" />
        <InputField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Enter last name" leftIcon="card-account-details-outline" autoCapitalize="words" />
        <InputField label="Email" value={email} onChangeText={setEmail} placeholder="Enter email address" leftIcon="email-outline" keyboardType="email-address" error={errors.email} />
        <InputField label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="Enter company name" leftIcon="office-building-outline" autoCapitalize="words" />
      </Card>

      {/* Module access */}
      <Card style={styles.card}>
        <View style={styles.sectionRow}>
          <Icon name="shield-key-outline" size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Module Access</Text>
          <TouchableOpacity style={styles.selectAllBtn} onPress={toggleAll} activeOpacity={0.7}>
            <Text style={styles.selectAllText}>{allSelected ? 'Clear All' : 'Select All'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSub}>Select the modules this sub user can access</Text>
        {errors.allowedModules ? (
          <Text style={styles.moduleError}>{errors.allowedModules}</Text>
        ) : null}
        <View style={styles.moduleGrid}>
          <View style={styles.moduleCell}>
            <Checkbox label="Sales Order Creation" checked={isSalesOrderCreationAllowed} onToggle={() => setIsSalesOrderCreationAllowed(!isSalesOrderCreationAllowed)} />
          </View>
          {PERMISSION_MODULES.map((m) => (
            <View key={m} style={styles.moduleCell}>
              <Checkbox label={m} checked={allowed.includes(m)} onToggle={() => toggleModule(m)} />
            </View>
          ))}
        </View>
      </Card>

      <PrimaryButton title={submitLabel} icon={submitIcon} onPress={handleSubmit} style={styles.submitBtn} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  moduleError: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  selectAllBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  activeLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleCell: { width: '50%' },
  submitBtn: { marginBottom: Spacing.md },
});
