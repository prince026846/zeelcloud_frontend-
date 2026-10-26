import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZIcon as Icon } from '../../components/ZIcon';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { InputField } from '../../components/InputField';
import { useCompanyStore } from '../../store/companyStore';
import { quotationsApi } from '../../services/api';
import { toDDMMYYYY } from '../../utils/formatDate';
import { openQuotationPdfPreview, shareQuotationPdfFile, generateQuotationPdfFile, numberToWordsINR } from '../../utils/quotationPdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { QuotationStackParamList, Quotation } from '../../types';

export const QuotationDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<QuotationStackParamList>>();
  const route = useRoute<RouteProp<QuotationStackParamList, 'QuotationDetail'>>();
  const { id } = route.params;

  const { selectedCompany } = useCompanyStore();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotationsApi.getById(id);
      if (data) {
        setQuotation(data);
        setRecipientEmail(data.email || '');
        setCcEmail(data.ccEmail || '');
        setEmailSubject(`Quotation ${data.quotationNo} from ${selectedCompany?.name || 'ZeelCloud'}`);
        setEmailMessage(
          `Dear ${data.partyName || 'Customer'},\n\nPlease find attached quotation ${data.quotationNo} for your review.\n\nThank you for your business.`
        );
      }
    } catch (err) {
      console.error('Failed to load quotation detail:', err);
      Alert.alert('Error', 'Could not load quotation details.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedCompany?.name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePreviewPdf = () => {
    if (!quotation) return;
    openQuotationPdfPreview(quotation, selectedCompany);
  };

  const handleSharePdf = async () => {
    if (!quotation) return;
    try {
      await shareQuotationPdfFile(quotation, selectedCompany);
    } catch (err) {
      Alert.alert('Share Error', 'Could not export or share Quotation PDF.');
    }
  };

  const handleSendEmail = async () => {
    if (!quotation) {
      Alert.alert('Error', 'Quotation data is still loading.');
      return;
    }
    if (!recipientEmail.trim()) {
      Alert.alert('Email Required', 'Please enter a recipient email address.');
      return;
    }

    setSendingEmail(true);
    try {
      const pdfFile = await generateQuotationPdfFile(quotation, selectedCompany);
      const formData = new FormData();
      formData.append('email', recipientEmail.trim());
      if (ccEmail.trim()) {
        formData.append('cc_email', ccEmail.trim());
      }
      formData.append('subject', emailSubject.trim());
      formData.append('message', emailMessage.trim());
      formData.append('pdf', {
        uri: pdfFile.uri,
        name: pdfFile.fileName,
        type: 'application/pdf',
      } as any);

      const response = await quotationsApi.sendEmail(id, formData);
      Alert.alert('Email Sent', response?.detail || 'Quotation email has been dispatched.');
      setEmailModalVisible(false);
    } catch (err: any) {
      console.error('Failed to send email:', err);
      Alert.alert('Email Dispatch', err?.message || 'Email service could not complete the request. Please check server SMTP configuration.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = () => {
    if (!quotation) return;
    Alert.alert(
      'Delete Quotation',
      `Are you sure you want to delete quotation ${quotation.quotationNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await quotationsApi.delete(quotation.id);
              Alert.alert('Deleted', 'Quotation has been removed.');
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete quotation:', err);
              Alert.alert('Error', 'Could not delete quotation.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading quotation...</Text>
      </View>
    );
  }

  if (!quotation) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Quotation not found.</Text>
        <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalGst = quotation.totalGstAmount || 0;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{quotation.quotationNo}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateQuotation', { quotation })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pencil-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quotation Header Info Card */}
        <Card style={styles.card}>
          <View style={styles.quoteHeaderRow}>
            <View>
              <Text style={styles.quoteNoText}>{quotation.quotationNo}</Text>
              <Text style={styles.quoteDateText}>Dated: {toDDMMYYYY(quotation.date)}</Text>
            </View>
            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedText}>Confirmed</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Party details */}
          <Text style={styles.sectionLabel}>Customer Details</Text>
          <Text style={styles.partyNameText}>{quotation.partyName || 'Counter Customer'}</Text>
          {quotation.partyAddress ? (
            <Text style={styles.partySubText}>{quotation.partyAddress}</Text>
          ) : null}
          {quotation.contactNo ? (
            <Text style={styles.partySubText}>Phone: {quotation.contactNo}</Text>
          ) : null}
          {quotation.email ? (
            <Text style={styles.partySubText}>Email: {quotation.email}</Text>
          ) : null}
          {quotation.ccEmail ? (
            <Text style={styles.partySubText}>CC: {quotation.ccEmail}</Text>
          ) : null}
        </Card>

        {/* Items List Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Items & Pricing</Text>

          {quotation.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemPlaceholder}>
                  <Icon name="package-variant-closed" size={24} color={Colors.gray400} />
                </View>
              )}

              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                {item.narration ? (
                  <Text style={styles.itemNarration} numberOfLines={2}>{item.narration}</Text>
                ) : null}
                <View style={styles.itemMetaRow}>
                  {item.batchNo ? <Text style={styles.metaBadge}>Batch: {item.batchNo}</Text> : null}
                  <Text style={styles.metaBadge}>GST: {item.gstPercentage}%</Text>
                </View>
                <View style={styles.itemMathRow}>
                  <Text style={styles.itemMath}>
                    {item.quantity} × ₹ {money(item.rate)}
                  </Text>
                  <Text style={styles.itemTotal}>₹ {money(item.amount)}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Totals Breakdown Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Financial Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLbl}>Subtotal</Text>
            <Text style={styles.summaryVal}>₹ {money(quotation.subtotal)}</Text>
          </View>

          {quotation.discountAmount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLbl}>
                Discount {quotation.discountType === 'percentage' ? `(${quotation.discountValue}%)` : ''}
              </Text>
              <Text style={[styles.summaryVal, { color: Colors.danger }]}>
                - ₹ {money(quotation.discountAmount)}
              </Text>
            </View>
          ) : null}

          {totalGst > 0 ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLbl}>CGST</Text>
                <Text style={styles.summaryVal}>₹ {money(cgst)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLbl}>SGST</Text>
                <Text style={styles.summaryVal}>₹ {money(sgst)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLbl}>Total GST</Text>
                <Text style={styles.summaryVal}>₹ {money(totalGst)}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLbl}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>₹ {money(quotation.totalAmount)}</Text>
          </View>

          <Text style={styles.wordsText}>
            {numberToWordsINR(quotation.totalAmount)}
          </Text>
        </Card>

        {/* Remarks Card */}
        {quotation.remark ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>Remarks / Terms</Text>
            <Text style={styles.remarkContent}>{quotation.remark}</Text>
          </Card>
        ) : null}

        {/* Quick Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.gridBtn, { backgroundColor: '#EEF2FF' }]}
            onPress={handlePreviewPdf}
            activeOpacity={0.8}
          >
            <Icon name="file-pdf-box" size={24} color={Colors.primary} />
            <Text style={[styles.gridBtnText, { color: Colors.primary }]}>Preview PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridBtn, { backgroundColor: '#ECFDF5' }]}
            onPress={handleSharePdf}
            activeOpacity={0.8}
          >
            <Icon name="share-variant-outline" size={24} color={Colors.success} />
            <Text style={[styles.gridBtnText, { color: Colors.success }]}>Share PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridBtn, { backgroundColor: '#FEF3C7' }]}
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="email-outline" size={24} color={Colors.warning} />
            <Text style={[styles.gridBtnText, { color: Colors.warning }]}>Send Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Icon name="trash-can-outline" size={24} color={Colors.danger} />
            <Text style={[styles.gridBtnText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Send Email Modal */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
              <Icon name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send Quotation Email</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalScroll, { paddingBottom: insets.bottom + Spacing.xl }]}
            keyboardShouldPersistTaps="handled"
          >
            <InputField
              label="Recipient Email *"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="customer@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="CC Email"
              value={ccEmail}
              onChangeText={setCcEmail}
              placeholder="accounts@domain.com, manager@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Subject"
              value={emailSubject}
              onChangeText={setEmailSubject}
              placeholder="Quotation Subject"
            />

            <InputField
              label="Message Body"
              value={emailMessage}
              onChangeText={setEmailMessage}
              placeholder="Message..."
              multiline
              numberOfLines={4}
            />

            <View style={{ marginTop: Spacing.md }}>
              <PrimaryButton
                title={sendingEmail ? 'Dispatching...' : 'Send Email'}
                onPress={handleSendEmail}
                loading={sendingEmail}
                disabled={sendingEmail}
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
  errorText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.danger,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quoteNoText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  quoteDateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.success,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    textTransform: 'uppercase',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  partyNameText: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  partySubText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
  },
  itemPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  itemName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  itemNarration: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaBadge: {
    fontSize: 10,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: Colors.textSecondary,
  },
  itemMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemMath: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  itemTotal: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
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
  remarkContent: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  gridBtnText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },

  // Modal
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
});
