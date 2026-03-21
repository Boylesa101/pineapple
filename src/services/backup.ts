import CryptoJS from 'crypto-js';
import * as Sharing from 'expo-sharing';

import { replaceAllData } from '@/db/repositories';
import { BACKUP_SCHEMA_VERSION, parseBackupEnvelopeString, validateBackupPayload } from '@/services/backupSchema';
import type {
  AppDataSnapshot,
  BackupAttachment,
  BackupEnvelope,
  BackupExportResult,
  BackupPayload,
  StoredSecurityConfig,
} from '@/types/models';
import { getManagedFileInfo, getManagedFolder, readManagedBase64File, writeBase64File, writeUtf8File } from '@/utils/fileStorage';
import { getSecureRandomHex } from '@/utils/random';

type ExportBackupArgs = {
  data: AppDataSnapshot;
  security: StoredSecurityConfig;
  password: string;
};

type ImportBackupArgs = {
  encryptedContents: string;
  password: string;
};

const BACKUP_PBKDF2_ITERATIONS = 150000;
export const MIN_BACKUP_PASSWORD_LENGTH = 12;
export const PINEAPPLE_BACKUP_EXTENSION = '.pineapplebackup';
export const PINEAPPLE_BACKUP_MIME_TYPE = 'application/json';

export function isBackupFileName(name: string | null | undefined) {
  return Boolean(name?.toLowerCase().endsWith(PINEAPPLE_BACKUP_EXTENSION));
}

export function parseBackupEnvelope(encryptedContents: string) {
  return parseBackupEnvelopeString(encryptedContents);
}

export function hasStrongEnoughBackupPassword(password: string) {
  return password.trim().length >= MIN_BACKUP_PASSWORD_LENGTH;
}

export async function collectBackupAttachments(snapshot: AppDataSnapshot) {
  const unique = new Map<string, BackupAttachment>();
  let skippedAttachmentCount = 0;

  const tripUris = snapshot.trips
    .map((trip) => trip.coverImageUri)
    .filter((value): value is string => Boolean(value));
  const documentUris = snapshot.documents.flatMap((document) =>
    [document.localFileUri, document.previewUri, document.secondaryLocalFileUri, document.secondaryPreviewUri].filter(
      (value): value is string => Boolean(value)
    )
  );

  for (const uri of [...tripUris, ...documentUris]) {
    if (unique.has(uri)) continue;

    try {
      const folder = uri.startsWith(getManagedFolder('trips')) ? 'trips' : 'vault';
      const fileInfo = await getManagedFileInfo(uri);
      const base64 = await readManagedBase64File(uri);
      unique.set(uri, {
        originalUri: uri,
        folder,
        mimeType: fileInfo.mimeType,
        fileName: fileInfo.originalFileName,
        base64,
      });
    } catch {
      skippedAttachmentCount += 1;
    }
  }

  return {
    attachments: Array.from(unique.values()),
    skippedAttachmentCount,
  };
}

export async function exportEncryptedBackup({ data, security, password }: ExportBackupArgs): Promise<BackupExportResult> {
  if (!hasStrongEnoughBackupPassword(password)) {
    throw new Error(`Backup password must be at least ${MIN_BACKUP_PASSWORD_LENGTH} characters long.`);
  }

  const exportedAt = new Date().toISOString();
  const { attachments, skippedAttachmentCount } = await collectBackupAttachments(data);
  const payload: BackupPayload = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt,
    settings: {
      autoLockSeconds: security.autoLockSeconds,
    },
    data,
    attachments,
  };

  const salt = CryptoJS.enc.Hex.parse(getSecureRandomHex(16));
  const iv = CryptoJS.enc.Hex.parse(getSecureRandomHex(16));
  const keyMaterial = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
    iterations: BACKUP_PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), encryptionKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(`${ciphertext}.${iv.toString()}`, macKey).toString();
  const envelope: BackupEnvelope = {
    format: 'pineapple-backup',
    version: BACKUP_SCHEMA_VERSION,
    encryption: 'aes-256-cbc+hmac-sha256',
    kdf: 'pbkdf2',
    iterations: BACKUP_PBKDF2_ITERATIONS,
    salt: salt.toString(),
    iv: iv.toString(),
    mac,
    ciphertext,
  };

  const uri = await writeUtf8File(
    'backups',
    `pineapple-backup-${exportedAt.slice(0, 10)}${PINEAPPLE_BACKUP_EXTENSION}`,
    JSON.stringify(envelope, null, 2)
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: PINEAPPLE_BACKUP_MIME_TYPE,
      dialogTitle: 'Pineapple encrypted backup',
    });
  }

  return {
    uri,
    exportedAt,
    attachmentCount: attachments.length,
    skippedAttachmentCount,
  };
}

export function decryptBackupEnvelope({ encryptedContents, password }: ImportBackupArgs) {
  const envelope = parseBackupEnvelope(encryptedContents);

  const salt = CryptoJS.enc.Hex.parse(envelope.salt);
  const iv = CryptoJS.enc.Hex.parse(envelope.iv);
  const keyMaterial = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
    iterations: envelope.iterations,
    hasher: CryptoJS.algo.SHA256,
  });
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  const expectedMac = CryptoJS.HmacSHA256(`${envelope.ciphertext}.${envelope.iv}`, macKey).toString();
  if (expectedMac !== envelope.mac) {
    throw new Error('Backup integrity check failed. The password or file may be invalid.');
  }

  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    } as CryptoJS.lib.CipherParams,
    encryptionKey,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);
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
      attachment.base64,
      {
        encryptAtRest: attachment.folder === 'vault',
        mimeType: attachment.mimeType,
        sourceFileName: attachment.fileName,
      }
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
      secondaryLocalFileUri: document.secondaryLocalFileUri
        ? mapAttachmentUri(payload.attachments, document.secondaryLocalFileUri, rewrittenUris)
        : null,
      secondaryPreviewUri: document.secondaryPreviewUri
        ? mapAttachmentUri(payload.attachments, document.secondaryPreviewUri, rewrittenUris)
        : null,
    })),
  };

  await replaceAllData(restoredSnapshot);
  return {
    autoLockSeconds: payload.settings.autoLockSeconds,
  };
}
