import assert from 'node:assert/strict';
import test from 'node:test';

import type { Document, Traveller } from '../src/types/models';
import {
  buildDrivingLicenceCopyPayload,
  deriveDrivingLicenceData,
  getDrivingLicenceVerificationStatus,
} from '../src/utils/drivingLicence';

const traveller: Traveller = {
  id: 'traveller_1',
  tripId: 'trip_1',
  fullName: 'Jamie Taylor',
  dateOfBirth: '1990-07-08',
  passportNationality: 'GBR',
  passportNumber: '',
  ghicNumber: '',
  medicalNote: '',
  notes: '',
  avatarColor: '#F4B400',
  relationshipType: 'adult',
  createdAt: '',
  updatedAt: '',
};

const drivingLicence: Document = {
  id: 'document_1',
  tripId: 'trip_1',
  travellerId: 'traveller_1',
  holderName: 'Jamie Taylor',
  documentType: 'driving_licence',
  documentNumber: 'TAYLO907081JT9AB',
  issueDate: '2022-06-01',
  expiryDate: '2032-06-01',
  expiryReminderEnabled: true,
  expiryReminderSchedule: [90, 30, 7, 1, 0],
  expiredStatus: false,
  expiringSoonStatus: false,
  notes: '',
  localFileUri: 'file:///licence-front.jpg',
  previewUri: 'file:///licence-front.jpg',
  mimeType: 'image/jpeg',
  passportData: null,
  secondaryLocalFileUri: 'file:///licence-back.jpg',
  secondaryPreviewUri: 'file:///licence-back.jpg',
  secondaryMimeType: 'image/jpeg',
  drivingLicenceData: {
    address: '1 Beach Road, Brighton',
    dateOfBirth: '1990-07-08',
    categories: 'B BE',
    issuingAuthority: 'DVLA',
    status: 'Valid',
  },
  sensitive: true,
  createdAt: '',
  updatedAt: '',
};

test('driving licence data derives with traveller fallback', () => {
  const derived = deriveDrivingLicenceData({ holderName: '', drivingLicenceData: null } as Document, traveller);
  assert.equal(derived.dateOfBirth, '1990-07-08');
  assert.equal(derived.status, 'Valid');
});

test('driving licence verification reflects scans and extracted completeness', () => {
  assert.equal(getDrivingLicenceVerificationStatus(drivingLicence, traveller), 'verified');
  assert.equal(
    getDrivingLicenceVerificationStatus({ localFileUri: 'file:///front.jpg', secondaryLocalFileUri: null, drivingLicenceData: null } as Document, traveller),
    'review'
  );
});

test('driving licence copy payload includes the core record', () => {
  const payload = buildDrivingLicenceCopyPayload(drivingLicence, traveller);
  assert.equal(payload.includes('Licence number: TAYLO907081JT9AB'), true);
  assert.equal(payload.includes('Issuing authority: DVLA'), true);
});
