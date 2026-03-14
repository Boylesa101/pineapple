import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBackupEnvelopeString, validateBackupPayload } from '@/services/backupSchema';

test('backup schema rejects invalid JSON and incomplete envelopes', () => {
  assert.throws(() => parseBackupEnvelopeString('not-json'), /not valid JSON/i);
  assert.throws(
    () =>
      parseBackupEnvelopeString(
        JSON.stringify({
          format: 'pineapple-backup',
          version: 3,
          encryption: 'aes-256-cbc+hmac-sha256',
          kdf: 'pbkdf2',
        })
      ),
    /incomplete or corrupted/i
  );
});

test('backup schema rejects unsupported payload versions and missing sections', () => {
  assert.throws(
    () =>
      validateBackupPayload({
        version: 2 as 3,
        exportedAt: new Date().toISOString(),
        settings: { autoLockSeconds: 90 },
        data: {} as never,
        attachments: [],
      }),
    /unsupported backup version/i
  );

  assert.throws(
    () =>
      validateBackupPayload({
        version: 3,
        exportedAt: new Date().toISOString(),
        settings: { autoLockSeconds: 90 },
        data: {
          trips: [],
          travellers: [],
          documents: [],
          packingItems: [],
          travelSegments: [],
          hotelStays: [],
          itineraryEvents: [],
          emergencyInfos: [],
          reminderSettings: [],
          appPreferences: null,
          tripParticipants: [],
          tripInvites: [],
          sharedTripStates: [],
          syncConflicts: [],
        } as never,
        attachments: [],
      }),
    /missing required data sections/i
  );
});
