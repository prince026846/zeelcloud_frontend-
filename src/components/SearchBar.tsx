import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilter?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFilter,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Icon name="magnify" size={20} color={Colors.primaryLight} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.primaryLight}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
          numberOfLines={1}
        />
        {value.length > 0 ? (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
            <Icon name="close-circle" size={18} color={Colors.primaryLight} />
          </TouchableOpacity>
        ) : null}
      </View>
      {onFilter ? (
        <TouchableOpacity style={styles.filterButton} onPress={onFilter} activeOpacity={0.8}>
          <Icon name="tune-variant" size={20} color={Colors.textWhite} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
