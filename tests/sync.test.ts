import test from 'node:test';
import assert from 'node:assert/strict';

import { createSharedTripPacket, importSharedTripPacket, parseSharedTripPacket } from '@/services/sync';
import type { AppDataSnapshot } from '@/types/models';

function createSnapshot(): AppDataSnapshot {
  const timestamp = '2026-04-12T10:00:00.000Z';

  return {
    trips: [
      {
        id: 'trip_1',
        name: 'Paris',
        destination: 'Paris',
        destinationType: 'place',
        startDate: timestamp,
        endDate: '2026-04-16T10:00:00.000Z',
        destinationImageLocalPath: null,
        destinationImageRemoteUrl: null,
        destinationImageSource: 'fallback',
        attributionText: 'Default Pineapple image',
        attributionMeta: { source: 'fallback', sourceLabel: 'Default Pineapple image' },
        coverImageUri: null,
        heroImageRemoteUrl: null,
        heroImageStatus: 'idle',
        notes: '',
        transferSummary: '',
        transferProvider: '',
        transferMethod: '',
        transferLocation: '',
        transferTime: null,
        airportTravelDurationMinutes: null,
        transferNotes: '',
        status: 'upcoming',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    travellers: [
      {
        id: 'traveller_1',
        tripId: 'trip_1',
        fullName: 'Alex Pine',
        photoUri: null,
        dateOfBirth: null,
        passportNationality: 'British',
        passportNumber: '',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: '#1EAAF0',
        relationshipType: 'adult',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    documents: [],
    packingItems: [],
    travelSegments: [],
    hotelStays: [],
    itineraryEvents: [],
    emergencyInfos: [],
    reminderSettings: [],
    savedVibes: [],
    vibeCacheEntries: [],
    appPreferences: {
      id: 'app',
      appLanguage: 'en-GB',
      notificationsEnabled: false,
      expiryRemindersEnabled: true,
      expiryReminderSchedule: [180, 90, 30],
      expiryReminderSilent: false,
      structuredDataProtected: true,
      profileName: 'Alex Pine',
      profilePhotoUri: null,
      travelStyle: 'mixed',
      syncEnabled: false,
      syncMode: 'manual_share',
      syncStatus: 'local_only',
      lastSyncAt: null,
      lastBackupAt: null,
      privacyMaskingMode: 'always',
      vibesIntroSeenAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    tripParticipants: [
      {
        id: 'participant_1',
        tripId: 'trip_1',
        displayName: 'Alex Pine',
        email: '',
        role: 'owner',
        avatarColor: '#1EAAF0',
        inviteCode: 'PINE-ABCD-EFGH',
        isLocalProfile: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    tripInvites: [],
    sharedTripStates: [],
    syncConflicts: [],
  };
}

test('shared trip packets round-trip with integrity metadata', () => {
  const snapshot = createSnapshot();
  const packet = createSharedTripPacket(snapshot, 'trip_1');
  const parsed = parseSharedTripPacket(JSON.stringify(packet));

  assert.equal(parsed.version, 2);
  assert.equal(parsed.integrity?.algorithm, 'sha256');
  assert.equal(parsed.data.trip.id, 'trip_1');

  const imported = importSharedTripPacket(createSnapshot(), parsed);
  assert.equal(imported.mode, 'updated');
});

test('shared trip packets reject integrity tampering', () => {
  const snapshot = createSnapshot();
  const packet = createSharedTripPacket(snapshot, 'trip_1');
  packet.data.trip.name = 'Tampered trip';

  assert.throws(
    () => parseSharedTripPacket(JSON.stringify(packet)),
    /failed integrity checks/i,
  );
});

test('shared trip packets reject inconsistent child records', () => {
  const packet = createSharedTripPacket(createSnapshot(), 'trip_1');
  packet.data.travellers[0] = {
    ...packet.data.travellers[0],
    tripId: 'trip_999',
  };
  packet.integrity!.payloadHash = '0'.repeat(64);

  assert.throws(
    () => parseSharedTripPacket(JSON.stringify(packet)),
    /mixes traveller records from another trip/i,
  );
});
