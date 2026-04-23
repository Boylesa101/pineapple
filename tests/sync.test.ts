import test from 'node:test';
import assert from 'node:assert/strict';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

import {
  createEncryptedSharedTripTransfer,
  createSharedTripPacket,
  createSharedTripSecureEnvelope,
  importSharedTripPacket,
  parseSharedTripPacket,
  resolveConflict,
} from '@/services/sync';
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

test('encrypted shared trip packets round-trip with a transfer code', () => {
  const snapshot = createSnapshot();
  const transfer = createEncryptedSharedTripTransfer(snapshot, 'trip_1', 'PINE-TEST-CODE');
  const parsed = parseSharedTripPacket(transfer.envelopeContents, 'PINE-TEST-CODE');

  assert.equal(parsed.version, 3);
  assert.equal(parsed.data.trip.id, 'trip_1');
  assert.equal(transfer.envelope.format, 'pineapple-shared-trip-secure');

  const imported = importSharedTripPacket(createSnapshot(), parsed);
  assert.equal(imported.mode, 'updated');
});

test('encrypted shared trip packets reject integrity tampering', () => {
  const snapshot = createSnapshot();
  const transfer = createEncryptedSharedTripTransfer(snapshot, 'trip_1', 'PINE-TEST-CODE');
  const tampered = JSON.parse(transfer.envelopeContents) as Record<string, string>;
  tampered.ciphertext = `${tampered.ciphertext.slice(0, -4)}ABCD`;

  assert.throws(
    () => parseSharedTripPacket(JSON.stringify(tampered), 'PINE-TEST-CODE'),
    /integrity check failed/i,
  );
});

test('encrypted shared trip packets reject an invalid transfer code', () => {
  const transfer = createEncryptedSharedTripTransfer(createSnapshot(), 'trip_1', 'PINE-TEST-CODE');

  assert.throws(
    () => parseSharedTripPacket(transfer.envelopeContents, 'PINE-WRONG-CODE'),
    /integrity check failed|unable to decrypt/i,
  );
});

test('shared trip QR payload does not expose plaintext trip data', () => {
  const transfer = createEncryptedSharedTripTransfer(createSnapshot(), 'trip_1', 'PINE-TEST-CODE');
  const qrPayload = compressToEncodedURIComponent(transfer.envelopeContents);
  const decoded = decompressFromEncodedURIComponent(qrPayload);

  assert.ok(qrPayload.length > 0);
  assert.equal(decoded?.includes('Paris'), false);
  assert.equal(decoded?.includes('Alex Pine'), false);
  assert.equal(decoded?.includes('pineapple-shared-trip-secure'), true);
});

test('shared trip packets reject inconsistent child records after decryption', () => {
  const packet = createSharedTripPacket(createSnapshot(), 'trip_1');
  packet.data.travellers[0] = {
    ...packet.data.travellers[0],
    tripId: 'trip_999',
  };
  const rebuilt = JSON.stringify(createSharedTripSecureEnvelope(packet, 'PINE-TEST-CODE'));

  assert.throws(
    () => parseSharedTripPacket(rebuilt, 'PINE-TEST-CODE'),
    /mixes traveller records from another trip/i,
  );
});

test('conflict resolution no longer depends on a plaintext incoming packet string', () => {
  const base = createSnapshot();
  base.sharedTripStates = [
    {
      tripId: 'trip_1',
      shareCode: 'PINE-ABCD-EFGH',
      syncEnabled: true,
      syncStatus: 'ready',
      lastSyncAt: '2026-04-10T10:00:00.000Z',
      lastExportedAt: null,
      lastImportedAt: '2026-04-10T10:00:00.000Z',
      lastKnownRemoteUpdatedAt: '2026-04-10T10:00:00.000Z',
      createdAt: '2026-04-10T10:00:00.000Z',
      updatedAt: '2026-04-10T10:00:00.000Z',
    },
  ];
  base.trips[0] = {
    ...base.trips[0],
    updatedAt: '2026-04-12T10:00:00.000Z',
  };

  const incoming = createSnapshot();
  incoming.sharedTripStates = base.sharedTripStates;
  incoming.trips[0] = {
    ...incoming.trips[0],
    name: 'Paris Incoming',
    updatedAt: '2026-04-13T10:00:00.000Z',
  };
  const conflictResult = importSharedTripPacket(base, createSharedTripPacket(incoming, 'trip_1'));

  assert.equal(conflictResult.mode, 'conflict');
  assert.equal('incomingRecord' in conflictResult.conflict, true);

  const resolved = resolveConflict(conflictResult.snapshot, conflictResult.conflict.id, 'resolved_use_incoming');
  assert.equal(resolved.trips.find((trip) => trip.id === 'trip_1')?.name, 'Paris Incoming');
});
