import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { env } from '@/lib/env';

export const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

// The verdict string finalize_media() recomputes in the database with the Vault copy of the secret.
export function signVerdict(mediaId: string, ok: boolean, sha256: string | null, size: number) {
  if (!env.MEDIA_SIGNING_SECRET) return null;
  const msg = [mediaId, ok ? 'clean' : 'rejected', sha256 ?? '', String(size)].join('|');
  return createHmac('sha256', env.MEDIA_SIGNING_SECRET).update(msg).digest('hex');
}
