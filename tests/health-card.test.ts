import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDocumentRecord } from '../src/utils/documentExpiry';
import { buildHealthCardCopyPayload, deriveHealthCardData, ensureHealthCardDraftData, getHealthCardVerificationStatus } from '../src/utils/healthCard';
import { applyHealthCardOcrToDraft, canRunHealthCardOcr, parseHealthCardOcrText } from '../src/utils/healthCardOcr';

test('health card OCR parser extracts labelled fields', () => {
  const parsed = parseHealthCardOcrText(
    `Name: Henry Boyle\nCard Number: GHIC11223344\nIssuer: NHS Business Services Authority\nIssue Date: 01.01.2024\nExpiry Date: 01.01.2029\nCountry Code: GBR\nEmergency Line: +44 191 218 1999`
  );

  assert.ok(parsed);
  assert.equal(parsed.holderName, 'Henry Boyle');
  assert.equal(parsed.documentNumber, 'GHIC11223344');
  assert.equal(parsed.issueDate, '2024-01-01');
  assert.equal(parsed.expiryDate, '2029-01-01');
  assert.equal(parsed.healthCardData.issuer, 'Nhs Business Services Authority');
  assert.equal(parsed.healthCardData.countryCode, 'GBR');
});

test('health card draft wiring keeps editable extracted fields', () => {
  const draft = ensureHealthCardDraftData({
    tripId: 'trip_1',
    travellerId: 'traveller_1',
    holderName: 'Henry Boyle',
    documentType: 'ghic',
    documentNumber: '',
    issueDate: null,
    expiryDate: null,
    expiryReminderEnabled: true,
    expiryReminderSchedule: [90, 30, 7, 1, 0],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: '',
    localFileUri: 'file:///ghic.jpg',
    previewUri: 'file:///ghic.jpg',
    mimeType: 'image/jpeg',
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    healthCardData: null,
    sensitive: true,
  });

  const parsed = parseHealthCardOcrText(
    `Name: Henry Boyle\nCard Number: GHIC11223344\nIssuer: NHS Business Services Authority\nExpiry Date: 01.01.2029`
  );

  assert.ok(parsed);
  const merged = applyHealthCardOcrToDraft(draft, parsed);
  const data = deriveHealthCardData(merged as any);
  assert.equal(merged.documentNumber, 'GHIC11223344');
  assert.equal(data.issuer, 'Nhs Business Services Authority');
  assert.equal(getHealthCardVerificationStatus(merged as any), 'verified');
  assert.match(buildHealthCardCopyPayload(merged as any), /GHIC11223344/);
  assert.equal(canRunHealthCardOcr(merged), true);
});

test('legacy health-card records normalize with healthCardData intact', () => {
  const document = normalizeDocumentRecord({
    id: 'doc_1',
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Henry Boyle',
    documentType: 'ghic',
    documentNumber: 'GHIC11223344',
    issueDate: '2024-01-01',
    expiryDate: '2029-01-01',
    notes: '',
    localFileUri: 'file:///ghic.jpg',
    previewUri: 'file:///ghic.jpg',
    mimeType: 'image/jpeg',
    passportData: null,
    secondaryLocalFileUri: null,
    secondaryPreviewUri: null,
    secondaryMimeType: null,
    drivingLicenceData: null,
    healthCardData: {
      issuer: 'NHS',
      countryCode: 'GBR',
      emergencyLine: '111',
      status: 'Active',
    },
    sensitive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(document.healthCardData?.issuer, 'NHS');
  assert.equal(document.expiredStatus, false);
});
