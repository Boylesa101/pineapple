import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function webCryptoObject() {
  return typeof globalThis !== 'undefined' && 'crypto' in globalThis ? globalThis.crypto : null;
}

export function getSecureRandomBytes(length: number) {
  if (Platform.OS === 'web') {
    const cryptoObject = webCryptoObject();
    if (!cryptoObject?.getRandomValues) {
      throw new Error('Secure random bytes are unavailable on this platform.');
    }

    return cryptoObject.getRandomValues(new Uint8Array(length));
  }

  try {
    return Crypto.getRandomBytes(length);
  } catch {
    throw new Error('Secure random bytes are unavailable on this device build.');
  }
}

export function getSecureRandomHex(length: number) {
  return bytesToHex(getSecureRandomBytes(length));
}
