import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ZIcon as Icon } from '../../components/ZIcon';
import { GradientHeader } from '../../components/GradientHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

/** Placeholder shown while Machine Wise Beam Stock is disabled on the frontend. */
export const MachineWiseComingSoonScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Machine Wise Beam Stock"
        subtitle="Temporarily unavailable"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Icon name="clock-outline" size={40} color={Colors.purple600} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
        <Text style={styles.title}>Machine Wise Beam Stock</Text>
        <Text style={styles.message}>
          This report is temporarily disabled while we finish wiring it up. It will be available in a
          future update.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${Colors.purple600}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  badge: {
    backgroundColor: Colors.lightWash,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  badgeText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
