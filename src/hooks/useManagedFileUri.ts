import { useEffect, useState } from 'react';

import { materializeReadableFile } from '@/utils/fileStorage';

type UseManagedFileUriOptions = {
  enabled?: boolean;
};

export function useManagedFileUri(uri: string | null | undefined, mimeType?: string | null, options: UseManagedFileUriOptions = {}) {
  const { enabled = true } = options;
  const [resolvedUri, setResolvedUri] = useState<string | null>(enabled ? (uri ?? null) : null);

  useEffect(() => {
    let cancelled = false;

    if (!uri || !enabled) {
      setResolvedUri(null);
      return () => {
        cancelled = true;
      };
    }

    materializeReadableFile(uri, mimeType)
      .then((materialized) => {
        if (!cancelled) {
          setResolvedUri(materialized.uri || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUri(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, mimeType, uri]);

  return resolvedUri;
}
