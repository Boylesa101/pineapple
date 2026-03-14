import type { BackupEnvelope, BackupPayload } from '@/types/models';

export const BACKUP_SCHEMA_VERSION = 3;

export function validateBackupPayload(payload: BackupPayload) {
  if (payload.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error('Unsupported backup version.');
  }

  const data = payload.data;
  if (
    !Array.isArray(data.trips) ||
    !Array.isArray(data.travellers) ||
    !Array.isArray(data.documents) ||
    !Array.isArray(data.packingItems) ||
    !Array.isArray(data.travelSegments) ||
    !Array.isArray(data.hotelStays) ||
    !Array.isArray(data.itineraryEvents) ||
    !Array.isArray(data.emergencyInfos) ||
    !Array.isArray(data.reminderSettings) ||
    !data.appPreferences ||
    !Array.isArray(data.tripParticipants) ||
    !Array.isArray(data.tripInvites) ||
    !Array.isArray(data.sharedTripStates) ||
    !Array.isArray(data.syncConflicts) ||
    !Array.isArray(payload.attachments)
  ) {
    throw new Error('Backup file is missing required data sections.');
  }
}

export function validateBackupEnvelope(envelope: BackupEnvelope) {
  if (envelope.format !== 'pineapple-backup') {
    throw new Error('This backup file is not recognised.');
  }

  if (envelope.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error('This backup file was created with an unsupported Pineapple version.');
  }

  if (envelope.encryption !== 'aes-256-cbc+hmac-sha256' || envelope.kdf !== 'pbkdf2') {
    throw new Error('This backup file uses an unsupported protection format.');
  }

  if (
    !envelope.ciphertext ||
    !envelope.iv ||
    !envelope.salt ||
    !envelope.mac ||
    typeof envelope.iterations !== 'number' ||
    envelope.iterations < 10000
  ) {
    throw new Error('Backup file is incomplete or corrupted.');
  }
}

export function parseBackupEnvelopeString(encryptedContents: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedContents);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }

  const envelope = parsed as BackupEnvelope;
  validateBackupEnvelope(envelope);
  return envelope;
}
