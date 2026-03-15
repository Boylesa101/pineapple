import assert from 'node:assert/strict';
import test from 'node:test';

import type { DocumentDraft } from '../src/types/models';
import {
  applyDrivingLicenceOcrToDraft,
  canRunDrivingLicenceOcr,
  parseDrivingLicenceOcrText,
} from '../src/utils/drivingLicenceOcr';

const drivingLicenceDraft: DocumentDraft = {
  tripId: 'trip_1',
  travellerId: 'traveller_1',
  holderName: '',
  documentType: 'driving_licence',
  documentNumber: '',
  issueDate: null,
  expiryDate: null,
  expiryReminderEnabled: true,
  expiryReminderSchedule: [90, 30, 7, 1, 0],
  expiredStatus: false,
  expiringSoonStatus: false,
  notes: '',
  localFileUri: 'file:///licence-front.jpg',
  previewUri: 'file:///licence-front.jpg',
  mimeType: 'image/jpeg',
  passportData: null,
  secondaryLocalFileUri: null,
  secondaryPreviewUri: null,
  secondaryMimeType: null,
  drivingLicenceData: null,
  healthCardData: null,
  sensitive: true,
};

test('driving licence OCR parser extracts core labelled fields', () => {
  const parsed = parseDrivingLicenceOcrText(
    `1. DOE\n2. JANE ALICE\n3. 14.08.1990\n4A. 01.06.2020\n4B. 01.06.2030\n4C. DVLA\n5. DOEJA908140AA9BC\n8. 12 SAMPLE STREET\nLONDON\n9. AM, B, BE`
  );

  assert.ok(parsed);
  assert.equal(parsed.holderName, 'Jane Alice Doe');
  assert.equal(parsed.documentNumber, 'DOEJA908140AA9BC');
  assert.equal(parsed.issueDate, '2020-06-01');
  assert.equal(parsed.expiryDate, '2030-06-01');
  assert.equal(parsed.drivingLicenceData.address, '12 Sample Street, London');
  assert.equal(parsed.drivingLicenceData.categories, 'AM, B, BE');
  assert.equal(parsed.drivingLicenceData.issuingAuthority, 'Dvla');
});

test('driving licence OCR merge fills draft fields', () => {
  const parsed = parseDrivingLicenceOcrText(
    `1. DOE\n2. JANE ALICE\n4B. 01.06.2030\n5. DOEJA908140AA9BC\n8. 12 SAMPLE STREET`
  );

  assert.ok(parsed);
  const merged = applyDrivingLicenceOcrToDraft(drivingLicenceDraft, parsed);
  assert.equal(merged.holderName, 'Jane Alice Doe');
  assert.equal(merged.documentNumber, 'DOEJA908140AA9BC');
  assert.equal(merged.expiryDate, '2030-06-01');
  assert.equal(merged.drivingLicenceData?.address, '12 Sample Street');
});

test('driving licence OCR supports local images and pdfs', () => {
  assert.equal(canRunDrivingLicenceOcr(drivingLicenceDraft), true);
  assert.equal(
    canRunDrivingLicenceOcr({
      ...drivingLicenceDraft,
      mimeType: 'application/pdf',
      localFileUri: 'file:///licence.pdf',
      previewUri: null,
    }),
    true
  );
});
