import React from 'react';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../components/ZIcon';
import { Colors, Typography } from '../theme';

/** Bottom tabs — white bar, dark purple active, light purple idle. */
export const useBaseTabScreenOptions = (): BottomTabNavigationOptions => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  return {
    headerShown: false,
    tabBarActiveTintColor: Colors.primary,
    tabBarInactiveTintColor: Colors.primaryLight,
    tabBarStyle: {
      backgroundColor: Colors.surface,
      borderTopColor: Colors.hairline,
      borderTopWidth: 1,
      height: 56 + bottomInset,
      paddingTop: 8,
      paddingBottom: bottomInset,
      elevation: 8,
      shadowColor: Colors.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -2 },
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: Typography.fontWeights.semiBold,
      marginTop: 2,
    },
  };
};

export const tabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) =>
    <Icon name={name} size={size} color={color} />;
