import assert from 'node:assert/strict';
import test from 'node:test';

import { createReminderContent } from '../src/services/notificationPlanner';
import type { AppDataSnapshot } from '../src/types/models';

function createSnapshot(): AppDataSnapshot {
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
  return {
    trips: [
      {
        id: 'trip_1',
        name: 'Spain getaway',
        destination: 'Malaga',
        destinationType: 'place',
        startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
        coverImageUri: null,
        heroImageRemoteUrl: null,
        heroImageStatus: 'idle',
        notes: '',
        transferSummary: '',
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      },
    ],
    travellers: [],
    documents: [
      {
        id: 'doc_1',
        tripId: 'trip_1',
        travellerId: null,
        holderName: 'Passport',
        documentType: 'passport',
        documentNumber: '1234',
        issueDate: null,
        expiryDate: expiry,
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
      expiryReminderSilent: true,
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

test('document reminder scheduling creates future reminders for the selected schedule', () => {
  const reminders = createReminderContent(createSnapshot());
  assert.equal(reminders.length, 5);
  assert.equal(reminders.every((item) => item.silent === true), true);
  assert.equal(reminders[0]?.title, 'Travel document reminder');
  assert.equal(reminders[0]?.body.includes('passport'), false);
  assert.equal(reminders[0]?.body.includes('Passport'), false);
});

test('deleting a document removes its scheduled expiry reminders from generated content', () => {
  const snapshot = createSnapshot();
  snapshot.documents = [];
  const reminders = createReminderContent(snapshot);
  assert.equal(reminders.some((item) => item.title === 'Travel document reminder'), false);
});
