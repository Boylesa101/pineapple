import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type { PinLength, StoredSecurityConfig } from '@/types/models';

const SECURITY_KEY = 'pineapple.security';

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

export const defaultSecurityConfig: StoredSecurityConfig = {
  pinConfigured: false,
  pinLength: 4,
  hashVersion: 2,
  salt: '',
  hash: '',
  biometricEnabled: false,
  autoLockSeconds: 90,
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(value: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function hashPinV1(pin: string, salt: string) {
  return sha256(`${salt}:${pin}`);
}

async function hashPinV2(pin: string, salt: string) {
  let digest = `${salt}:${pin}`;
  for (let round = 0; round < 12000; round += 1) {
    digest = await sha256(`${salt}:${digest}`);
  }
  return digest;
}

export async function loadSecurityConfig() {
  if (canUseWebStorage()) {
    const raw = window.localStorage.getItem(SECURITY_KEY);
    if (!raw) {
      return defaultSecurityConfig;
    }

    try {
      return { ...defaultSecurityConfig, ...(JSON.parse(raw) as StoredSecurityConfig) };
    } catch {
      return defaultSecurityConfig;
    }
  }

  const raw = await SecureStore.getItemAsync(SECURITY_KEY);
  if (!raw) {
    return defaultSecurityConfig;
  }

  try {
    return { ...defaultSecurityConfig, ...(JSON.parse(raw) as StoredSecurityConfig) };
  } catch {
    return defaultSecurityConfig;
  }
}

export async function persistSecurityConfig(config: StoredSecurityConfig) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(SECURITY_KEY, JSON.stringify(config));
    return;
  }

  await SecureStore.setItemAsync(SECURITY_KEY, JSON.stringify(config));
}

export async function clearSecurityConfig() {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(SECURITY_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SECURITY_KEY);
}

export async function createPinConfig(pin: string, pinLength: PinLength) {
  const salt = bytesToHex(Crypto.getRandomBytes(16));
  const hash = await hashPinV2(pin, salt);

  return {
    ...defaultSecurityConfig,
    pinConfigured: true,
    pinLength,
    hashVersion: 2,
    salt,
    hash,
  } satisfies StoredSecurityConfig;
}

export async function verifyPin(pin: string, config: StoredSecurityConfig) {
  if (!config.pinConfigured || !config.salt || !config.hash) {
    return false;
  }

  const candidate =
    config.hashVersion === 1 ? await hashPinV1(pin, config.salt) : await hashPinV2(pin, config.salt);
  return candidate === config.hash;
}

export async function canUseBiometrics() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

export async function authenticateBiometrics() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Pineapple',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
}
