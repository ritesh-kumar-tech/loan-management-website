export interface UpiPaymentConfig {
  upiId?: string;
  payeeName?: string;
  amount?: number;
  transactionNote?: string;
}

export interface UpiPaymentUrlResult {
  upiUrl: string;
  normalizedUpiId: string;
  normalizedPayeeName: string;
  normalizedAmount: string;
}

export const UPI_CURRENCY = 'INR';
export const DEFAULT_UPI_TRANSACTION_NOTE = 'Loan Repayment';

const UPI_VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9._-]{1,63}$/;

export const isValidUpiVpa = (upiId?: string): boolean => {
  const normalizedUpiId = upiId?.trim();
  return Boolean(normalizedUpiId && UPI_VPA_PATTERN.test(normalizedUpiId));
};

export const formatUpiAmount = (amount?: number): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return '';
  }

  return amount.toFixed(2).replace(/\.00$/, '');
};

export const createUpiPaymentUrl = ({
  upiId,
  payeeName,
  amount,
  transactionNote = DEFAULT_UPI_TRANSACTION_NOTE,
}: UpiPaymentConfig): UpiPaymentUrlResult | null => {
  const normalizedUpiId = upiId?.trim() || '';
  const normalizedPayeeName = payeeName?.trim() || '';
  const normalizedAmount = formatUpiAmount(amount);
  const normalizedTransactionNote = transactionNote.trim() || DEFAULT_UPI_TRANSACTION_NOTE;

  if (!isValidUpiVpa(normalizedUpiId) || !normalizedPayeeName || !normalizedAmount) {
    return null;
  }

  const upiUrl =
    `upi://pay?pa=${encodeURIComponent(normalizedUpiId)}` +
    `&pn=${encodeURIComponent(normalizedPayeeName)}` +
    `&am=${encodeURIComponent(normalizedAmount)}` +
    `&cu=${encodeURIComponent(UPI_CURRENCY)}` +
    `&tn=${encodeURIComponent(normalizedTransactionNote)}`;

  return {
    upiUrl,
    normalizedUpiId,
    normalizedPayeeName,
    normalizedAmount,
  };
};

export const createQrCodeImageUrl = (upiUrl: string, size = 250): string => (
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`
);
