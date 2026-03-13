import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type { PinLength, StoredSecurityConfig } from '@/types/models';

const SECURITY_KEY = 'pineapple.security';

export const defaultSecurityConfig: StoredSecurityConfig = {
  pinConfigured: false,
  pinLength: 4,
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

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function loadSecurityConfig() {
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
  await SecureStore.setItemAsync(SECURITY_KEY, JSON.stringify(config));
}

export async function createPinConfig(pin: string, pinLength: PinLength) {
  const salt = bytesToHex(Crypto.getRandomBytes(16));
  const hash = await hashPin(pin, salt);

  return {
    ...defaultSecurityConfig,
    pinConfigured: true,
    pinLength,
    salt,
    hash,
  } satisfies StoredSecurityConfig;
}

export async function verifyPin(pin: string, config: StoredSecurityConfig) {
  if (!config.pinConfigured || !config.salt || !config.hash) {
    return false;
  }

  const candidate = await hashPin(pin, config.salt);
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
