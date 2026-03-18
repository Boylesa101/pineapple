import { loadSnapshot, upsertDocument, upsertTrip } from '@/db/repositories';
import type { AppDataSnapshot, Document, Trip } from '@/types/models';
import { copyIntoAppStorage, getManagedFolder, isEncryptedManagedFile } from '@/utils/fileStorage';

function isPlainVaultUri(uri: string | null | undefined) {
  return Boolean(uri && uri.startsWith(getManagedFolder('vault')) && !isEncryptedManagedFile(uri));
}

function isPlainTripUri(uri: string | null | undefined) {
  return Boolean(uri && uri.startsWith(getManagedFolder('trips')) && !isEncryptedManagedFile(uri));
}

async function secureVaultUri(
  uri: string | null | undefined,
  mimeType: string | null | undefined,
  cache: Map<string, string>
) {
  if (!uri || !isPlainVaultUri(uri)) {
    return uri ?? null;
  }

  if (cache.has(uri)) {
    return cache.get(uri) ?? uri;
  }

  try {
    const encryptedUri = await copyIntoAppStorage(uri, 'vault', mimeType, { encryptAtRest: true });
    cache.set(uri, encryptedUri);
    return encryptedUri;
  } catch {
    return uri;
  }
}

async function secureTripUri(uri: string | null | undefined, cache: Map<string, string>) {
  if (!uri || !isPlainTripUri(uri)) {
    return uri ?? null;
  }

  if (cache.has(uri)) {
    return cache.get(uri) ?? uri;
  }

  try {
    const encryptedUri = await copyIntoAppStorage(uri, 'trips', 'image/jpeg', { encryptAtRest: true });
    cache.set(uri, encryptedUri);
    return encryptedUri;
  } catch {
    return uri;
  }
}

function applySecuredUris(document: Document, nextUris: Partial<Document>) {
  return {
    ...document,
    ...nextUris,
  };
}

export async function protectVaultDocumentsAtRest(snapshot: AppDataSnapshot) {
  const rewrittenUris = new Map<string, string>();
  let migrated = 0;

  for (const document of snapshot.documents) {
    const nextLocalFileUri = await secureVaultUri(document.localFileUri, document.mimeType, rewrittenUris);
    const nextPreviewUri = await secureVaultUri(document.previewUri, document.mimeType, rewrittenUris);
    const nextSecondaryLocalFileUri = await secureVaultUri(
      document.secondaryLocalFileUri,
      document.secondaryMimeType,
      rewrittenUris
    );
    const nextSecondaryPreviewUri = await secureVaultUri(
      document.secondaryPreviewUri,
      document.secondaryMimeType,
      rewrittenUris
    );

    if (
      nextLocalFileUri !== document.localFileUri ||
      nextPreviewUri !== document.previewUri ||
      nextSecondaryLocalFileUri !== document.secondaryLocalFileUri ||
      nextSecondaryPreviewUri !== document.secondaryPreviewUri
    ) {
      await upsertDocument(
        applySecuredUris(document, {
          localFileUri: nextLocalFileUri ?? '',
          previewUri: nextPreviewUri,
          secondaryLocalFileUri: nextSecondaryLocalFileUri,
          secondaryPreviewUri: nextSecondaryPreviewUri,
        })
      );
      migrated += 1;
    }
  }

  if (!migrated) {
    return { migrated, snapshot };
  }

  return {
    migrated,
    snapshot: await loadSnapshot(),
  };
}

export async function protectStoredFilesAtRest(snapshot: AppDataSnapshot) {
  const rewrittenUris = new Map<string, string>();
  let migrated = 0;

  for (const trip of snapshot.trips) {
    const nextCoverImageUri = await secureTripUri(trip.coverImageUri, rewrittenUris);
    if (nextCoverImageUri !== trip.coverImageUri) {
      await upsertTrip({
        ...trip,
        coverImageUri: nextCoverImageUri,
      } satisfies Trip);
      migrated += 1;
    }
  }

  const vaultProtection = await protectVaultDocumentsAtRest(snapshot);
  migrated += vaultProtection.migrated;

  if (!migrated) {
    return { migrated, snapshot };
  }

  return {
    migrated,
    snapshot: await loadSnapshot(),
  };
}
