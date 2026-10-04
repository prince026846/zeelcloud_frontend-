import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ZIcon as Icon } from './ZIcon';
import { PrimaryButton } from './PrimaryButton';
import { useBookmarkStore } from '../store/bookmarkStore';
import { useAuthStore } from '../store/authStore';
import { getAuthorizedModules } from '../data/modules';
import { Colors, Typography, Spacing } from '../theme';

interface BookmarkEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BookmarkEditModal: React.FC<BookmarkEditModalProps> = ({ visible, onClose }) => {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const { user } = useAuthStore();
  const authorizedModules = getAuthorizedModules(user);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="bookmark-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Edit Bookmarks</Text>
              <Text style={styles.subtitle}>Choose modules to show on your dashboard</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
            {authorizedModules.map((m) => {
              const active = bookmarks.includes(m.key);
              return (
                <TouchableOpacity
                  key={m.key}
                  style={styles.row}
                  onPress={() => toggleBookmark(m.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowIcon, { backgroundColor: `${m.color}1A` }]}>
                    <Icon name={m.icon} size={20} color={m.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{m.label}</Text>
                    {m.comingSoon ? (
                      <Text style={styles.comingSoonHint}>Coming Soon</Text>
                    ) : null}
                  </View>
                  <Icon
                    name={active ? 'bookmark' : 'bookmark-outline'}
                    size={24}
                    color={active ? Colors.primary : Colors.gray400}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <PrimaryButton title="Done" icon="check" onPress={onClose} style={styles.doneBtn} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerText: { flex: 1 },
  title: { fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: Typography.fontSizes.base, color: Colors.textPrimary, fontWeight: Typography.fontWeights.medium },
  comingSoonHint: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
    marginTop: 2,
  },
  doneBtn: {},
});
