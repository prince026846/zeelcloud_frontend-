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
import { proformaInvoicesApi } from '../../services/api';
import { toDDMMYYYY } from '../../utils/formatDate';
import { openProformaInvoicePdfPreview, shareProformaInvoicePdfFile, generateProformaInvoicePdfFile, numberToWordsINR } from '../../utils/proformaInvoicePdfGenerator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import type { ProformaInvoiceStackParamList, ProformaInvoice } from '../../types';

export const ProformaInvoiceDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ProformaInvoiceStackParamList>>();
  const route = useRoute<RouteProp<ProformaInvoiceStackParamList, 'ProformaInvoiceDetail'>>();
  const { id } = route.params;

  const { selectedCompany } = useCompanyStore();
  const [invoice, setInvoice] = useState<ProformaInvoice | null>(null);
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
      const data = await proformaInvoicesApi.getById(id);
      if (data) {
        setInvoice(data);
        setRecipientEmail(data.email || '');
        setCcEmail(data.ccEmail || '');
        setEmailSubject(`Pro Forma Invoice ${data.invoiceNo} from ${selectedCompany?.name || 'ZeelCloud'}`);
        setEmailMessage(
          `Dear ${data.partyName || 'Customer'},\n\nPlease find attached pro forma invoice ${data.invoiceNo} for your review.\n\nThank you for your business.`
        );
      }
    } catch (err) {
      console.error('Failed to load proforma invoice detail:', err);
      Alert.alert('Error', 'Could not load pro forma invoice details.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedCompany?.name]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePreviewPdf = () => {
    if (!invoice) return;
    openProformaInvoicePdfPreview(invoice, selectedCompany);
  };

  const handleSharePdf = async () => {
    if (!invoice) return;
    try {
      await shareProformaInvoicePdfFile(invoice, selectedCompany);
    } catch (err) {
      Alert.alert('Share Error', 'Could not export or share Pro Forma Invoice PDF.');
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) {
      Alert.alert('Error', 'Pro forma invoice data is still loading.');
      return;
    }
    if (!recipientEmail.trim()) {
      Alert.alert('Email Required', 'Please enter a recipient email address.');
      return;
    }

    setSendingEmail(true);
    try {
      const pdfFile = await generateProformaInvoicePdfFile(invoice, selectedCompany);
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

      const response = await proformaInvoicesApi.sendEmail(id, formData);
      setEmailModalVisible(false);
      Alert.alert('Email Sent', response.detail || 'Pro Forma Invoice email dispatched successfully!');
    } catch (err: any) {
      console.error('Failed to send email:', err);
      Alert.alert('Email Error', err?.message || 'Could not send invoice email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = () => {
    if (!invoice) return;
    Alert.alert(
      'Delete Pro Forma Invoice',
      `Are you sure you want to delete invoice ${invoice.invoiceNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await proformaInvoicesApi.delete(invoice.id);
              Alert.alert('Deleted', 'Pro Forma Invoice deleted successfully.');
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete invoice:', err);
              Alert.alert('Error', 'Could not delete pro forma invoice.');
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
        <Text style={styles.loadingText}>Loading pro forma invoice...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Pro Forma Invoice not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{invoice.invoiceNo}</Text>
            <Text style={styles.headerDate}>{toDDMMYYYY(invoice.date)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateProformaInvoice', { invoice })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="pencil-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer / Party Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pro Forma</Text>
            </View>
          </View>

          <Text style={styles.partyName}>{invoice.partyName || 'Cash / Counter Customer'}</Text>
          {invoice.partyAddress ? (
            <Text style={styles.partyAddress}>{invoice.partyAddress}</Text>
          ) : null}

          <View style={styles.contactDetailsRow}>
            {invoice.contactNo ? (
              <View style={styles.contactItem}>
                <Icon name="phone-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{invoice.contactNo}</Text>
              </View>
            ) : null}
            {invoice.email ? (
              <View style={styles.contactItem}>
                <Icon name="email-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{invoice.email}</Text>
              </View>
            ) : null}
          </View>

          {invoice.ccEmail ? (
            <Text style={styles.ccText}>CC: {invoice.ccEmail}</Text>
          ) : null}

          {invoice.remark ? (
            <View style={styles.remarkBox}>
              <Text style={styles.remarkLabel}>Remarks:</Text>
              <Text style={styles.remarkContent}>{invoice.remark}</Text>
            </View>
          ) : null}
        </Card>

        {/* Items List */}
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionHeaderTitle}>Items ({invoice.items.length})</Text>
        </View>

        {invoice.items.map((item, index) => (
          <Card key={item.id || index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemIndexBadge}>
                <Text style={styles.itemIndexText}>#{index + 1}</Text>
              </View>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                {item.narration ? (
                  <Text style={styles.itemNarration}>{item.narration}</Text>
                ) : null}
              </View>
              <Text style={styles.itemAmount}>
                ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.itemMetaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Qty</Text>
                <Text style={styles.metaValue}>{item.quantity}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Rate</Text>
                <Text style={styles.metaValue}>₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>GST %</Text>
                <Text style={styles.metaValue}>{item.gstPercentage}%</Text>
              </View>
              {item.batchNo ? (
                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>Batch</Text>
                  <Text style={styles.metaValue}>{item.batchNo}</Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))}

        {/* Financial Summary */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ₹ {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {invoice.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: Colors.danger }]}>
                Discount ({invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Flat'})
              </Text>
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                - ₹ {invoice.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {invoice.totalGstAmount > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>
                  ₹ {(invoice.totalGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>
                  ₹ {(invoice.totalGstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          )}

          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Net Total</Text>
            <Text style={styles.grandTotalValue}>
              ₹ {invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.inWordsWrap}>
            <Text style={styles.inWordsLabel}>Amount in Words:</Text>
            <Text style={styles.inWordsVal}>{numberToWordsINR(invoice.totalAmount)}</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonGroup}>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EEF2FF', borderColor: Colors.primary }]}
              onPress={handlePreviewPdf}
              activeOpacity={0.8}
            >
              <Icon name="file-pdf-box" size={20} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Preview PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ECFDF5', borderColor: Colors.success }]}
              onPress={handleSharePdf}
              activeOpacity={0.8}
            >
              <Icon name="share-variant-outline" size={20} color={Colors.success} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Share PDF</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="email-send-outline" size={20} color="#ffffff" />
            <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Send Email to Client</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Icon name="trash-can-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Pro Forma Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Email Dispatch Modal */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Email Pro Forma Invoice</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Icon name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <InputField
                label="To Email *"
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                placeholder="client@domain.com"
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
                placeholder="Email Subject"
              />

              <View style={styles.messageWrap}>
                <Text style={styles.fieldLabel}>Message</Text>
                <TextInput
                  style={styles.textArea}
                  value={emailMessage}
                  onChangeText={setEmailMessage}
                  placeholder="Enter email message..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEmailModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <PrimaryButton
                  title={sendingEmail ? 'Sending...' : 'Send Invoice'}
                  onPress={handleSendEmail}
                  loading={sendingEmail}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
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
  headerDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  partyName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  partyAddress: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
  },
  ccText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  remarkBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  remarkLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  remarkContent: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  itemsHeader: {
    marginTop: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemIndexBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemIndexText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  itemThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  itemName: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  itemNarration: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  itemAmount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  itemMetaGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    justifyContent: 'space-around',
  },
  metaCell: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  summaryValue: {
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
  inWordsVal: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  actionButtonGroup: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
    marginTop: Spacing.xs,
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: Typography.fontSizes.xs,
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
  notFoundText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  fieldLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageWrap: {
    marginBottom: Spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
});
