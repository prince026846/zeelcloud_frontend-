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
import { accountsApi, proformaInvoicesApi, quotationItemsApi } from '../../services/api';
import { openProformaInvoicePdfPreview, numberToWordsINR } from '../../utils/proformaInvoicePdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type {
  ProformaInvoiceStackParamList,
  ProformaInvoice,
  QuotationItemMaster,
  AccountParty,
  CreateProformaInvoicePayload,
  CreateProformaInvoiceItemPayload,
} from '../../types';

interface DraftInvoiceLine {
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

const createBlankLine = (): DraftInvoiceLine => ({
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

export const CreateProformaInvoiceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProformaInvoiceStackParamList>>();
  const route = useRoute<RouteProp<ProformaInvoiceStackParamList, 'CreateProformaInvoice'>>();
  const editInvoice = route.params?.invoice;
  const isEditing = !!editInvoice;

  const { selectedCompany, companies } = useCompanyStore();

  // Company and invoice details
  const [companyId, setCompanyId] = useState<number>(
    editInvoice?.companyId ?? selectedCompany?.recordId ?? 0
  );
  const [invoiceNo, setInvoiceNo] = useState(editInvoice?.invoiceNo || '');
  const [invoiceDate, setInvoiceDate] = useState(editInvoice?.date || todayIso());

  // Party details
  const [partyId, setPartyId] = useState<number | null>(editInvoice?.partyId ?? null);
  const [partyName, setPartyName] = useState(editInvoice?.partyName || '');
  const [partyAddress, setPartyAddress] = useState(editInvoice?.partyAddress || '');
  const [contactNo, setContactNo] = useState(editInvoice?.contactNo || '');
  const [email, setEmail] = useState(editInvoice?.email || '');
  const [ccEmail, setCcEmail] = useState(editInvoice?.ccEmail || '');
  const [remark, setRemark] = useState(editInvoice?.remark || '');

  // Line items
  const [items, setItems] = useState<DraftInvoiceLine[]>(() => {
    if (editInvoice?.items && editInvoice.items.length > 0) {
      return editInvoice.items.map((item) => ({
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
    editInvoice?.discountType || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState(
    editInvoice?.discountValue ? String(editInvoice.discountValue) : '0'
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
    const year = documentYear(invoiceDate);
    if (year == null) {
      setInvoiceNo('');
      return;
    }
    proformaInvoicesApi.getNextNumber(companyId, year)
      .then((nextNum) => {
        if (isMounted && nextNum) setInvoiceNo(nextNum);
      })
      .catch((e) => {
        console.warn('Could not fetch next proforma invoice number:', e);
      });
    return () => {
      isMounted = false;
    };
  }, [companyId, isEditing, invoiceDate]);

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
  const updateLine = (index: number, patch: Partial<DraftInvoiceLine>) => {
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
    if (documentYear(invoiceDate) == null) {
      errs.invoiceDate = 'Select a valid date';
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

  const constructPayload = (): CreateProformaInvoicePayload => {
    const linePayloads: CreateProformaInvoiceItemPayload[] = items.map((it) => ({
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
      date: invoiceDate.trim(),
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
      let resultInvoice: ProformaInvoice;

      if (isEditing && editInvoice) {
        resultInvoice = await proformaInvoicesApi.update(editInvoice.id, payload);
        Alert.alert('Success', 'Pro Forma Invoice updated successfully!');
      } else {
        resultInvoice = await proformaInvoicesApi.create(payload);
        Alert.alert('Success', `Pro Forma Invoice ${resultInvoice.invoiceNo} created!`);
      }

      if (andPreviewPdf) {
        openProformaInvoicePdfPreview(resultInvoice, selectedCompany);
      }

      navigation.goBack();
    } catch (err: any) {
      console.error('Failed to save proforma invoice:', err);
      Alert.alert('Save Error', err?.message || 'Could not save pro forma invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing pro forma invoice form...</Text>
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
            {isEditing ? `Edit PI ${invoiceNo}` : 'New Pro Forma Invoice'}
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
          <Text style={styles.sectionTitle}>Customer & Invoice Info</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <InputField
                label="Invoice No"
                value={invoiceNo}
                onChangeText={setInvoiceNo}
                placeholder="Auto-generated"
                editable={false}
              />
            </View>
            <View style={styles.half}>
              <DateField
                label="Date *"
                value={invoiceDate}
                onChange={setInvoiceDate}
              />
              {errors.invoiceDate ? (
                <Text style={styles.dateError}>{errors.invoiceDate}</Text>
              ) : null}
            </View>
          </View>

          <SearchableSelect
            label="Party / Customer Name *"
            value={partyName}
            options={accounts.map((a) => a.name)}
            onSelect={handleSelectParty}
            placeholder="Select from Accounts or type custom"
            allowCustom
            subtitleFor={(val) => accounts.find((a) => a.name === val)?.address}
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
            label="CC Email (for invoice dispatch)"
            value={ccEmail}
            onChangeText={setCcEmail}
            placeholder="accounts@domain.com, manager@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <InputField
            label="Remarks / Notes"
            value={remark}
            onChangeText={setRemark}
            placeholder="Payment terms, delivery timeline, etc."
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* Section: Line Items */}
        <View style={styles.itemsHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Invoice Items ({items.length})</Text>
          <TouchableOpacity style={styles.addItemBtn} onPress={addLine} activeOpacity={0.8}>
            <Icon name="plus" size={16} color="#ffffff" />
            <Text style={styles.addItemBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.map((item, index) => {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const lineTotal = qty * rate;

          return (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View style={styles.itemBadge}>
                  <Text style={styles.itemBadgeText}>#{index + 1}</Text>
                </View>

                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.catalogThumb} />
                ) : null}

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCardTitle} numberOfLines={1}>
                    {item.itemName || 'New Item'}
                  </Text>
                </View>

                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeLine(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash-can-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <SearchableSelect
                label="Item Name *"
                value={item.itemName}
                options={catalogItems.map((c) => c.itemName)}
                onSelect={(val) => handleSelectCatalogItem(index, val)}
                placeholder="Pick from Catalog or enter item"
                allowCustom
                subtitleFor={(val) => {
                  const m = catalogItems.find((c) => c.itemName === val);
                  return m ? `MRP: ₹${m.mrp} | GST: ${m.gstPercentage}%` : undefined;
                }}
                error={errors[`item_${index}_name`]}
              />

              <InputField
                label="Item Narration / Spec"
                value={item.narration}
                onChangeText={(val) => updateLine(index, { narration: val })}
                placeholder="Color, finish, length or specification..."
              />

              <View style={styles.row}>
                <View style={styles.third}>
                  <InputField
                    label="Batch / Lot No"
                    value={item.batchNo}
                    onChangeText={(val) => updateLine(index, { batchNo: val })}
                    placeholder="LOT-101"
                  />
                </View>
                <View style={styles.third}>
                  <InputField
                    label="MRP (₹)"
                    value={item.mrp}
                    onChangeText={(val) => updateLine(index, { mrp: val })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.third}>
                  <InputField
                    label="Rate (₹) *"
                    value={item.rate}
                    onChangeText={(val) => updateLine(index, { rate: val })}
                    placeholder="0.00"
                    keyboardType="numeric"
                    error={errors[`item_${index}_rate`]}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.half}>
                  <InputField
                    label="Quantity *"
                    value={item.quantity}
                    onChangeText={(val) => updateLine(index, { quantity: val })}
                    placeholder="1"
                    keyboardType="numeric"
                    error={errors[`item_${index}_qty`]}
                  />
                </View>
                <View style={styles.half}>
                  <InputField
                    label="GST %"
                    value={item.gstPercentage}
                    onChangeText={(val) => updateLine(index, { gstPercentage: val })}
                    placeholder="18.0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.lineTotalRow}>
                <Text style={styles.lineTotalLabel}>Line Amount (excl. tax):</Text>
                <Text style={styles.lineTotalVal}>
                  ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </Card>
          );
        })}

        {/* Section: Discount & Summary */}
        <Card style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Discount &amp; Taxes</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Discount Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    discountType === 'percentage' && styles.typeBtnActive,
                  ]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === 'percentage' && styles.typeBtnTextActive,
                    ]}
                  >
                    %
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    discountType === 'amount' && styles.typeBtnActive,
                  ]}
                  onPress={() => setDiscountType('amount')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      discountType === 'amount' && styles.typeBtnTextActive,
                    ]}
                  >
                    Flat ₹
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.half}>
              <InputField
                label={discountType === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Totals Breakdown */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              ₹ {calculatedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {calculatedTotals.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: Colors.danger }]}>
                Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'})
              </Text>
              <Text style={[styles.totalValue, { color: Colors.danger }]}>
                - ₹ {calculatedTotals.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {calculatedTotals.totalGst > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CGST</Text>
                <Text style={styles.totalValue}>
                  ₹ {(calculatedTotals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>SGST</Text>
                <Text style={styles.totalValue}>
                  ₹ {(calculatedTotals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          )}

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Net Total</Text>
            <Text style={styles.grandTotalValue}>
              ₹ {calculatedTotals.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.inWordsWrap}>
            <Text style={styles.inWordsLabel}>In Words:</Text>
            <Text style={styles.inWordsText}>{numberToWordsINR(calculatedTotals.netAmount)}</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <PrimaryButton
            title={saving ? 'Saving...' : isEditing ? 'Update Pro Forma Invoice' : 'Save Pro Forma Invoice'}
            onPress={() => handleSave(false)}
            loading={saving}
          />

          <TouchableOpacity
            style={styles.savePreviewBtn}
            onPress={() => handleSave(true)}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Icon name="file-pdf-box" size={20} color={Colors.primary} />
            <Text style={styles.savePreviewText}>Save &amp; Preview PDF</Text>
          </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  half: {
    flex: 1,
  },
  third: {
    flex: 1,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  addItemBtnText: {
    color: '#ffffff',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  itemBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  itemCardTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
  },
  catalogThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
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
  fieldLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
    padding: 2,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
  },
  typeBtnText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 6,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  inWordsWrap: {
    backgroundColor: '#F8FAFC',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inWordsLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  inWordsText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  buttonGroup: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  savePreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  savePreviewText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
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
});
