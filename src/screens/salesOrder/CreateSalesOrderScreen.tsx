import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';
import { SearchableSelect } from '../../components/SearchableSelect';
import { PrimaryButton } from '../../components/PrimaryButton';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { useCompanyStore } from '../../store/companyStore';
import { useColorStore } from '../../store/colorStore';
import { useAuthStore } from '../../store/authStore';
import { itemsApi, accountsApi, salesOrdersApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import type { CompanyTabParamList, SalesOrderStackParamList, Item, AccountParty } from '../../types';

interface DraftItem {
  id: string;
  itemId: number | null;    // vn_item_id — sent to API
  itemName: string;         // display name
  color: string;
  nos: string;
  cut: string;
  meter: string;            // manual meter override (empty = auto Nos×Cut)
  meterManual: boolean;     // true once the user edits meter directly
  rate: string;
  loadingColor: boolean;    // true while fetching last-color
}

const REMARKS_MAX = 250;
const QTY_UNIT = 'MTR';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });


const blankItem = (): DraftItem => ({
  id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  itemId: null,
  itemName: '',
  color: '',
  nos: '',
  cut: '',
  meter: '',
  meterManual: false,
  rate: '',
  loadingColor: false,
});

// Auto quantity = Nos × Cut; when there is no Cut (pieces-only) it falls back to Nos.
const autoMeter = (it: DraftItem) => {
  const nos = parseFloat(it.nos) || 0;
  const cut = parseFloat(it.cut) || 0;
  return cut > 0 ? nos * cut : nos;
};

// Effective quantity used for the amount: a manually-entered meter wins, otherwise
// the auto Nos×Cut value. (Only-pcs → Nos; only-meter → the manual value.)
const qtyOf = (it: DraftItem) =>
  it.meterManual && it.meter.trim() !== '' ? parseFloat(it.meter) || 0 : autoMeter(it);

const amountOf = (it: DraftItem) => qtyOf(it) * (parseFloat(it.rate) || 0);

