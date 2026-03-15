import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPassportCopyPayload, buildPassportMrz, derivePassportData, getPassportVerificationStatus } from '../src/utils/passport';
import type { Document, Traveller } from '../src/types/models';

const traveller: Traveller = {
  id: 'traveller_1',
  tripId: 'trip_1',
  fullName: 'Erika Mustermann',
  dateOfBirth: '1988-04-12',
  passportNationality: 'DEU',
  passportNumber: '',
  ghicNumber: '',
  medicalNote: '',
  notes: '',
  avatarColor: '#F4B400',
  relationshipType: 'adult',
  createdAt: '',
  updatedAt: '',
};

const passportDocument: Document = {
  id: 'document_1',
  tripId: 'trip_1',
  travellerId: 'traveller_1',
  holderName: 'Erika Mustermann',
  documentType: 'passport',
  documentNumber: 'C01X00AA1',
  issueDate: '2023-05-01',
  expiryDate: '2033-05-01',
  expiryReminderEnabled: true,
  expiryReminderSchedule: [90, 30, 7, 1, 0],
  expiredStatus: false,
  expiringSoonStatus: false,
  notes: '',
  localFileUri: 'file:///passport.jpg',
  previewUri: 'file:///passport.jpg',
  mimeType: 'image/jpeg',
  passportData: {
    passportType: 'P',
    countryCode: 'DEU',
    surname: 'Mustermann',
    givenNames: 'Erika',
    nationality: 'German',
    dateOfBirth: '1988-04-12',
    placeOfBirth: 'Berlin',
  },
  sensitive: true,
  createdAt: '',
  updatedAt: '',
};

test('passport data derives from stored fields and traveller fallback', () => {
  const derived = derivePassportData(passportDocument, traveller);
  assert.equal(derived.surname, 'Mustermann');
  assert.equal(derived.givenNames, 'Erika');
  assert.equal(derived.countryCode, 'DEU');
});

test('passport mrz produces two 44-character lines', () => {
  const [lineOne, lineTwo] = buildPassportMrz(passportDocument, traveller);
  assert.equal(lineOne.length, 44);
  assert.equal(lineTwo.length, 44);
  assert.equal(lineOne.startsWith('P<DEU'), true);
});

test('passport verification reflects scan and extracted completeness', () => {
  assert.equal(getPassportVerificationStatus(passportDocument, traveller), 'verified');
  assert.equal(
    getPassportVerificationStatus({ localFileUri: '', passportData: null }, traveller),
    'review'
  );
});

test('passport copy payload includes key passport fields', () => {
  const payload = buildPassportCopyPayload(passportDocument, traveller);
  assert.equal(payload.includes('Passport number: C01X00AA1'), true);
  assert.equal(payload.includes('Place of birth: Berlin'), true);
});
