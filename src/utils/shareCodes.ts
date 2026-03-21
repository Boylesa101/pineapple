import { getSecureRandomBytes } from '@/utils/random';

const SHARE_CODE_PREFIX = 'PINE';
const BASE32_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LEGACY_SHARE_CODE_PATTERN = /^PINE-[A-Z0-9]{6}$/;

function encodeBase32(bytes: Uint8Array) {
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }

  return output;
}

export function createShareCode() {
  const token = encodeBase32(getSecureRandomBytes(5)).slice(0, 8);
  return `${SHARE_CODE_PREFIX}-${token.slice(0, 4)}-${token.slice(4)}`;
}

export function isLegacyShareCode(value: string | null | undefined) {
  return Boolean(value && LEGACY_SHARE_CODE_PATTERN.test(value));
}
