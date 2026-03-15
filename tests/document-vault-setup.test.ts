import assert from 'node:assert/strict';
import test from 'node:test';

import { getDocumentVaultSetupState } from '../src/utils/documentVaultSetup';

test('vault setup flags first-time docs state when there are no documents yet', () => {
  const state = getDocumentVaultSetupState({
    documents: [],
    travellers: [],
    security: { pinConfigured: false },
  });

  assert.equal(state.isFirstTime, true);
  assert.equal(state.needsTravellerName, true);
  assert.equal(state.needsSecuritySetup, true);
  assert.equal(state.hasIdentityDocument, false);
  assert.equal(state.hasHealthCard, false);
  assert.equal(state.hasInsuranceRecord, false);
});

test('vault setup stops onboarding once a document already exists', () => {
  const state = getDocumentVaultSetupState({
    documents: [
      {
        id: 'doc_1',
        tripId: 'trip_1',
        travellerId: 'traveller_1',
        holderName: 'Henry Boyle',
        documentType: 'passport',
        documentNumber: '123456789',
        issueDate: null,
        expiryDate: null,
        expiryReminderEnabled: true,
        expiryReminderSchedule: [90, 30, 7, 1, 0],
        expiredStatus: false,
        expiringSoonStatus: false,
        notes: '',
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
        formalDocumentData: null,
        sensitive: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    travellers: [
      {
        id: 'traveller_1',
        tripId: 'trip_1',
        fullName: 'Henry Boyle',
        dateOfBirth: null,
        passportNationality: '',
        passportNumber: '',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: '#F4B400',
        relationshipType: 'adult',
        createdAt: '',
        updatedAt: '',
      },
    ],
    security: { pinConfigured: true },
  });

  assert.equal(state.isFirstTime, false);
  assert.equal(state.needsTravellerName, false);
  assert.equal(state.needsSecuritySetup, false);
  assert.equal(state.hasIdentityDocument, true);
});
