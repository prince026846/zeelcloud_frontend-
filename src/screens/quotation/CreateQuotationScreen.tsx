import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { InputField } from '../../components/InputField';
import { DateField } from '../../components/DateField';
import { SearchableSelect } from '../../components/SearchableSelect';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Card } from '../../components/Card';
import { useCompanyStore } from '../../store/companyStore';
import { accountsApi, quotationsApi, quotationItemsApi } from '../../services/api';
import { openQuotationPdfPreview, numberToWordsINR } from '../../utils/quotationPdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type {
  QuotationStackParamList,
  Quotation,
  QuotationItemMaster,
  AccountParty,
  CreateQuotationPayload,
  CreateQuotationItemPayload,
} from '../../types';

interface DraftQuotationLine {
  id: string;
  itemMasterId: string | null;
  itemName: string;
  narration: string;
  batchNo: string;
  imageUrl?: string;
  mrp: string;
  rate: string;
  quantity: string;
  gstPercentage: string;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const documentYear = (value: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }
  return year;
};

const createBlankLine = (): DraftQuotationLine => ({
  id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  itemMasterId: null,
  itemName: '',
  narration: '',
  batchNo: '',
  mrp: '',
  rate: '',
  quantity: '1',
  gstPercentage: '18.0',
});

export const CreateQuotationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<QuotationStackParamList>>();
  const route = useRoute<RouteProp<QuotationStackParamList, 'CreateQuotation'>>();
  const editQuotation = route.params?.quotation;
  const isEditing = !!editQuotation;

  const { selectedCompany, companies } = useCompanyStore();

  // Company and quotation details
  const [companyId, setCompanyId] = useState<number>(
    editQuotation?.companyId ?? selectedCompany?.recordId ?? 0
  );
  const [quotationNo, setQuotationNo] = useState(editQuotation?.quotationNo || '');
  const [quotationDate, setQuotationDate] = useState(editQuotation?.date || todayIso());

  // Party details
  const [partyId, setPartyId] = useState<number | null>(editQuotation?.partyId ?? null);
  const [partyName, setPartyName] = useState(editQuotation?.partyName || '');
  const [partyAddress, setPartyAddress] = useState(editQuotation?.partyAddress || '');
  const [contactNo, setContactNo] = useState(editQuotation?.contactNo || '');
  const [email, setEmail] = useState(editQuotation?.email || '');
  const [ccEmail, setCcEmail] = useState(editQuotation?.ccEmail || '');
  const [remark, setRemark] = useState(editQuotation?.remark || '');

  // Line items
  const [items, setItems] = useState<DraftQuotationLine[]>(() => {
    if (editQuotation?.items && editQuotation.items.length > 0) {
      return editQuotation.items.map((item) => ({
        id: item.id || `line_${Math.random()}`,
        itemMasterId: item.itemMasterId || null,
        itemName: item.itemName,
        narration: item.narration || '',
        batchNo: item.batchNo || '',
        imageUrl: item.imageUrl,
        mrp: item.mrp ? String(item.mrp) : '',
        rate: String(item.rate),
        quantity: String(item.quantity || 1),
        gstPercentage: item.gstPercentage ? String(item.gstPercentage) : '18.0',
      }));
    }
    return [createBlankLine()];
  });

  // Discount
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>(
    editQuotation?.discountType || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState(
    editQuotation?.discountValue ? String(editQuotation.discountValue) : '0'
  );

  // Reference data
  const [accounts, setAccounts] = useState<AccountParty[]>([]);
  const [catalogItems, setCatalogItems] = useState<QuotationItemMaster[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch accounts and catalog items
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadingInitial(true);
        const [accs, cats] = await Promise.all([
          accountsApi.getAll(companyId ? String(companyId) : undefined).catch(() => []),
          quotationItemsApi.getAll(companyId ? String(companyId) : undefined).catch(() => []),
        ]);
        if (isMounted) {
          setAccounts(accs);
          setCatalogItems(cats);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [companyId, isEditing]);

  useEffect(() => {
    if (isEditing || !companyId) return;
    let isMounted = true;
    const year = documentYear(quotationDate);
    if (year == null) {
      setQuotationNo('');
      return;
    }
    quotationsApi.getNextNumber(companyId, year)
      .then((nextNum) => {
        if (isMounted && nextNum) setQuotationNo(nextNum);
      })
      .catch((e) => {
        console.warn('Could not fetch next quotation number:', e);
      });
    return () => {
      isMounted = false;
    };
  }, [companyId, isEditing, quotationDate]);

  // Handle party selection
  const handleSelectParty = (selectedName: string) => {
    setPartyName(selectedName);
    const matched = accounts.find((a) => a.name === selectedName);
    if (matched) {
      setPartyId(matched.id);
      if (matched.address) setPartyAddress(matched.address);
      if (matched.phone) setContactNo(matched.phone);
    } else {
      setPartyId(null);
    }
  };

  // Line item manipulation
  const updateLine = (index: number, patch: Partial<DraftQuotationLine>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSelectCatalogItem = (index: number, selectedName: string) => {
    const matched = catalogItems.find((c) => c.itemName === selectedName);
    if (matched) {
      updateLine(index, {
        itemMasterId: matched.id,
        itemName: matched.itemName,
        narration: matched.narration || '',
        mrp: matched.mrp ? String(matched.mrp) : '',
        rate: matched.mrp ? String(matched.mrp) : '',
        gstPercentage: matched.gstPercentage ? String(matched.gstPercentage) : '18.0',
        imageUrl: matched.imageUrl,
      });
    } else {
      updateLine(index, {
        itemMasterId: null,
        itemName: selectedName,
      });
    }
  };

  const addLine = () => {
    setItems((prev) => [...prev, createBlankLine()]);
  };

  const removeLine = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Notice', 'At least one item is required.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstPercentage) || 0;

      const lineAmount = qty * rate;
      const lineGst = lineAmount * (gstRate / 100);

      subtotal += lineAmount;
      totalGst += lineGst;
    });

    const discVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discVal) / 100;
    } else {
      discountAmount = Math.min(discVal, subtotal);
    }

    const netAmount = Math.max(0, subtotal - discountAmount + totalGst);

    return {
      subtotal,
      discountAmount,
      totalGst,
      netAmount,
    };
  }, [items, discountType, discountValue]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!partyName.trim()) {
      errs.partyName = 'Party Name is required';
    }
    if (documentYear(quotationDate) == null) {
      errs.quotationDate = 'Select a valid date';
    }
    if (items.length === 0) {
      errs.items = 'Add at least one item';
    }

    items.forEach((it, idx) => {
      if (!it.itemName.trim()) {
        errs[`item_${idx}_name`] = 'Item name required';
      }
      const r = parseFloat(it.rate);
      if (isNaN(r) || r <= 0) {
        errs[`item_${idx}_rate`] = 'Rate required';
      }
      const q = parseFloat(it.quantity);
      if (isNaN(q) || q <= 0) {
        errs[`item_${idx}_qty`] = 'Qty required';
      }
    });

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Validation Error', 'Please check the required fields in the form.');
      return false;
    }
    return true;
  };

  const constructPayload = (): CreateQuotationPayload => {
    const linePayloads: CreateQuotationItemPayload[] = items.map((it) => ({
      item_master_id: it.itemMasterId || null,
      item_name: it.itemName.trim(),
      narration: it.narration.trim() || undefined,
      image_url: it.imageUrl || undefined,
      batch_no: it.batchNo.trim() || undefined,
      mrp: it.mrp ? parseFloat(it.mrp) || 0 : undefined,
      rate: parseFloat(it.rate) || 0,
      quantity: parseFloat(it.quantity) || 1,
      gst_percentage: it.gstPercentage ? parseFloat(it.gstPercentage) || 0 : 0,
    }));

    return {
      company_id: companyId,
      date: quotationDate.trim(),
      party_id: partyId,
      party_name: partyName.trim(),
      party_address: partyAddress.trim() || undefined,
      contact_no: contactNo.trim() || undefined,
      email: email.trim() || undefined,
      cc_email: ccEmail.trim() || undefined,
      remark: remark.trim() || undefined,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      items: linePayloads,
    };
  };

  const handleSave = async (andPreviewPdf: boolean = false) => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = constructPayload();
      let resultQuotation: Quotation;

      if (isEditing && editQuotation) {
        resultQuotation = await quotationsApi.update(editQuotation.id, payload);
        Alert.alert('Success', 'Quotation updated successfully!');
      } else {
        resultQuotation = await quotationsApi.create(payload);
        Alert.alert('Success', `Quotation ${resultQuotation.quotationNo} created!`);
      }

      if (andPreviewPdf) {
        openQuotationPdfPreview(resultQuotation, selectedCompany);
      }

      navigation.goBack();
    } catch (err: any) {
      console.error('Failed to save quotation:', err);
      Alert.alert('Save Error', err?.message || 'Could not save quotation.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing quotation form...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? `Edit Quotation ${quotationNo}` : 'New Quotation'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl * 2 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section: General & Party Details */}
        <Card style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Customer & Quotation Info</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <InputField
                label="Quotation No"
                value={quotationNo}
                onChangeText={setQuotationNo}
                placeholder="Auto-generated"
                editable={false}
              />
            </View>
            <View style={styles.half}>
              <DateField
                label="Date *"
                value={quotationDate}
                onChange={setQuotationDate}
              />
              {errors.quotationDate ? (
                <Text style={styles.dateError}>{errors.quotationDate}</Text>
              ) : null}
            </View>
          </View>

          <InputField
            label="Party / Customer Name *"
            value={partyName}
            onChangeText={(val) => {
              setPartyName(val);
              setPartyId(null);
            }}
            placeholder="Enter customer / firm name"
            error={errors.partyName}
          />

          <InputField
            label="Party Address"
            value={partyAddress}
            onChangeText={setPartyAddress}
            placeholder="Street address, city, pin code"
            multiline
            numberOfLines={2}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <InputField
                label="Contact Number"
                value={contactNo}
                onChangeText={setContactNo}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.half}>
              <InputField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="customer@domain.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <InputField
            label="CC Email (for quotation dispatch)"
            value={ccEmail}
            onChangeText={setCcEmail}
            placeholder="accounts@domain.com, manager@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        {/* Section: Line Items */}
        <Card style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quotation Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={addLine} activeOpacity={0.8}>
              <Icon name="plus" size={16} color={Colors.primary} />
              <Text style={styles.addLineText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => {
            const lineAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
            return (
              <View key={item.id} style={styles.lineItemWrap}>
                <View style={styles.lineHeaderRow}>
                  <Text style={styles.lineIndex}>Item #{idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLine(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="trash-can-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Catalog selection or custom name */}
                <SearchableSelect
                  label="Select from Catalog or Custom Item *"
                  value={item.itemName}
                  options={catalogItems.map((c) => c.itemName)}
                  onSelect={(val) => handleSelectCatalogItem(idx, val)}
                  placeholder="Choose catalog item or enter name"
                  allowCustom
                  error={errors[`item_${idx}_name`]}
                />

                {item.imageUrl ? (
                  <View style={styles.itemImageRow}>
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImgThumb} />
                    <Text style={styles.itemImgLabel}>Catalog product image attached</Text>
                  </View>
                ) : null}

                <InputField
                  label="Narration / Specifications"
                  value={item.narration}
                  onChangeText={(val) => updateLine(idx, { narration: val })}
                  placeholder="Optional item details, fabric, sizing"
                />

                <View style={styles.row}>
                  <View style={styles.third}>
                    <InputField
                      label="Batch / Code"
                      value={item.batchNo}
                      onChangeText={(val) => updateLine(idx, { batchNo: val })}
                      placeholder="B-001"
                    />
                  </View>
                  <View style={styles.third}>
                    <InputField
                      label="MRP (₹)"
                      value={item.mrp}
                      onChangeText={(val) => updateLine(idx, { mrp: val })}
                      placeholder="0.00"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.third}>
                    <InputField
                      label="Rate (₹) *"
                      value={item.rate}
                      onChangeText={(val) => updateLine(idx, { rate: val })}
                      placeholder="0.00"
                      keyboardType="numeric"
                      error={errors[`item_${idx}_rate`]}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <InputField
                      label="Quantity *"
                      value={item.quantity}
                      onChangeText={(val) => updateLine(idx, { quantity: val })}
                      placeholder="1"
                      keyboardType="numeric"
                      error={errors[`item_${idx}_qty`]}
                    />
                  </View>
                  <View style={styles.half}>
                    <InputField
                      label="GST (%)"
                      value={item.gstPercentage}
                      onChangeText={(val) => updateLine(idx, { gstPercentage: val })}
                      placeholder="18.0"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.lineTotalRow}>
                  <Text style={styles.lineTotalLabel}>Line Taxable:</Text>
                  <Text style={styles.lineTotalVal}>₹ {lineAmount.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Section: Discount & Remarks */}
        <Card style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Discount & Terms</Text>

          <View style={styles.discountRow}>
            <View style={styles.discountTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  discountType === 'percentage' && styles.toggleBtnActive,
                ]}
                onPress={() => setDiscountType('percentage')}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    discountType === 'percentage' && styles.toggleBtnTextActive,
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  discountType === 'amount' && styles.toggleBtnActive,
                ]}
                onPress={() => setDiscountType('amount')}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    discountType === 'amount' && styles.toggleBtnTextActive,
                  ]}
                >
                  Fixed Amount (₹)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <InputField
                label={discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <InputField
            label="Remarks / Special Instructions"
            value={remark}
            onChangeText={setRemark}
            placeholder="e.g. 50% advance, validity 15 days, dispatch via VRL Logistics"
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quotation Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLbl}>Subtotal</Text>
            <Text style={styles.summaryVal}>₹ {calculatedTotals.subtotal.toFixed(2)}</Text>
          </View>

          {calculatedTotals.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLbl}>
                Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
              </Text>
              <Text style={[styles.summaryVal, { color: Colors.danger }]}>
                - ₹ {calculatedTotals.discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLbl}>Total GST (CGST + SGST)</Text>
            <Text style={styles.summaryVal}>₹ {calculatedTotals.totalGst.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLbl}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>₹ {calculatedTotals.netAmount.toFixed(2)}</Text>
          </View>

          <Text style={styles.wordsText}>
            {numberToWordsINR(calculatedTotals.netAmount)}
          </Text>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsWrap}>
          <PrimaryButton
            title={saving ? 'Saving...' : 'Save & Preview PDF'}
            onPress={() => handleSave(true)}
            loading={saving}
            disabled={saving}
            variant="outline"
          />

          <PrimaryButton
            title={saving ? 'Saving...' : isEditing ? 'Update Quotation' : 'Save Quotation'}
            onPress={() => handleSave(false)}
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dateError: {
    color: Colors.danger,
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  cardSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addLineText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  half: {
    flex: 1,
  },
  third: {
    flex: 1,
  },
  lineItemWrap: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  lineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  lineIndex: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  itemImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  itemImgThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  itemImgLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  lineTotalLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  lineTotalVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  discountRow: {
    gap: Spacing.md,
  },
  discountTypeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: Typography.fontWeights.bold,
  },

  summaryCard: {
    padding: Spacing.lg,
    backgroundColor: '#F8FAFC',
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLbl: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryVal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLbl: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  grandTotalVal: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  wordsText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionsWrap: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
