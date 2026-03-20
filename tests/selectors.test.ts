import assert from 'node:assert/strict';
import test from 'node:test';

import { getDashboardAlerts, getDocumentExpiryOverview } from '../src/utils/selectors';
import type { AppDataSnapshot } from '../src/types/models';

function createSnapshot(): AppDataSnapshot {
  const now = new Date().toISOString();
  return {
    trips: [
      {
        id: 'trip_1',
        name: 'Beach week',
        destination: 'Corfu',
        destinationType: 'place',
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
        destinationImageLocalPath: null,
        destinationImageRemoteUrl: null,
        destinationImageSource: 'fallback',
        attributionText: 'Default trip background',
        attributionMeta: { source: 'fallback', sourceLabel: 'Default trip background' },
        coverImageUri: null,
        heroImageRemoteUrl: null,
        heroImageStatus: 'idle',
        notes: '',
        transferSummary: '',
        transferProvider: '',
        transferMethod: '',
        transferLocation: '',
        transferTime: null,
        transferNotes: '',
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      },
    ],
    travellers: [
      {
        id: 'traveller_1',
        tripId: 'trip_1',
        fullName: 'Grace Boyle',
        dateOfBirth: null,
        passportNationality: 'British',
        passportNumber: '1234',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: '#F4B400',
        relationshipType: 'adult',
        createdAt: now,
        updatedAt: now,
      },
    ],
    documents: [
      {
        id: 'doc_1',
        tripId: 'trip_1',
        travellerId: 'traveller_1',
        holderName: 'Grace Boyle',
        documentType: 'passport',
        documentNumber: '1234',
        issueDate: null,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        expiryReminderEnabled: true,
        expiryReminderSchedule: [90, 30, 7, 1, 0],
        expiredStatus: false,
        expiringSoonStatus: true,
        notes: '',
        localFileUri: 'file:///passport.jpg',
        previewUri: null,
        mimeType: 'image/jpeg',
        sensitive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'doc_2',
        tripId: 'trip_1',
        travellerId: null,
        holderName: 'Trip insurance',
        documentType: 'insurance',
        documentNumber: 'ABC',
        issueDate: null,
        expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiryReminderEnabled: false,
        expiryReminderSchedule: [30, 7, 1, 0],
        expiredStatus: true,
        expiringSoonStatus: false,
        notes: '',
        localFileUri: 'file:///insurance.pdf',
        previewUri: null,
        mimeType: 'application/pdf',
        sensitive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    packingItems: [],
    travelSegments: [],
    hotelStays: [],
    itineraryEvents: [],
    emergencyInfos: [],
    reminderSettings: [],
    appPreferences: {
      id: 'app',
      notificationsEnabled: true,
      expiryRemindersEnabled: true,
      expiryReminderSchedule: [90, 30, 7, 1, 0],
      expiryReminderSilent: false,
      structuredDataProtected: true,
      syncEnabled: false,
      syncMode: 'manual_share',
      syncStatus: 'local_only',
      lastSyncAt: null,
      lastBackupAt: null,
      privacyMaskingMode: 'always',
      createdAt: now,
      updatedAt: now,
    },
    tripParticipants: [],
    tripInvites: [],
    sharedTripStates: [],
    syncConflicts: [],
  };
}

test('home dashboard expiry overview counts expired and expiring documents', () => {
  const overview = getDocumentExpiryOverview(createSnapshot(), 'trip_1');
  assert.deepEqual(overview, {
    expiredCount: 1,
    expiringCount: 1,
  });
});

test('dashboard alerts include expiry-related warnings', () => {
  const alerts = getDashboardAlerts(createSnapshot(), 'trip_1');
  assert.equal(alerts.some((alert) => alert.title.includes('Passport') || alert.title.includes('Expired document')), true);
});
