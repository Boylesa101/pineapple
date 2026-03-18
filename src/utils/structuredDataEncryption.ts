import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STRUCTURED_DATA_KEY = 'pineapple.structured-data-key';
const ENCRYPTED_TEXT_PREFIX = 'pineapple-secure:v1:';

type TextEnvelope = {
  format: 'pineapple-text';
  version: 1;
  iv: string;
  mac: string;
  ciphertext: string;
};

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createCipherKeys(rawKeyHex: string) {
  const keyMaterial = CryptoJS.enc.Hex.parse(rawKeyHex);
  const encryptionKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 8), 32);
  const macKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(8, 16), 32);
  return { encryptionKey, macKey };
}

async function loadOrCreateStructuredDataKey() {
  if (Platform.OS === 'web') {
    if (!canUseWebStorage()) {
      return null;
    }

    const existing = window.localStorage.getItem(STRUCTURED_DATA_KEY);
    if (existing) {
      return existing;
    }

    const next = bytesToHex(globalThis.crypto.getRandomValues(new Uint8Array(64)));
    window.localStorage.setItem(STRUCTURED_DATA_KEY, next);
    return next;
  }

  const existing = await SecureStore.getItemAsync(STRUCTURED_DATA_KEY);
  if (existing) {
    return existing;
  }

  const next = bytesToHex(Crypto.getRandomBytes(64));
  await SecureStore.setItemAsync(STRUCTURED_DATA_KEY, next);
  return next;
}

function encodeEnvelope(envelope: TextEnvelope) {
  return `${ENCRYPTED_TEXT_PREFIX}${JSON.stringify(envelope)}`;
}

function parseEnvelope(value: string) {
  if (!value.startsWith(ENCRYPTED_TEXT_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.slice(ENCRYPTED_TEXT_PREFIX.length)) as TextEnvelope;
    if (parsed.format !== 'pineapple-text' || parsed.version !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isEncryptedStructuredValue(value: unknown) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_TEXT_PREFIX);
}

export async function encryptStructuredValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return value ?? null;
  }

  if (isEncryptedStructuredValue(value)) {
    return value;
  }

  const keyHex = await loadOrCreateStructuredDataKey();
  if (!keyHex) {
    throw new Error('Structured data encryption is unavailable on this platform.');
  }

  const iv = CryptoJS.lib.WordArray.random(16);
  const { encryptionKey, macKey } = createCipherKeys(keyHex);
  const ciphertext = CryptoJS.AES.encrypt(value, encryptionKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(`${ciphertext}.${iv.toString()}`, macKey).toString();

  return encodeEnvelope({
    format: 'pineapple-text',
    version: 1,
    iv: iv.toString(),
    mac,
    ciphertext,
  });
}

export async function decryptStructuredValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return value ?? null;
  }

  const envelope = parseEnvelope(value);
  if (!envelope) {
    return value;
  }

  const keyHex = await loadOrCreateStructuredDataKey();
  if (!keyHex) {
    throw new Error('Structured data decryption is unavailable on this platform.');
  }

  const { encryptionKey, macKey } = createCipherKeys(keyHex);
  const expectedMac = CryptoJS.HmacSHA256(`${envelope.ciphertext}.${envelope.iv}`, macKey).toString();
  if (expectedMac !== envelope.mac) {
    throw new Error('Structured data integrity check failed.');
  }

  const decrypted = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    } as CryptoJS.lib.CipherParams,
    encryptionKey,
    {
      iv: CryptoJS.enc.Hex.parse(envelope.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new Error('Structured data decryption failed.');
  }

  return decrypted;
}

export async function decryptStructuredJson<T>(value: string | null | undefined) {
  const decrypted = await decryptStructuredValue(value);
  if (!decrypted) {
    return null;
  }

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}
