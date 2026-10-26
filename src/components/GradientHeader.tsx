import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing } from '../theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  /** Let a long subtitle (such as a party address) wrap instead of ellipsizing. */
  wrapSubtitle?: boolean;
  onBack?: () => void;
  backIcon?: string;
  rightElement?: ReactNode;
}

/** App header — white surface, brand title, light-purple accent strip. */
export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  wrapSubtitle = false,
  onBack,
  backIcon = 'arrow-left',
  rightElement,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.accentBar} />
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Icon name={backIcon} size={22} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, wrapSubtitle && styles.subtitleWrap]}
              {...(wrapSubtitle ? {} : { numberOfLines: 1 })}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightElement ? (
          <View style={styles.rightContainer}>{rightElement}</View>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primaryLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.purple100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlaceholder: {
    width: 38,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: Typography.fontWeights.medium,
  },
  subtitleWrap: {
    alignSelf: 'stretch',
  },
  rightContainer: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
});
