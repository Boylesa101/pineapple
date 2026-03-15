import assert from 'node:assert/strict';
import test from 'node:test';

import type { DocumentDraft } from '../src/types/models';
import { applyPassportOcrToDraft, hasPassportImageForOcr, parsePassportOcrText } from '../src/utils/passportOcr';

const passportDraft: DocumentDraft = {
  tripId: 'trip_1',
  travellerId: 'traveller_1',
  holderName: '',
  documentType: 'passport',
  documentNumber: '',
  issueDate: null,
  expiryDate: null,
  expiryReminderEnabled: true,
  expiryReminderSchedule: [90, 30, 7, 1, 0],
  expiredStatus: false,
  expiringSoonStatus: false,
  notes: '',
  localFileUri: 'file:///passport.jpg',
  previewUri: 'file:///passport.jpg',
  mimeType: 'image/jpeg',
  passportData: null,
  sensitive: true,
};

test('passport OCR parser extracts core fields from MRZ text', () => {
  const parsed = parsePassportOcrText(
    `P<UTOMUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<\nC01X00AA1<UTO8804121F3305012<<<<<<<<<<<<<<`
  );

  assert.ok(parsed);
  assert.equal(parsed.source, 'mrz');
  assert.equal(parsed.documentNumber, 'C01X00AA1');
  assert.equal(parsed.expiryDate, '2033-05-01');
  assert.equal(parsed.passportData.surname, 'Mustermann');
  assert.equal(parsed.passportData.givenNames, 'Erika');
});

test('passport OCR parser falls back to labelled text', () => {
  const parsed = parsePassportOcrText(
    `Surname: Mustermann\nGiven Names: Erika Maria\nPassport Number: C01X00AA1\nDate of Birth: 12.04.1988\nDate of Expiry: 01.05.2033\nPlace of Birth: Berlin`
  );

  assert.ok(parsed);
  assert.equal(parsed.source, 'text');
  assert.equal(parsed.documentNumber, 'C01X00AA1');
  assert.equal(parsed.expiryDate, '2033-05-01');
  assert.equal(parsed.passportData.surname, 'Mustermann');
  assert.equal(parsed.passportData.givenNames, 'Erika Maria');
});

test('passport OCR result merges into draft fields', () => {
  const parsed = parsePassportOcrText(
    `P<UTOMUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<\nC01X00AA1<UTO8804121F3305012<<<<<<<<<<<<<<`
  );

  assert.ok(parsed);
  const merged = applyPassportOcrToDraft(passportDraft, parsed);
  assert.equal(merged.documentNumber, 'C01X00AA1');
  assert.equal(merged.expiryDate, '2033-05-01');
  assert.equal(merged.passportData?.countryCode, 'UTO');
});

test('passport OCR only enables for local image scans', () => {
  assert.equal(hasPassportImageForOcr(passportDraft), true);
  assert.equal(
    hasPassportImageForOcr({ ...passportDraft, mimeType: 'application/pdf', previewUri: null, localFileUri: 'file:///passport.pdf' }),
    false
  );
});
