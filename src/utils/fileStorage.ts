import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { createId } from './ids';
import { getSecureRandomHex } from './random';

export type ManagedFolder = 'trips' | 'vault' | 'exports' | 'backups';

type FileEnvelope = {
  format: 'pineapple-file';
  version: 1;
  mimeType: string | null;
  originalExtension: string;
  originalFileName: string;
  iv: string;
  mac: string;
  ciphertext: string;
};

type CopyIntoAppStorageOptions = {
  encryptAtRest?: boolean;
};

type WriteBase64FileOptions = {
  encryptAtRest?: boolean;
  mimeType?: string | null;
  sourceFileName?: string | null;
};

type MaterializedFile = {
  uri: string;
  cleanup: () => Promise<void>;
};

const FILE_ENCRYPTION_KEY = 'pineapple.file-encryption-key';
const ENCRYPTED_FILE_EXTENSION = '.pineappleenc';
const root = `${FileSystem.documentDirectory ?? ''}pineapple`;
const tripsDir = `${root}/trips`;
const vaultDir = `${root}/vault`;
const exportsDir = `${root}/exports`;
const backupsDir = `${root}/backups`;
const secureCacheRoot = `${FileSystem.cacheDirectory ?? ''}pineapple-secure`;
const secureMaterializedDir = `${secureCacheRoot}/materialized`;

const folderMap: Record<ManagedFolder, string> = {
  trips: tripsDir,
  vault: vaultDir,
  exports: exportsDir,
  backups: backupsDir,
};

const materializedFileCache = new Map<string, string>();

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

function getFileName(uri: string) {
  return sanitizeFileName(uri.split('/').pop() || 'attachment.bin');
}

function getExtension(uri: string, mimeType?: string | null) {
  const uriExtension = uri.split('.').pop();
  if (uriExtension && uriExtension.length <= 10) {
    return `.${uriExtension.toLowerCase()}`;
  }

  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'application/json') return '.json';
  if (mimeType?.includes('jpeg')) return '.jpg';
  if (mimeType?.includes('png')) return '.png';
  return '';
}

function sanitizeFileName(fileName: string, fallback = 'attachment.bin') {
  const leafName = fileName.split(/[\\/]/).pop() || fallback;
  const sanitized = leafName
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+/g, '_')
    .slice(0, 120);

  return sanitized || fallback;
}

function createCipherKeys(rawKeyHex: string) {
  const keyMaterial = CryptoJS.enc.Hex.parse(rawKeyHex);
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  return { encryptionKey, macKey };
}

async function loadOrCreateFileEncryptionKey() {
  if (Platform.OS === 'web') {
    if (!canUseWebStorage()) {
      return null;
    }

    const existing = window.localStorage.getItem(FILE_ENCRYPTION_KEY);
    if (existing) {
      return existing;
    }

    const next = getSecureRandomHex(64);
    window.localStorage.setItem(FILE_ENCRYPTION_KEY, next);
    return next;
  }

  const existing = await SecureStore.getItemAsync(FILE_ENCRYPTION_KEY);
  if (existing) {
    return existing;
  }

  const next = getSecureRandomHex(64);
  await SecureStore.setItemAsync(FILE_ENCRYPTION_KEY, next);
  return next;
}

async function ensureManagedFolder(folder: ManagedFolder) {
  if (Platform.OS === 'web') {
    return;
  }

  await FileSystem.makeDirectoryAsync(folderMap[folder], { intermediates: true });
}

async function ensureSecureCacheFolder() {
  if (Platform.OS === 'web') {
    return;
  }

  await FileSystem.makeDirectoryAsync(secureMaterializedDir, { intermediates: true });
}

async function readEncryptedEnvelope(uri: string) {
  const raw = await FileSystem.readAsStringAsync(uri);
  const parsed = JSON.parse(raw) as FileEnvelope;
  if (parsed.format !== 'pineapple-file' || parsed.version !== 1) {
    throw new Error('This secure document file is invalid.');
  }
  return parsed;
}

