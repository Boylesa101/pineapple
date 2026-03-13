import CryptoJS from 'crypto-js';
import * as Sharing from 'expo-sharing';

import { replaceAllData } from '@/db/repositories';
import type { AppDataSnapshot, BackupAttachment, BackupEnvelope, BackupPayload, StoredSecurityConfig } from '@/types/models';
import { getManagedFolder, readBase64File, writeBase64File, writeUtf8File } from '@/utils/fileStorage';

type ExportBackupArgs = {
  data: AppDataSnapshot;
  security: StoredSecurityConfig;
  password: string;
};

type ImportBackupArgs = {
  encryptedContents: string;
  password: string;
};

function validateBackupPayload(payload: BackupPayload) {
  if (payload.version !== 2) {
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
    !Array.isArray(payload.attachments)
  ) {
    throw new Error('Backup file is missing required data sections.');
  }
}

function attachmentFileName(uri: string) {
  return uri.split('/').pop() || 'attachment.bin';
}

export async function collectBackupAttachments(snapshot: AppDataSnapshot): Promise<BackupAttachment[]> {
  const unique = new Map<string, BackupAttachment>();

  const tripUris = snapshot.trips
    .map((trip) => trip.coverImageUri)
    .filter((value): value is string => Boolean(value));
  const documentUris = snapshot.documents.flatMap((document) =>
    [document.localFileUri, document.previewUri].filter((value): value is string => Boolean(value))
  );

  for (const uri of [...tripUris, ...documentUris]) {
    if (unique.has(uri)) continue;

    const folder = uri.startsWith(getManagedFolder('trips')) ? 'trips' : 'vault';
    const base64 = await readBase64File(uri);
    unique.set(uri, {
      originalUri: uri,
      folder,
      mimeType: uri.endsWith('.pdf') ? 'application/pdf' : null,
      fileName: attachmentFileName(uri),
      base64,
    });
  }

  return Array.from(unique.values());
}

export async function exportEncryptedBackup({ data, security, password }: ExportBackupArgs) {
  const attachments = await collectBackupAttachments(data);
  const payload: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      autoLockSeconds: security.autoLockSeconds,
    },
    data,
    attachments,
  };

  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), password).toString();
  const envelope: BackupEnvelope = {
    format: 'pineapple-backup',
    version: 2,
    encryption: 'aes',
    ciphertext,
  };

  const uri = await writeUtf8File(
    'backups',
    `pineapple-backup-${new Date().toISOString().slice(0, 10)}.pineapplebak`,
    JSON.stringify(envelope, null, 2)
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Pineapple encrypted backup',
    });
  }

  return uri;
}

export function decryptBackupEnvelope({ encryptedContents, password }: ImportBackupArgs) {
  const envelope = JSON.parse(encryptedContents) as BackupEnvelope;
  if (envelope.format !== 'pineapple-backup' || envelope.encryption !== 'aes') {
    throw new Error('This backup file is not recognised.');
  }

  const decrypted = CryptoJS.AES.decrypt(envelope.ciphertext, password).toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Unable to decrypt backup. Check the password and try again.');
  }

  const payload = JSON.parse(decrypted) as BackupPayload;
  validateBackupPayload(payload);
  return payload;
}

function mapAttachmentUri(attachments: BackupAttachment[], oldUri: string, rewritten: Record<string, string>) {
  return attachments.find((attachment) => attachment.originalUri === oldUri)?.originalUri
    ? rewritten[oldUri]
    : oldUri;
}

export async function restoreEncryptedBackup({
  encryptedContents,
  password,
}: ImportBackupArgs) {
  const payload = decryptBackupEnvelope({ encryptedContents, password });
  const rewrittenUris: Record<string, string> = {};

  for (const attachment of payload.attachments) {
    const restoredUri = await writeBase64File(
      attachment.folder,
      `${Date.now()}-${attachment.fileName}`,
      attachment.base64
    );
    rewrittenUris[attachment.originalUri] = restoredUri;
  }

  const restoredSnapshot: AppDataSnapshot = {
    ...payload.data,
    trips: payload.data.trips.map((trip) => ({
      ...trip,
      coverImageUri: trip.coverImageUri ? mapAttachmentUri(payload.attachments, trip.coverImageUri, rewrittenUris) : null,
    })),
    documents: payload.data.documents.map((document) => ({
      ...document,
      localFileUri: mapAttachmentUri(payload.attachments, document.localFileUri, rewrittenUris),
      previewUri: document.previewUri ? mapAttachmentUri(payload.attachments, document.previewUri, rewrittenUris) : null,
    })),
  };

  await replaceAllData(restoredSnapshot);
  return {
    autoLockSeconds: payload.settings.autoLockSeconds,
  };
}
