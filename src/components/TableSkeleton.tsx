import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { Colors } from '../theme';
import type { GridColumn } from './GridTable';

interface TableSkeletonProps<T> {
  columns: GridColumn<T>[];
  rowCount?: number;
  hideHeader?: boolean;
}

export function TableSkeleton<T>({ columns, rowCount = 10, hideHeader = false }: TableSkeletonProps<T>) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const cellStyle = (col: GridColumn<T>): ViewStyle => ({
    ...(col.width != null ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 }),
    alignItems: col.align === 'right' ? 'flex-end' : col.align === 'left' ? 'flex-start' : 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  });

  return (
    <View style={styles.table}>
      {!hideHeader && (
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((col) => (
            <View key={`header-${col.key}`} style={cellStyle(col)}>
              <View style={[styles.skeletonBlock, { width: '80%', height: 12, borderRadius: 2, backgroundColor: Colors.gray400 }]} />
            </View>
          ))}
        </View>
      )}

      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, styles.bodyRow]}>
          {columns.map((col) => {
            // Give slightly varied widths to the skeleton blocks for a more natural look
            const blockWidth = col.key === 'name' || col.key === 'partyName' ? '90%' : '60%';
            const blockHeight = 14;

            return (
              <View key={`cell-${col.key}`} style={cellStyle(col)}>
                <Animated.View
                  style={[
                    styles.skeletonBlock,
                    {
                      width: blockWidth,
                      height: blockHeight,
                      opacity: pulseAnim,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    width: '100%',
  },
  headerRow: {
    backgroundColor: Colors.lightWash,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingVertical: 6,
  },
  bodyRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 7,
  },
  skeletonBlock: {
    backgroundColor: Colors.gray300,
    borderRadius: 4,
  },
});
