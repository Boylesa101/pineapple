import type { Document, DocumentDraft, PaymentCardData, Traveller, VerificationStatus } from '@/types/models';

export function createEmptyPaymentCardData(): PaymentCardData {
  return {
    cardType: 'Debit',
    bank: '',
    billingDetails: '',
    cvv: '',
  };
}

export function normalizePaymentCardData(value: PaymentCardData | null | undefined) {
  if (!value) {
    return null;
  }

  return {
    ...createEmptyPaymentCardData(),
    ...value,
  };
}

export function derivePaymentCardData(
  document: Pick<Document, 'paymentCardData'>,
  _traveller?: Traveller | null
) {
  const existing = normalizePaymentCardData(document.paymentCardData);

  return {
    ...createEmptyPaymentCardData(),
    ...existing,
  } satisfies PaymentCardData;
}

export function ensurePaymentCardDraftData(draft: DocumentDraft, traveller?: Traveller | null) {
  if (draft.documentType !== 'payment_card') {
    return {
      ...draft,
      paymentCardData: null,
    };
  }

  return {
    ...draft,
    paymentCardData: derivePaymentCardData(draft as Document, traveller),
  };
}

function sanitizeCardNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
}

export function formatPaymentCardNumber(value: string) {
  const digits = sanitizeCardNumber(value);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function maskPaymentCardNumber(value: string) {
  const digits = sanitizeCardNumber(value);
  if (!digits) {
    return '•••• 0000';
  }

  const lastFour = digits.slice(-4);
  return `•••• •••• •••• ${lastFour}`.trim();
}

export function getPaymentCardVerificationStatus(
  document: Pick<Document, 'localFileUri' | 'paymentCardData' | 'documentNumber'>
): VerificationStatus {
  const data = derivePaymentCardData(document as Document);
  const filledFields = [document.documentNumber, data.cardType, data.bank, data.billingDetails].filter(Boolean).length;

  if (Boolean(document.localFileUri) && filledFields >= 3) {
    return 'verified';
  }

  if (filledFields >= 2) {
    return 'review';
  }

  return 'unverified';
}

export function buildPaymentCardCopyPayload(
  document: Pick<Document, 'holderName' | 'documentNumber' | 'expiryDate' | 'paymentCardData' | 'notes'>
) {
  const data = derivePaymentCardData(document as Document);

  return [
    'Payment card',
    `Card holder: ${document.holderName || 'Not set'}`,
    `Card type: ${data.cardType || 'Not set'}`,
    `Masked number: ${maskPaymentCardNumber(document.documentNumber)}`,
    `Expiry: ${document.expiryDate || 'Not set'}`,
    `Bank: ${data.bank || 'Not set'}`,
    `Billing details: ${data.billingDetails || document.notes || 'Not set'}`,
  ].join('\n');
}
