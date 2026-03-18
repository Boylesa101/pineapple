import { useEffect, useState } from 'react';

import { materializeReadableFile } from '@/utils/fileStorage';

export function useManagedFileUri(uri: string | null | undefined, mimeType?: string | null) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(uri ?? null);

  useEffect(() => {
    let cancelled = false;

    if (!uri) {
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
  }, [mimeType, uri]);

  return resolvedUri;
}