async function encryptBase64(base64: string, mimeType: string | null | undefined, sourceFileName: string) {
  const keyHex = await loadOrCreateFileEncryptionKey();
  if (!keyHex) {
    return null;
  }

  const iv = CryptoJS.enc.Hex.parse(getSecureRandomHex(16));
  const { encryptionKey, macKey } = createCipherKeys(keyHex);
  const ciphertext = CryptoJS.AES.encrypt(base64, encryptionKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(`${ciphertext}.${iv.toString()}`, macKey).toString();

  return JSON.stringify(
    {
      format: 'pineapple-file',
      version: 1,
      mimeType: mimeType ?? null,
      originalExtension: getExtension(sourceFileName, mimeType),
      originalFileName: sourceFileName,
      iv: iv.toString(),
      mac,
      ciphertext,
    } satisfies FileEnvelope
  );
}

async function decryptBase64FromEnvelope(envelope: FileEnvelope) {
  const keyHex = await loadOrCreateFileEncryptionKey();
  if (!keyHex) {
    throw new Error('Secure document access is unavailable on this platform.');
  }

  const { encryptionKey, macKey } = createCipherKeys(keyHex);
  const expectedMac = CryptoJS.HmacSHA256(`${envelope.ciphertext}.${envelope.iv}`, macKey).toString();
  if (expectedMac !== envelope.mac) {
    throw new Error('Secure document integrity check failed.');
  }

  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    } as CryptoJS.lib.CipherParams,
    encryptionKey,
    {
      iv: CryptoJS.enc.Hex.parse(envelope.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Secure document decryption failed.');
  }

  return decrypted;
}

async function writeEncryptedFile(
  folder: ManagedFolder,
  fileName: string,
  base64: string,
  mimeType?: string | null,
  sourceFileName?: string | null
) {
  await ensureManagedFolder(folder);
  const envelope = await encryptBase64(base64, mimeType, sourceFileName ?? fileName);
  if (!envelope) {
    throw new Error('Secure document storage is unavailable on this platform.');
  }

  const safeName = sanitizeFileName(fileName, 'attachment').replace(/\.[^/.]+$/, '');
  const destination = `${folderMap[folder]}/${safeName}${ENCRYPTED_FILE_EXTENSION}`;
  await FileSystem.writeAsStringAsync(destination, envelope);
  return destination;
}

function removeCachedMaterializedUris(sourceUri: string) {
  for (const [key, uri] of materializedFileCache.entries()) {
    if (key.startsWith(`${sourceUri}|`)) {
      materializedFileCache.delete(key);
      deleteLocalFile(uri).catch(() => undefined);
    }
  }
}

export function getManagedFolder(folder: ManagedFolder) {
  return folderMap[folder];
}

export function isEncryptedManagedFile(uri: string | null | undefined) {
  return Boolean(uri?.toLowerCase().endsWith(ENCRYPTED_FILE_EXTENSION));
}

export async function ensureAppDirectories() {
  if (Platform.OS === 'web') {
    return;
  }

  await Promise.all([
    ...Object.values(folderMap).map((directory) => FileSystem.makeDirectoryAsync(directory, { intermediates: true })),
    FileSystem.makeDirectoryAsync(secureMaterializedDir, { intermediates: true }),
  ]);
}

export async function copyIntoAppStorage(
  sourceUri: string,
  folder: ManagedFolder,
  mimeType?: string | null,
  options: CopyIntoAppStorageOptions = {}
) {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  await ensureManagedFolder(folder);
  const fileName = `${createId(folder)}${getExtension(sourceUri, mimeType)}`;

  if (options.encryptAtRest) {
    const base64 = await readBase64File(sourceUri);
    return writeEncryptedFile(folder, fileName, base64, mimeType, getFileName(sourceUri));
  }

  const destination = `${folderMap[folder]}/${fileName}`;
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destination,
  });

  return destination;
}