export const CreateSalesOrderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<CompanyTabParamList>>();
  const { selectedCompany, companies } = useCompanyStore();
  const { colors: savedColors, load: loadColors, addColors } = useColorStore();
  const activeAccountId = useAuthStore((state) => state.activeAccountId);

  // Load the persisted distinct colour list once.
  useEffect(() => {
    if (activeAccountId) {
      loadColors(activeAccountId);
    }
  }, [loadColors, activeAccountId]);

  const route = useRoute<RouteProp<SalesOrderStackParamList, 'CreateSalesOrder'>>();
  const editOrderId = route.params?.orderId;
  const isEditing = !!editOrderId;
  const [loadingOrder, setLoadingOrder] = useState(isEditing);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    selectedCompany?.recordId ?? null,
  );
  const [selectedCompanyName, setSelectedCompanyName] = useState(selectedCompany?.name ?? '');
  const [orderNumber, setOrderNumber] = useState('Auto-generated');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(true);

  // ── Remote data ───────────────────────────────────────────────────────────
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [masterParties, setMasterParties] = useState<AccountParty[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing order if editing
  useEffect(() => {
    if (!editOrderId) return;
    salesOrdersApi.getById(editOrderId).then((order) => {
      if (!order) return;
      if (order.is_synced) {
        Alert.alert(
          'Read Only', 
          'Synced orders cannot be edited.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setSelectedCompanyId(order.companyId);
      // Wait for master data to load? Master data loads when selectedCompanyId changes.
      setOrderNumber(order.orderNo);
      setPartyId(order.partyId);
      setPartyName(order.partyName);
      setDiscountType(order.discount_type || 'amount');
      setDiscountValue(order.discount_value ? String(order.discount_value) : '');
      setRemarks(order.remark || '');
      
      const parsedItems: DraftItem[] = order.items.map((it) => {
        const auto = (it.nos || 0) * (it.cut || 0) || (it.nos || 0);
        const manual = it.qnty !== auto;
        return {
          id: `it_${it.id}_${Math.random().toString(36).slice(2, 6)}`,
          itemId: it.item_id,
          itemName: it.item_name,
          color: it.color || '',
          nos: String(it.nos || ''),
          cut: String(it.cut || ''),
          meter: String(it.qnty || ''),
          meterManual: manual,
          rate: String(it.rate || ''),
          loadingColor: false,
        };
      });
      setItems(parsedItems.length ? parsedItems : [blankItem()]);
    }).catch(() => {
      Alert.alert('Error', 'Failed to load order details');
    }).finally(() => {
      setLoadingOrder(false);
    });
  }, [editOrderId]);

  // ── Derived options for dropdowns ─────────────────────────────────────────
  const companyOptions = companies.map((c) => c.name);
  const itemOptions = masterItems.map((i) => i.name);
  const partyOptions = masterParties.map((p) => p.name);

  // Selected party's address / GST (shown under the party field).
  const selectedParty = masterParties.find((p) => p.id === partyId);

  // Colour dropdown options: persisted distinct list + any colours already typed
  // into the current order (so the user sees them immediately), deduped.
  const colorOptions = useMemo(() => {
    const set = new Map<string, string>();
    savedColors.forEach((c) => set.set(c.toLowerCase(), c));
    items.forEach((it) => {
      const c = it.color.trim();
      if (c) set.set(c.toLowerCase(), c);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [savedColors, items]);

  // Party address subtitle lookup for the searchable party picker.
  const partySubtitle = useCallback(
    (name: string) => {
      const p = masterParties.find((x) => x.name === name);
      if (!p) return undefined;
      const bits = [p.address, p.gstNo ? `GST: ${p.gstNo}` : ''].filter(Boolean);
      return bits.join('  •  ') || undefined;
    },
    [masterParties],
  );

  // ── Load master data (items + parties) on company change ──────────────────
  useEffect(() => {
    const compId = selectedCompanyId ? String(selectedCompanyId) : undefined;
    if (!compId) {
      setLoadingMaster(false);
      return;
    }

    const activeCompany = companies.find((c) => c.recordId === selectedCompanyId);
    const shouldFetchAllParties = activeCompany ? activeCompany.isCommon : true;

    setLoadingMaster(true);
    Promise.all([
      itemsApi.getAll(compId),
      accountsApi.getAll(shouldFetchAllParties ? undefined : compId).catch(() => [] as AccountParty[]),
    ])
      .then(([fetchedItems, fetchedParties]) => {
        setMasterItems(fetchedItems);
        setMasterParties(fetchedParties.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {})
      .finally(() => setLoadingMaster(false));
  }, [selectedCompanyId]);

  // ── Sync selectedCompanyId when company switcher changes ──────────────────
  useEffect(() => {
    if (selectedCompany && !isEditing) {
      setSelectedCompanyId(selectedCompany.recordId ?? null);
      setSelectedCompanyName(selectedCompany.name);
    }
  }, [selectedCompany?.id, isEditing]);

  // ── Handle item selection — set rate from master, fetch last color ─────────
  const handleItemSelect = useCallback(
    async (draftId: string, name: string) => {
      const found = masterItems.find((i) => i.name === name);
      if (!found) return;

      // Optimistically set item info + prefill rate
      setItems((prev) =>
        prev.map((it) =>
          it.id === draftId
            ? {
                ...it,
                itemId: found.id,
                itemName: name,
                rate: found.salesRate > 0 ? String(found.salesRate) : it.rate,
                loadingColor: true,
              }
            : it,
        ),
      );

      // Fetch last used color for this item
      const compId = selectedCompanyId ? String(selectedCompanyId) : '';
      const lastColor = compId ? await salesOrdersApi.getLastColor(compId, found.id) : null;

      setItems((prev) =>
        prev.map((it) =>
          it.id === draftId
            ? { ...it, color: lastColor ?? it.color, loadingColor: false }
            : it,
        ),
      );
    },
    [masterItems, selectedCompanyId],
  );

  // ── Handle company select ─────────────────────────────────────────────────
  const handleCompanySelect = (name: string) => {
    const found = companies.find((c) => c.name === name);
    if (found) {
      setSelectedCompanyName(name);
      setSelectedCompanyId(found.recordId ?? null);
      // Reset dependent fields
      setPartyId(null);
      setPartyName('');
      setItems([blankItem()]);
    }
  };

  // ── Handle party select ───────────────────────────────────────────────────
  const handlePartySelect = (name: string) => {
    const found = masterParties.find((p) => p.name === name);
    setPartyName(name);
    setPartyId(found?.id ?? null);
  };

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!selectedCompanyId) next.company = 'Select a company';
    if (!orderNumber.trim()) next.orderNumber = 'Enter an order number';
    if (!partyId) next.party = 'Select a customer';
    const validItems = items.filter((it) => it.itemId && amountOf(it) > 0);
    if (validItems.length === 0) next.items = 'Add at least one item with quantity and rate';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.items) Alert.alert('Incomplete Order', next.items);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: selectedCompanyId!,
        order_no: orderNumber.trim(),
        date: todayIso(),
        party_id: partyId!,
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        remark: remarks.trim() || undefined,
        items: validItems.map((it) => ({
          item_id: it.itemId!,
          color: it.color || undefined,
          nos: parseFloat(it.nos) || 0,
          cut: parseFloat(it.cut) || 0,
          rate: parseFloat(it.rate) || 0,
          meter: qtyOf(it),
        })),
      };

      if (isEditing) {
        await salesOrdersApi.update(editOrderId, payload);
      } else {
        await salesOrdersApi.create(payload);
      }
      
      // Bind every colour used in this order into the persisted distinct list.
      addColors(validItems.map((it) => it.color).filter(Boolean));
      Alert.alert(
        `Order ${isEditing ? 'Updated' : 'Created'} Successfully ✓`,
        `Sales order ${payload.order_no} for ${partyName} has been ${isEditing ? 'updated' : 'created'}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create sales order';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const subtotal = items.reduce((sum, it) => sum + amountOf(it), 0);
  
  const parsedDiscountValue = parseFloat(discountValue) || 0;
  const calculatedDiscountAmount = discountType === 'percentage' 
    ? parseFloat((subtotal * (parsedDiscountValue / 100)).toFixed(2))
    : parseFloat(parsedDiscountValue.toFixed(2));
    
  const total = Math.max(0, subtotal - calculatedDiscountAmount);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Sales Order' : 'Create Sales Order'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Reports')} activeOpacity={0.7}>
          <Icon name="file-document-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Master-data / Order loading banner */}
      {loadingMaster || loadingOrder ? (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingBannerText}>
            {loadingOrder ? 'Loading order details…' : 'Loading items & parties…'}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Order Details ──────────────────────────────────────────── */}
          <CollapsibleSection
            title="Order Details"
            icon="clipboard-text-outline"
            open={detailsOpen}
            onToggle={() => setDetailsOpen((o) => !o)}
          >
            {/* Company — full width */}
            <SelectField
              label="Company *"
              value={selectedCompanyName}
              options={companyOptions}
              onSelect={handleCompanySelect}
              placeholder="Select"
              leftIcon="office-building-outline"
              error={errors.company}
            />

            {/* Order Number | Order Date */}
            <View style={styles.grid2}>
              <View style={styles.col}>
                <InputField
                  label="Order Number"
                  value={orderNumber}
                  onChangeText={setOrderNumber}
                  placeholder="SO-0000"
                  leftIcon="pound"
                  error={errors.orderNumber}
                  editable={false}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Order Date *</Text>
                <View style={styles.dateBox}>
                  <Icon name="calendar-outline" size={20} color={Colors.gray400} style={styles.leftIcon} />
                  <Text style={styles.dateText} numberOfLines={1}>{todayLabel()}</Text>
                </View>
              </View>
            </View>

            {/* Party / Customer — full width, searchable, with address + GST below */}
            <SearchableSelect
              label="Party / Customer *"
              value={partyName}
              options={partyOptions}
              onSelect={handlePartySelect}
              onClear={() => { setPartyName(''); setPartyId(null); }}
              placeholder={loadingMaster ? 'Loading…' : 'Search party by name'}
              leftIcon="account-outline"
              error={errors.party}
              searchable
              subtitleFor={partySubtitle}
            />
            {selectedParty && (!!selectedParty.address || !!selectedParty.gstNo) ? (
              <View style={styles.partyMetaBox}>
                {selectedParty.address ? (
                  <View style={styles.partyMetaRow}>
                    <Icon name="map-marker-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.partyMetaText}>{selectedParty.address}</Text>
                  </View>
                ) : null}
                {selectedParty.gstNo ? (
                  <View style={styles.partyMetaRow}>
                    <Icon name="card-account-details-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.partyMetaText}>GST: {selectedParty.gstNo}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Remarks */}
            <Text style={styles.fieldLabel}>Remarks</Text>
            <View style={styles.textAreaWrap}>
              <TextInput
                style={styles.textArea}
                value={remarks}
                onChangeText={(t) => setRemarks(t.slice(0, REMARKS_MAX))}
                placeholder="Enter remarks (optional)"
                placeholderTextColor={Colors.gray400}
                multiline
                textAlignVertical="top"
                maxLength={REMARKS_MAX}
              />
              <Text style={styles.counter}>{remarks.length} / {REMARKS_MAX}</Text>
            </View>
          </CollapsibleSection>

          {/* ── Items ─────────────────────────────────────────────────── */}
          <CollapsibleSection
            title="Items"
            icon="cube-outline"
            open={itemsOpen}
            onToggle={() => setItemsOpen((o) => !o)}
            right={
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{items.length}</Text>
              </View>
            }
          >
            {items.map((it, idx) => {
              const amount = amountOf(it);
              return (
                <Card key={it.id} style={styles.itemCard}>
                  {/* Line badge */}
                  <View style={styles.itemCardHeader}>
                    <View style={styles.lineBadge}>
                      <Text style={styles.lineBadgeText}>Line No. {idx + 1}</Text>
                    </View>
                  </View>

                  {/* Item picker */}
                  <SelectField
                    label="Item *"
                    value={it.itemName}
                    options={itemOptions}
                    onSelect={(v) => handleItemSelect(it.id, v)}
                    onClear={() => updateItem(it.id, { itemId: null, itemName: '', color: '' })}
                    placeholder={loadingMaster ? 'Loading items…' : 'Select item'}
                    leftIcon="package-variant-closed"
                  />

                  {/* Color — shows last-color suggestion hint or spinner */}
                  {it.loadingColor ? (
                    <View style={styles.colorHintRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.suggestHint}>Fetching last used color…</Text>
                    </View>
                  ) : (!!it.itemId && !!it.color) ? (
                    <Text style={styles.suggestHint}>✨ Pre-filled from last order</Text>
                  ) : null}

                  <SearchableSelect
                    label="Color"
                    value={it.color}
                    options={colorOptions}
                    onSelect={(v) => updateItem(it.id, { color: v })}
                    onClear={() => updateItem(it.id, { color: '' })}
                    placeholder="Type to add or pick a color"
                    leftIcon="palette-outline"
                    searchable
                    allowCustom
                  />

                  {/* Nos | Cut */}
                  <View style={styles.grid2}>
                    <View style={styles.col}>
                      <InputField
                        label="Nos (Pcs)"
                        value={it.nos}
                        onChangeText={(v) => updateItem(it.id, { nos: v })}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <InputField
                        label="Cut"
                        value={it.cut}
                        onChangeText={(v) => updateItem(it.id, { cut: v })}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Meter — editable; auto = Nos × Cut, or type a value manually */}
                  <View style={styles.meterHeader}>
                    <Text style={styles.fieldLabel}>Total Meters</Text>
                    {it.meterManual ? (
                      <TouchableOpacity
                        onPress={() => updateItem(it.id, { meter: '', meterManual: false })}
                        style={styles.autoBtn}
                        activeOpacity={0.7}
                      >
                        <Icon name="refresh" size={13} color={Colors.primary} />
                        <Text style={styles.autoBtnText}>Auto (Nos × Cut)</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.meterAutoHint}>Auto = Nos × Cut</Text>
                    )}
                  </View>
                  <View style={styles.meterRow}>
                    <Icon name="ruler" size={20} color={Colors.gray400} style={styles.leftIcon} />
                    <TextInput
                      style={styles.meterInput}
                      value={it.meterManual ? it.meter : (autoMeter(it) ? String(autoMeter(it)) : '')}
                      onChangeText={(v) => updateItem(it.id, { meter: v, meterManual: true })}
                      placeholder="0"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="numeric"
                    />
                    <Text style={styles.meterUnit}>{QTY_UNIT}</Text>
                  </View>

                  {/* Rate | Amount */}
                  <View style={styles.grid2}>
                    <View style={styles.col}>
                      <InputField
                        label="Rate *"
                        value={it.rate}
                        onChangeText={(v) => updateItem(it.id, { rate: v })}
                        placeholder="0.00"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.fieldLabel}>Amount</Text>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amountValue} numberOfLines={1}>{formatCurrency(amount)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Remove item */}
                  {items.length > 1 ? (
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(it.id)} activeOpacity={0.7}>
                      <Icon name="trash-can-outline" size={16} color={Colors.danger} />
                      <Text style={styles.removeText}>Remove Item</Text>
                    </TouchableOpacity>
                  ) : null}
                </Card>
              );
            })}

            {/* Add Item */}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem} activeOpacity={0.8}>
              <Icon name="plus" size={18} color={Colors.primary} />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>💡 You can add multiple items to this sales order.</Text>
          </CollapsibleSection>

          {/* ── Order Summary ──────────────────────────────────────────── */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Discount</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, discountType === 'percentage' && styles.toggleBtnActive]}
                    onPress={() => {
                      if (discountType !== 'percentage') {
                        setDiscountType('percentage');
                        setDiscountValue('');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleText, discountType === 'percentage' && styles.toggleTextActive]}>%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, discountType === 'amount' && styles.toggleBtnActive]}
                    onPress={() => {
                      if (discountType !== 'amount') {
                        setDiscountType('amount');
                        setDiscountValue('');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toggleText, discountType === 'amount' && styles.toggleTextActive]}>₹</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.discountInput}>
                <InputField 
                  label="" 
                  value={discountValue} 
                  onChangeText={(val) => {
                    if (discountType === 'percentage' && parseFloat(val) > 100) {
                      Alert.alert('Invalid', 'Percentage cannot exceed 100%');
                      return;
                    }
                    setDiscountValue(val);
                  }} 
                  placeholder="0" 
                  keyboardType="numeric" 
                  leftIcon={discountType === 'percentage' ? 'percent-outline' : 'currency-inr'}
                />
              </View>
            </View>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalSub}>(After Discount)</Text>
              </View>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </Card>

          {/* ── Footer Actions ─────────────────────────────────────────── */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Dashboard')} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.saveWrap}>
              <PrimaryButton
                title={saving ? 'Saving…' : (isEditing ? 'Update Sales Order' : 'Save Sales Order')}
                icon={saving ? undefined : 'content-save-outline'}
                onPress={handleSave}
                disabled={saving || loadingOrder || loadingMaster}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  loadingBannerText: { fontSize: Typography.fontSizes.sm, color: Colors.primary },
  content: { padding: Spacing.md },
  card: { marginBottom: Spacing.md },
  cardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  grid2: { flexDirection: 'row', gap: Spacing.md },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  leftIcon: { marginRight: Spacing.sm },
  dateText: { flex: 1, fontSize: Typography.fontSizes.base, color: Colors.textPrimary },
  textAreaWrap: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  textArea: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  itemCard: { marginBottom: Spacing.md },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.sm },
  lineBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  lineBadgeText: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold, color: Colors.primary },
  colorHintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  suggestHint: { fontSize: Typography.fontSizes.xs, color: Colors.primary, fontWeight: Typography.fontWeights.medium, marginBottom: Spacing.xs },
  calcBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  calcInfo: { flex: 1 },
  calcLabel: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, marginBottom: 2 },
  calcValue: { fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  calcUnit: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.primary },
  partyMetaBox: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
    gap: 4,
  },
  partyMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  partyMetaText: { flex: 1, fontSize: Typography.fontSizes.xs, color: Colors.textSecondary },
  meterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  meterAutoHint: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted },
  autoBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  autoBtnText: { fontSize: Typography.fontSizes.xs, color: Colors.primary, fontWeight: Typography.fontWeights.semiBold },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  meterInput: { flex: 1, fontSize: Typography.fontSizes.base, color: Colors.textPrimary, fontWeight: Typography.fontWeights.semiBold },
  meterUnit: { fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semiBold, color: Colors.primary },
  amountBlock: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  amountValue: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.success },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    marginTop: 2,
  },
  removeText: { fontSize: Typography.fontSizes.sm, color: Colors.danger, fontWeight: Typography.fontWeights.semiBold },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },
  addItemText: { fontSize: Typography.fontSizes.base, color: Colors.primary, fontWeight: Typography.fontWeights.semiBold },
  helperText: { fontSize: Typography.fontSizes.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontSize: Typography.fontSizes.base, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },
  discountInput: { width: 130 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold, color: Colors.textPrimary },
  totalSub: { fontSize: Typography.fontSizes.xs, color: Colors.textMuted },
  totalValue: { fontSize: Typography.fontSizes.xl, fontWeight: Typography.fontWeights.extraBold, color: Colors.primary },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, alignItems: 'stretch' },
  cancelBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelText: { fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.semiBold, color: Colors.textPrimary },
  saveWrap: { flex: 1 },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: 2,
    marginTop: 6,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleText: { fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semiBold, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary },
});
