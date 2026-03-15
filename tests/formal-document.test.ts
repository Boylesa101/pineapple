import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDocumentRecord } from '../src/utils/documentExpiry';
import {
  buildFormalDocumentCopyPayload,
  deriveFormalDocumentData,
  ensureFormalDocumentDraftData,
  getFormalDocumentVerificationStatus,
  isFormalDocumentType,
} from '../src/utils/formalDocument';
import { applyFormalDocumentOcrToDraft, canRunFormalDocumentOcr, parseFormalDocumentOcrText } from '../src/utils/formalDocumentOcr';

test('formal document OCR parser extracts labelled metadata', () => {
  const parsed = parseFormalDocumentOcrText(
    `Title: Annual travel insurance certificate
Issuer: Pineapple Mutual
Name: Henry Boyle
Policy Number: PLN-445566
Issue Date: 2026-01-02
Expiry Date: 2027-01-02
Location: Spain
Summary: Winter sun cover`
  );

  assert.ok(parsed);
  assert.equal(parsed.holderName, 'Henry Boyle');
  assert.equal(parsed.documentNumber, 'PLN-445566');
  assert.equal(parsed.issueDate, '2026-01-02');
  assert.equal(parsed.expiryDate, '2027-01-02');
  assert.equal(parsed.formalDocumentData.title, 'Annual Travel Insurance Certificate');
  assert.equal(parsed.formalDocumentData.issuer, 'Pineapple Mutual');
  assert.equal(parsed.formalDocumentData.location, 'Spain');
});

test('formal document draft wiring keeps derived defaults and OCR fields editable', () => {
  const draft = ensureFormalDocumentDraftData({
    tripId: 'trip_1',
    travellerId: 'traveller_1',
    holderName: '',
    documentType: 'insurance',
    documentNumber: '',
    issueDate: null,
    expiryDate: null,
    expiryReminderEnabled: true,
    expiryReminderSchedule: [90, 30, 7, 1, 0],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: '',
    localFileUri: 'file:///insurance.pdf',
    previewUri: null,
    mimeType: 'application/pdf',
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    healthCardData: null,
    paymentCardData: null,
    formalDocumentData: null,
    sensitive: true,
  });

  assert.equal(draft.formalDocumentData?.title, 'Insurance record');

  const parsed = parseFormalDocumentOcrText(
    `Document: Insurance confirmation
Provider: Pineapple Mutual
Traveller: Henry Boyle
Reference Number: PLN-445566
Expires: 02.01.2027`
  );

  assert.ok(parsed);
  const merged = applyFormalDocumentOcrToDraft(draft, parsed);
  assert.equal(merged.holderName, 'Henry Boyle');
  assert.equal(merged.documentNumber, 'PLN-445566');
  assert.equal(merged.expiryDate, '2027-01-02');
  assert.equal(merged.formalDocumentData?.issuer, 'Pineapple Mutual');
  assert.equal(getFormalDocumentVerificationStatus(merged as any), 'verified');
  assert.equal(canRunFormalDocumentOcr(merged), true);
});

test('formal document helpers build copy payload and type matching correctly', () => {
  const document = {
    documentType: 'hotel_booking',
    holderName: 'Grace Boyle',
    documentNumber: 'BOOK-778899',
    issueDate: '2026-05-01',
    expiryDate: '2026-05-08',
    notes: 'Late arrival',
    formalDocumentData: {
      title: 'Hotel confirmation',
      issuer: 'Ocean View Suites',
      referenceCode: 'BOOK-778899',
      location: 'Malaga',
      status: 'Confirmed',
      summary: 'Seven-night stay',
    },
  } as const;

  const payload = buildFormalDocumentCopyPayload(document as any);
  assert.match(payload, /Hotel confirmation/);
  assert.match(payload, /Issuer: Ocean View Suites/);
  assert.match(payload, /Reference: BOOK-778899/);
  assert.equal(isFormalDocumentType('hotel_booking'), true);
  assert.equal(isFormalDocumentType('passport'), false);
  assert.equal(deriveFormalDocumentData(document as any).status, 'Confirmed');
});

test('legacy formal-document records normalize safely', () => {
  const document = normalizeDocumentRecord({
    id: 'doc_1',
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Henry Boyle',
    documentType: 'insurance',
    documentNumber: 'PLN-445566',
    issueDate: '2026-01-02',
    expiryDate: '2027-01-02',
    notes: 'Annual cover',
    localFileUri: 'file:///insurance.pdf',
    previewUri: null,
    mimeType: 'application/pdf',
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    healthCardData: null,
    paymentCardData: null,
    formalDocumentData: {
      title: 'Insurance certificate',
      issuer: 'Pineapple Mutual',
      referenceCode: 'PLN-445566',
      location: 'Spain',
      status: 'Stored',
      summary: 'Annual cover',
    },
    sensitive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(document.formalDocumentData?.issuer, 'Pineapple Mutual');
  assert.equal(document.expiredStatus, false);
});

test('formal document OCR flags ambiguous references and dates for review', () => {
  const parsed = parseFormalDocumentOcrText(
    `Title: Travel insurance
Reference Number: PLN-445566
Booking Reference: ALT-778899
Issue Date: 02.01.2026
Expiry Date: 02.01.2027
Valid Until: 02.01.2028
Name: Henry Boyle`
  );

  assert.ok(parsed);
  assert.equal(parsed.warnings.length >= 1, true);
});
