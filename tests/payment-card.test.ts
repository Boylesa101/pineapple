import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPaymentCardCopyPayload, ensurePaymentCardDraftData, getPaymentCardVerificationStatus, maskPaymentCardNumber } from '../src/utils/paymentCard';

test('payment card masking keeps only the last 4 digits visible', () => {
  assert.equal(maskPaymentCardNumber('4242 1234 5678 9012'), '•••• •••• •••• 9012');
});

test('payment card draft wiring creates secure defaults', () => {
  const draft = ensurePaymentCardDraftData({
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Henry Boyle',
    documentType: 'payment_card',
    documentNumber: '4242123456789012',
    issueDate: null,
    expiryDate: '2029-08-01',
    expiryReminderEnabled: true,
    expiryReminderSchedule: [90, 30, 7, 1, 0],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: 'Use for hotel incidentals',
    localFileUri: '',
    previewUri: null,
    mimeType: null,
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    healthCardData: null,
    paymentCardData: null,
    sensitive: true,
  });

  assert.equal(draft.paymentCardData?.cardType, 'Debit');
  assert.equal(getPaymentCardVerificationStatus(draft as any), 'review');
});

test('payment card copy payload excludes the full number and cvv', () => {
  const payload = buildPaymentCardCopyPayload({
    holderName: 'Henry Boyle',
    documentNumber: '4242123456789012',
    expiryDate: '2029-08-01',
    notes: 'Travel fallback card',
    paymentCardData: {
      cardType: 'Visa Debit',
      bank: 'Barclays',
      billingDetails: 'Use for travel emergencies',
      cvv: '123',
    },
  } as any);

  assert.match(payload, /•••• •••• •••• 9012/);
  assert.equal(payload.includes('4242123456789012'), false);
  assert.equal(payload.includes('123'), false);
});
