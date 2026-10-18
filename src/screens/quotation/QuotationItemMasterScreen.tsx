import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ZIcon as Icon } from '../../components/ZIcon';
import { SearchBar } from '../../components/SearchBar';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState } from '../../components/EmptyState';
import { useCompanyStore } from '../../store/companyStore';
import { quotationItemsApi } from '../../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { QuotationItemMaster } from '../../types';

export const QuotationItemMasterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { selectedCompany, companies } = useCompanyStore();

  const [items, setItems] = useState<QuotationItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItemMaster | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [companyId, setCompanyId] = useState<number>(selectedCompany?.recordId || 0);
  const [itemName, setItemName] = useState('');
  const [narration, setNarration] = useState('');
  const [mrp, setMrp] = useState('');
  const [gstPercentage, setGstPercentage] = useState('18.0');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotationItemsApi.getAll(selectedCompany?.recordId);
      setItems(data);
    } catch (error) {
      console.error('Failed to load quotation items:', error);
      Alert.alert('Error', 'Unable to load quotation item catalog.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompany?.recordId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setCompanyId(selectedCompany?.recordId || (companies[0]?.recordId ?? 0));
    setItemName('');
    setNarration('');
    setMrp('');
    setGstPercentage('18.0');
    setSelectedImageUri(null);
    setIsActive(true);
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditModal = (item: QuotationItemMaster) => {
    setEditingItem(item);
    setCompanyId(item.companyId);
    setItemName(item.itemName);
    setNarration(item.narration || '');
    setMrp(item.mrp ? String(item.mrp) : '');
    setGstPercentage(item.gstPercentage ? String(item.gstPercentage) : '18.0');
    setSelectedImageUri(item.imageUrl || null);
    setIsActive(item.isActive);
    setFormErrors({});
    setModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to select product images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      Alert.alert('Error', 'Could not open image library.');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!itemName.trim()) {
      errors.itemName = 'Item Name is required';
    }
    const numMrp = parseFloat(mrp);
    if (isNaN(numMrp) || numMrp < 0) {
      errors.mrp = 'Please enter a valid MRP';
    }
    const numGst = parseFloat(gstPercentage);
    if (isNaN(numGst) || numGst < 0 || numGst > 100) {
      errors.gstPercentage = 'GST % must be between 0 and 100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const isNewUpload = selectedImageUri && !selectedImageUri.startsWith('http');
      const formData = new FormData();
      formData.append('company_id', String(companyId || selectedCompany?.recordId || 0));
      formData.append('item_name', itemName.trim());
      formData.append('narration', narration.trim());
      formData.append('mrp', String(parseFloat(mrp) || 0));
      formData.append('gst_percentage', String(parseFloat(gstPercentage) || 0));
      formData.append('is_active', String(isActive));

      if (isNewUpload && selectedImageUri) {
        const filename = selectedImageUri.split('/').pop() || 'product_image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', {
          uri: selectedImageUri,
          name: filename,
          type,
        } as any);
      }

      if (editingItem) {
        await quotationItemsApi.update(editingItem.id, formData);
        Alert.alert('Success', 'Item updated successfully');
      } else {
        await quotationItemsApi.create(formData);
        Alert.alert('Success', 'Item created successfully');
      }

      setModalVisible(false);
      fetchItems();
    } catch (error: any) {
      console.error('Failed to save quotation item:', error);
      Alert.alert('Save Failed', error?.message || 'Could not save item. Please verify fields.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: QuotationItemMaster) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.itemName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await quotationItemsApi.delete(item.id);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              Alert.alert('Deleted', 'Item has been removed.');
            } catch (err) {
              console.error('Failed to delete item:', err);
              Alert.alert('Error', 'Could not delete item.');
            }
          },
        },
      ]
    );
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(q) ||
        (item.narration && item.narration.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const renderItem = ({ item }: { item: QuotationItemMaster }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.placeholderThumb}>
            <Icon name="package-variant-closed" size={26} color={Colors.gray400} />
          </View>
        )}

        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: item.isActive ? Colors.success : Colors.danger }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {item.narration ? (
            <Text style={styles.narration} numberOfLines={2}>{item.narration}</Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              MRP: <Text style={styles.priceVal}>₹ {item.mrp.toFixed(2)}</Text>
            </Text>
            <Text style={styles.gstText}>GST: {item.gstPercentage}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <Icon name="pencil-outline" size={16} color={Colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Icon name="delete-outline" size={16} color={Colors.danger} />
          <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Item Master Catalog</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{selectedCompany?.name || 'All Companies'}</Text>

        <View style={styles.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search catalog items..."
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title="No Items Found"
              message={
                searchQuery
                  ? 'No matching catalog items found.'
                  : 'Add your first quotation item with name, MRP, GST %, and product image.'
              }
            />
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Catalog Item' : 'New Catalog Item'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.modalScroll,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Image Picker */}
            <View style={styles.imagePickerSection}>
              {selectedImageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImageUri(null)}
                  >
                    <Icon name="close-circle" size={24} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} activeOpacity={0.8}>
                  <Icon name="camera-plus-outline" size={36} color={Colors.primary} />
                  <Text style={styles.imagePlaceholderText}>Upload Product Image</Text>
                  <Text style={styles.imagePlaceholderSub}>JPG, PNG (max 5MB)</Text>
                </TouchableOpacity>
              )}
              {selectedImageUri && (
                <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>

            <InputField
              label="Item Name *"
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Premium Cotton Shirt"
              error={formErrors.itemName}
            />

            <InputField
              label="Description / Narration"
              value={narration}
              onChangeText={setNarration}
              placeholder="e.g. 100% Giza Cotton, 60s count yarn"
              multiline
              numberOfLines={3}
            />

            <View style={styles.formRow}>
              <View style={styles.halfCol}>
                <InputField
                  label="MRP (₹) *"
                  value={mrp}
                  onChangeText={setMrp}
                  placeholder="0.00"
                  keyboardType="numeric"
                  error={formErrors.mrp}
                />
              </View>
              <View style={styles.halfCol}>
                <InputField
                  label="GST (%) *"
                  value={gstPercentage}
                  onChangeText={setGstPercentage}
                  placeholder="18.0"
                  keyboardType="numeric"
                  error={formErrors.gstPercentage}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active in Catalog</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                thumbColor={isActive ? Colors.primary : Colors.gray100}
              />
            </View>

            <View style={styles.submitWrap}>
              <PrimaryButton
                title={saving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                onPress={handleSave}
                loading={saving}
                disabled={saving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
  },
  searchWrap: {
    marginTop: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  placeholderThumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
  narration: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  priceVal: {
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  gstText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semiBold,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  actionText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  modalScroll: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  imagePlaceholderText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  imagePlaceholderSub: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  imagePreviewWrap: {
    position: 'relative',
    width: 140,
    height: 140,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  changeImageBtn: {
    marginTop: Spacing.xs,
    paddingVertical: 4,
  },
  changeImageText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  submitWrap: {
    marginTop: Spacing.lg,
  },
});
