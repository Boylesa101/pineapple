import * as FileSystem from 'expo-file-system/legacy';

import { createId } from './ids';

const root = `${FileSystem.documentDirectory ?? ''}pineapple`;
const tripsDir = `${root}/trips`;
const vaultDir = `${root}/vault`;

function getExtension(uri: string, mimeType?: string | null) {
  const uriExtension = uri.split('.').pop();
  if (uriExtension && uriExtension.length <= 5) {
    return `.${uriExtension.toLowerCase()}`;
  }

  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType?.includes('jpeg')) return '.jpg';
  if (mimeType?.includes('png')) return '.png';
  return '';
}

export async function ensureAppDirectories() {
  await FileSystem.makeDirectoryAsync(tripsDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(vaultDir, { intermediates: true });
}

export async function copyIntoAppStorage(sourceUri: string, folder: 'trips' | 'vault', mimeType?: string | null) {
  const baseDir = folder === 'trips' ? tripsDir : vaultDir;
  const destination = `${baseDir}/${createId(folder)}${getExtension(sourceUri, mimeType)}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destination,
  });

  return destination;
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
