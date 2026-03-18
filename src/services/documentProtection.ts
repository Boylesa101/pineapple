import { loadSnapshot, upsertDocument } from '@/db/repositories';
import type { AppDataSnapshot, Document } from '@/types/models';
import { copyIntoAppStorage, getManagedFolder, isEncryptedManagedFile } from '@/utils/fileStorage';

function isPlainVaultUri(uri: string | null | undefined) {
  return Boolean(uri && uri.startsWith(getManagedFolder('vault')) && !isEncryptedManagedFile(uri));
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
