import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { createId } from './ids';

export type ManagedFolder = 'trips' | 'vault' | 'exports' | 'backups';

const root = `${FileSystem.documentDirectory ?? ''}pineapple`;
const tripsDir = `${root}/trips`;
const vaultDir = `${root}/vault`;
const exportsDir = `${root}/exports`;
const backupsDir = `${root}/backups`;

const folderMap: Record<ManagedFolder, string> = {
  trips: tripsDir,
  vault: vaultDir,
  exports: exportsDir,
  backups: backupsDir,
};

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

export function getManagedFolder(folder: ManagedFolder) {
  return folderMap[folder];
}

export async function ensureAppDirectories() {
  if (Platform.OS === 'web') {
    return;
  }

  await Promise.all(
    Object.values(folderMap).map((directory) => FileSystem.makeDirectoryAsync(directory, { intermediates: true }))
  );
}

async function ensureManagedFolder(folder: ManagedFolder) {
  if (Platform.OS === 'web') {
    return;
  }

  await FileSystem.makeDirectoryAsync(folderMap[folder], { intermediates: true });
}

export async function copyIntoAppStorage(sourceUri: string, folder: ManagedFolder, mimeType?: string | null) {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  await ensureManagedFolder(folder);
  const destination = `${folderMap[folder]}/${createId(folder)}${getExtension(sourceUri, mimeType)}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destination,
  });

  return destination;
}

export async function writeUtf8File(folder: ManagedFolder, fileName: string, contents: string) {
  await ensureManagedFolder(folder);
  const destination = `${folderMap[folder]}/${fileName}`;
  await FileSystem.writeAsStringAsync(destination, contents);
  return destination;
}

export async function writeBase64File(folder: ManagedFolder, fileName: string, base64: string) {
  await ensureManagedFolder(folder);
  const destination = `${folderMap[folder]}/${fileName}`;
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

export async function deleteLocalFile(uri: string | null | undefined) {
  if (!uri) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Ignore missing files during cleanup.
  }
}