export async function cleanupImportedSource(sourceUri: string | null | undefined) {
  if (!sourceUri || Platform.OS === 'web') {
    return;
  }

  const cacheDirectory = FileSystem.cacheDirectory ?? '';
  const isTransientCopy =
    sourceUri.startsWith(cacheDirectory) ||
    sourceUri.includes('/cache/') ||
    sourceUri.includes('/ImagePicker/') ||
    sourceUri.includes('/DocumentPicker/');

  if (!isTransientCopy) {
    return;
  }

  await deleteLocalFile(sourceUri);
}

export async function clearMaterializedSecureFiles() {
  materializedFileCache.clear();

  if (Platform.OS === 'web') {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(secureCacheRoot);
    if (info.exists) {
      await FileSystem.deleteAsync(secureCacheRoot, { idempotent: true });
    }
  } catch {
    // Ignore secure-cache cleanup failures.
  }
}

export async function writeUtf8File(folder: ManagedFolder, fileName: string, contents: string) {
  await ensureManagedFolder(folder);
  const destination = `${folderMap[folder]}/${sanitizeFileName(fileName)}`;
  await FileSystem.writeAsStringAsync(destination, contents);
  return destination;
}

export async function writeBase64File(
  folder: ManagedFolder,
  fileName: string,
  base64: string,
  options: WriteBase64FileOptions = {}
) {
  if (options.encryptAtRest) {
    return writeEncryptedFile(folder, fileName, base64, options.mimeType, options.sourceFileName ?? fileName);
  }

  await ensureManagedFolder(folder);
  const destination = `${folderMap[folder]}/${sanitizeFileName(fileName)}`;
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destination;
}

export async function readBase64File(uri: string) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function readManagedBase64File(uri: string) {
  if (!isEncryptedManagedFile(uri)) {
    return readBase64File(uri);
  }

  const envelope = await readEncryptedEnvelope(uri);
  return decryptBase64FromEnvelope(envelope);
}

export async function getManagedFileInfo(uri: string, fallbackMimeType?: string | null) {
  if (!isEncryptedManagedFile(uri)) {
    return {
      mimeType: fallbackMimeType ?? null,
      originalExtension: getExtension(uri, fallbackMimeType),
      originalFileName: getFileName(uri),
    };
  }

  const envelope = await readEncryptedEnvelope(uri);
  return {
    mimeType: envelope.mimeType ?? fallbackMimeType ?? null,
    originalExtension: envelope.originalExtension || getExtension(envelope.originalFileName, envelope.mimeType),
    originalFileName: envelope.originalFileName || 'attachment.bin',
  };
}

export async function materializeReadableFile(uri: string | null | undefined, fallbackMimeType?: string | null): Promise<MaterializedFile> {
  if (!uri || Platform.OS === 'web' || !isEncryptedManagedFile(uri)) {
    return {
      uri: uri ?? '',
      cleanup: async () => undefined,
    };
  }

  const info = await FileSystem.getInfoAsync(uri);
  const cacheKey = `${uri}|${info.exists ? info.size ?? 0 : 0}|${info.exists ? info.modificationTime ?? 0 : 0}|${fallbackMimeType ?? ''}`;
  const cachedUri = materializedFileCache.get(cacheKey);
  if (cachedUri) {
    const cachedInfo = await FileSystem.getInfoAsync(cachedUri);
    if (cachedInfo.exists) {
      return {
        uri: cachedUri,
        cleanup: async () => undefined,
      };
    }
    materializedFileCache.delete(cacheKey);
  }

  await ensureSecureCacheFolder();
  const fileInfo = await getManagedFileInfo(uri, fallbackMimeType);
  const fileBase64 = await readManagedBase64File(uri);
  const digest = CryptoJS.SHA256(cacheKey).toString();
  const destination = `${secureMaterializedDir}/${digest}${fileInfo.originalExtension || getExtension(fileInfo.originalFileName, fileInfo.mimeType)}`;
  await FileSystem.writeAsStringAsync(destination, fileBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  materializedFileCache.set(cacheKey, destination);

  return {
    uri: destination,
    cleanup: async () => undefined,
  };
}

export async function deleteLocalFile(uri: string | null | undefined) {
  if (!uri) {
    return;
  }

  removeCachedMaterializedUris(uri);

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Ignore missing files during cleanup.
  }
}
