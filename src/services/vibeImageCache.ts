import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';

import type { VibeItem } from '@/services/tripadvisorVibesService';
import { ensureAppDirectories, getManagedFolder } from '@/utils/fileStorage';

const imageCache = new Map<string, Promise<string | null>>();

function inferExtension(url: string) {
  const normalized = url.split('?')[0]?.toLowerCase() ?? '';
  if (normalized.endsWith('.png')) return '.png';
  if (normalized.endsWith('.webp')) return '.webp';
  if (normalized.endsWith('.gif')) return '.gif';
  return '.jpg';
}

function isRemoteUri(uri: string | null | undefined) {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}

export async function cacheVibeImage(uri: string | null | undefined) {
  if (!isRemoteUri(uri)) {
    return uri ?? null;
  }

  if (Platform.OS === 'web') {
    return uri ?? null;
  }

  const sourceUri = uri as string;
  const existingPromise = imageCache.get(sourceUri);
  if (existingPromise) {
    return existingPromise;
  }

  const task = (async () => {
    try {
      await ensureAppDirectories();
      const hash = CryptoJS.SHA256(sourceUri).toString();
      const destination = `${getManagedFolder('trips')}/vibe-${hash}${inferExtension(sourceUri)}`;
      const info = await FileSystem.getInfoAsync(destination);
      if (info.exists) {
        return destination;
      }

      const tempUri = `${FileSystem.cacheDirectory ?? ''}pineapple-vibe-${hash}${inferExtension(sourceUri)}`;
      const download = await FileSystem.downloadAsync(sourceUri, tempUri);
      await FileSystem.copyAsync({
        from: download.uri,
        to: destination,
      });
      await FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => undefined);
      return destination;
    } catch {
      return sourceUri;
    }
  })();

  imageCache.set(sourceUri, task);
  return task;
}

export async function cacheVibeItemsImages(items: VibeItem[]) {
  const cachedUris = await Promise.all(items.map((item) => cacheVibeImage(item.imageUrl)));
  return items.map((item, index) => ({
    ...item,
    imageUrl: cachedUris[index] ?? item.imageUrl ?? null,
  }));
}
