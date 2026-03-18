import type { BackupEnvelope, BackupPayload } from '@/types/models';

export const BACKUP_SCHEMA_VERSION = 3;
const MAX_ATTACHMENT_COUNT = 400;
const MAX_FILE_NAME_LENGTH = 160;

export function validateBackupPayload(payload: BackupPayload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file is missing required data sections.');
  }

  if (payload.version !== BACKUP_SCHEMA_VERSION) {
    throw new Error('Unsupported backup version.');
  }

  if (typeof payload.exportedAt !== 'string' || !payload.exportedAt.trim()) {
    throw new Error('Backup file is missing required data sections.');
  }

  if (
    !payload.settings ||
    typeof payload.settings !== 'object' ||
    typeof payload.settings.autoLockSeconds !== 'number' ||
    payload.settings.autoLockSeconds < 15 ||
    payload.settings.autoLockSeconds > 3600
  ) {
    throw new Error('Backup file is missing required data sections.');
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

  if (payload.attachments.length > MAX_ATTACHMENT_COUNT) {
    throw new Error('Backup file is invalid or incomplete.');
  }

  for (const attachment of payload.attachments) {
    if (
      !attachment ||
      typeof attachment !== 'object' ||
      (attachment.folder !== 'trips' && attachment.folder !== 'vault') ||
      typeof attachment.originalUri !== 'string' ||
      typeof attachment.fileName !== 'string' ||
      attachment.fileName.length === 0 ||
      attachment.fileName.length > MAX_FILE_NAME_LENGTH ||
      /[\\/]/.test(attachment.fileName) ||
      (attachment.mimeType !== null && typeof attachment.mimeType !== 'string') ||
      typeof attachment.base64 !== 'string'
    ) {
      throw new Error('Backup file is invalid or incomplete.');
    }
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
