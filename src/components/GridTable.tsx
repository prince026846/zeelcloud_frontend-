import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography } from '../theme';

// Column sizing mirrors the OG .NET MAUI grids: small fixed-width columns
// (e.g. 30/35/50/70) plus star (*) columns that share the remaining space.
// width  -> fixed pixel width  |  flex -> proportional share of the rest.
export interface GridColumn<T> {
  key: string;
  label: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => React.ReactNode;
  /** Max lines for default (non-render) cell text. Default 2. */
  numberOfLines?: number;
  /** Max lines for the header label. Default 2 so two-word headers can wrap. */
  headerNumberOfLines?: number;
}

/** Opt-in metrics. Omitted props keep the shared grid defaults. */
interface GridMetrics {
  /** Horizontal padding inside each cell. Default 3. */
  cellPaddingHorizontal?: number;
  /** Caps system font scaling for this table only. Omit to keep full scaling. */
  maxFontSizeMultiplier?: number;
  /** Wrap header and default cell text inside the column instead of letting it widen the row. */
  constrainText?: boolean;
}

interface GridTableProps<T> extends GridMetrics {
  columns: GridColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowPress?: (item: T) => void;
  rowStyle?: (item: T) => ViewStyle | undefined;
  emptyText?: string;
  hideHeader?: boolean;
  /** Align row cells to the top so multi-line party names don't clip neighbors. */
  alignRowsTop?: boolean;
}

// OG-style data grid, ported from the .NET MAUI app's report tables
// (e.g. SalesOsPartyDetailPage: 30|30|30|*|*|35|35|35|* with 10px labels and a
// coloured header strip). Everything fits the device width — there is NO
// horizontal scrolling; star columns compress instead.
export function GridTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  rowStyle,
  emptyText = 'No records',
  hideHeader = false,
  alignRowsTop = false,
  cellPaddingHorizontal,
  maxFontSizeMultiplier,
  constrainText = false,
}: GridTableProps<T>) {
  const cellStyle = (col: GridColumn<T>): ViewStyle => ({
    ...(col.width != null ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 }),
    alignItems: col.align === 'right' ? 'flex-end' : col.align === 'left' ? 'flex-start' : 'center',
    justifyContent: alignRowsTop ? 'flex-start' : 'center',
    paddingHorizontal: cellPaddingHorizontal ?? 3,
  });
  const fontCap = maxFontSizeMultiplier != null ? { maxFontSizeMultiplier } : null;

  return (
    <View style={styles.table}>
      {/* Header strip (OG: Yellow200Accent bar with 10px labels) */}
      {!hideHeader && (
        <GridTableHeader
          columns={columns}
          cellPaddingHorizontal={cellPaddingHorizontal}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          constrainText={constrainText}
        />
      )}

      {data.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        data.map((item, index) => {
          const Row: React.ComponentType<any> = onRowPress ? TouchableOpacity : View;
          return (
            <Row
              key={keyExtractor(item, index)}
              style={[
                styles.row,
                styles.bodyRow,
                alignRowsTop && styles.rowTop,
                rowStyle?.(item),
              ]}
              {...(onRowPress ? { onPress: () => onRowPress(item), activeOpacity: 0.7 } : {})}
            >
              {columns.map((col) => (
                <View key={col.key} style={cellStyle(col)}>
                  {col.render ? (
                    col.render(item)
                  ) : (
                    <Text
                      style={[styles.td, constrainText ? styles.constrained : null]}
                      numberOfLines={col.numberOfLines ?? 2}
                      {...fontCap}
                    >
                      {String((item as Record<string, unknown>)[col.key] ?? '')}
                    </Text>
                  )}
                </View>
              ))}
            </Row>
          );
        })
      )}
    </View>
  );
}

export function GridTableHeader<T>({
  columns,
  cellPaddingHorizontal,
  maxFontSizeMultiplier,
  constrainText = false,
}: { columns: GridColumn<T>[] } & GridMetrics) {
  const cellStyle = (col: GridColumn<T>): ViewStyle => ({
    ...(col.width != null ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 }),
    alignItems: col.align === 'right' ? 'flex-end' : col.align === 'left' ? 'flex-start' : 'center',
    justifyContent: 'center',
    paddingHorizontal: cellPaddingHorizontal ?? 3,
  });
  const fontCap = maxFontSizeMultiplier != null ? { maxFontSizeMultiplier } : null;

  return (
    <View style={[styles.row, styles.headerRow]}>
      {columns.map((col) => (
        <View key={col.key} style={cellStyle(col)}>
          <Text
            style={[styles.th, constrainText ? styles.constrained : null]}
            numberOfLines={col.headerNumberOfLines ?? 2}
            {...fontCap}
          >
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Cell text helper so custom-rendered cells match the grid's compact type.
export const GridText: React.FC<{
  children: React.ReactNode;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  /** Pass undefined to allow unrestricted wrapping (no ellipsis cut). */
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  /** Keep this text inside its cell so a long value cannot widen the column. */
  fitWidth?: boolean;
  /** Caps system font scaling for this text only. Omit to keep full scaling. */
  maxFontSizeMultiplier?: number;
}> = ({
  children,
  bold,
  color,
  align,
  fontSize,
  numberOfLines = 2,
  adjustsFontSizeToFit,
  minimumFontScale,
  fitWidth,
  maxFontSizeMultiplier,
}) => (
  <Text
    numberOfLines={numberOfLines}
    adjustsFontSizeToFit={adjustsFontSizeToFit}
    minimumFontScale={minimumFontScale}
    {...(maxFontSizeMultiplier != null ? { maxFontSizeMultiplier } : {})}
    style={[
      styles.td,
      bold && styles.tdBold,
      color ? { color } : null,
      align ? { textAlign: align } : null,
      fontSize ? { fontSize } : null,
      adjustsFontSizeToFit ? { width: '100%' } : null,
      fitWidth ? styles.fitWidth : null,
    ]}
  >
    {children}
  </Text>
);

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
  rowTop: {
    alignItems: 'flex-start',
  },
  headerRow: {
    backgroundColor: Colors.warningLight,
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
  th: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  td: {
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tdBold: {
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  constrained: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 1,
    includeFontPadding: false,
  },
  fitWidth: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  empty: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
});
