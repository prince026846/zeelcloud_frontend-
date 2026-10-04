import { Linking, Platform } from 'react-native';
import type { Company } from '../types';

const formatAmount = (amount: number) =>
  amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lastTenDigits = (phone: string) => phone.replace(/\D/g, '').slice(-10);

export const buildOutstandingReminderMessage = ({
  recipientName,
  amount,
  company,
}: {
  recipientName: string;
  amount: number;
  company: Company | null;
}): string => {
  const companyName = company?.name ?? '';
  return [
    `To,${recipientName}`,
    `This is to remind you that your payment of *₹${formatAmount(amount)}* is still outstanding. Please make the payment on or before the due date.`,
    'Thanks & Regards, ',
    `*${companyName}*`,
    '',
    '*Bank Details*',
    `Bank Name  : ${company?.bankName ?? ''}`,
    `Branch     : ${company?.branchName ?? ''}`,
    `Account No : ${company?.accountNo ?? ''}`,
    `IFSC Code  : ${company?.ifscCode ?? ''}`,
  ].join('\n');
};

export const openWhatsAppReminder = (phone: string | undefined, message: string) => {
  if (!phone) return;
  const digits = lastTenDigits(phone);
  if (!digits) return;
  const text = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=91${digits}&text=${text}`;
  const webUrl = `https://wa.me/91${digits}?text=${text}`;
  Linking.openURL(appUrl).catch(() => {
    Linking.openURL(webUrl).catch(() => {});
  });
};

export const openSmsReminder = (phone: string | undefined, message: string) => {
  if (!phone) return;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  const body = encodeURIComponent(message);
  // Android uses ?body= ; iOS uses &body=
  const url =
    Platform.OS === 'ios' ? `sms:${digits}&body=${body}` : `sms:${digits}?body=${body}`;
  Linking.openURL(url).catch(() => {});
};
