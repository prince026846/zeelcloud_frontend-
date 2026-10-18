import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, message }) => {
  const displayText = subtitle || message;
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={56} color={Colors.gray300} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {displayText ? <Text style={styles.subtitle}>{displayText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
