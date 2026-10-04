import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { useSyncStore } from '../store/syncStore';
import { Colors, Typography } from '../theme';

const LastSyncBadgeBase: React.FC = () => {
  const lastSynced = useSyncStore((s) => s.lastSynced);

  return (
    <View style={styles.row}>
      <Icon name="sync" size={11} color={Colors.textSecondary} />
      <Text style={styles.text} numberOfLines={1}>
        Last sync: {lastSynced || 'not synced yet'}
      </Text>
    </View>
  );
};

export const LastSyncBadge = React.memo(LastSyncBadgeBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  text: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
});
