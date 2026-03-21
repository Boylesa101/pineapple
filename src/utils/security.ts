import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type { PinLength, StoredSecurityConfig } from '@/types/models';
import { getSecureRandomHex } from '@/utils/random';

const SECURITY_KEY = 'pineapple.security';
const PIN_SECRET_KEY = 'pineapple.pin-secret';
const PIN_PBKDF2_ITERATIONS_V3 = 150000;
const PIN_PBKDF2_ITERATIONS_V4 = 90000;

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

export const defaultSecurityConfig: StoredSecurityConfig = {
  pinConfigured: false,
  pinLength: 4,
  hashVersion: 4,
  salt: '',
  hash: '',
  biometricEnabled: false,
  autoLockSeconds: 90,
  failedUnlockAttempts: 0,
  unlockBlockedUntil: null,
};

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

async function hashPinV3(pin: string, salt: string) {
  return CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(salt), {
    keySize: 256 / 32,
    iterations: PIN_PBKDF2_ITERATIONS_V3,
    hasher: CryptoJS.algo.SHA256,
  }).toString(CryptoJS.enc.Hex);
}

async function loadOrCreatePinSecret() {
  if (canUseWebStorage()) {
    const existing = window.localStorage.getItem(PIN_SECRET_KEY);
    if (existing) {
      return existing;
    }

    const next = getSecureRandomHex(32);
    window.localStorage.setItem(PIN_SECRET_KEY, next);
    return next;
  }

  const existing = await SecureStore.getItemAsync(PIN_SECRET_KEY);
  if (existing) {
    return existing;
  }

  const next = getSecureRandomHex(32);
  await SecureStore.setItemAsync(PIN_SECRET_KEY, next);
  return next;
}

async function hashPinV4(pin: string, salt: string) {
  const deviceSecret = await loadOrCreatePinSecret();
  return CryptoJS.PBKDF2(`${deviceSecret}:${pin}`, CryptoJS.enc.Hex.parse(salt), {
    keySize: 256 / 32,
    iterations: PIN_PBKDF2_ITERATIONS_V4,
    hasher: CryptoJS.algo.SHA256,
  }).toString(CryptoJS.enc.Hex);
}

function normalizeSecurityConfig(config: StoredSecurityConfig) {
  const next = {
    ...defaultSecurityConfig,
    ...config,
    failedUnlockAttempts: Number.isFinite(config.failedUnlockAttempts) ? config.failedUnlockAttempts : 0,
    unlockBlockedUntil:
      typeof config.unlockBlockedUntil === 'number' && Number.isFinite(config.unlockBlockedUntil)
        ? config.unlockBlockedUntil
        : null,
  } satisfies StoredSecurityConfig;

  if (next.unlockBlockedUntil && next.unlockBlockedUntil <= Date.now()) {
    next.failedUnlockAttempts = 0;
    next.unlockBlockedUntil = null;
  }

  return next;
}

export async function loadSecurityConfig() {
  if (canUseWebStorage()) {
    const raw = window.localStorage.getItem(SECURITY_KEY);
    if (!raw) {
      return defaultSecurityConfig;
    }

    try {
      return normalizeSecurityConfig(JSON.parse(raw) as StoredSecurityConfig);
    } catch {
      return defaultSecurityConfig;
    }
  }

  const raw = await SecureStore.getItemAsync(SECURITY_KEY);
  if (!raw) {
    return defaultSecurityConfig;
  }

  try {
    return normalizeSecurityConfig(JSON.parse(raw) as StoredSecurityConfig);
  } catch {
    return defaultSecurityConfig;
  }
}

export async function persistSecurityConfig(config: StoredSecurityConfig) {
  const normalized = normalizeSecurityConfig(config);
  if (canUseWebStorage()) {
    window.localStorage.setItem(SECURITY_KEY, JSON.stringify(normalized));
    return;
  }

  await SecureStore.setItemAsync(SECURITY_KEY, JSON.stringify(normalized));
}

export async function clearSecurityConfig() {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(SECURITY_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SECURITY_KEY);
}

export async function createPinConfig(pin: string, pinLength: PinLength) {
  const salt = getSecureRandomHex(16);
  const hash = await hashPinV4(pin, salt);

  return {
    ...defaultSecurityConfig,
    pinConfigured: true,
    pinLength,
    hashVersion: 4,
    salt,
    hash,
  } satisfies StoredSecurityConfig;
}

export async function verifyPin(pin: string, config: StoredSecurityConfig) {
  if (!config.pinConfigured || !config.salt || !config.hash) {
    return false;
  }

  const candidate =
    config.hashVersion === 1
      ? await hashPinV1(pin, config.salt)
      : config.hashVersion === 2
        ? await hashPinV2(pin, config.salt)
        : config.hashVersion === 3
          ? await hashPinV3(pin, config.salt)
          : await hashPinV4(pin, config.salt);
  return candidate === config.hash;
}

export function clearUnlockLockout(config: StoredSecurityConfig): StoredSecurityConfig {
  return normalizeSecurityConfig({
    ...config,
    failedUnlockAttempts: 0,
    unlockBlockedUntil: null,
  });
}

export function getUnlockCooldownMs(failedUnlockAttempts: number) {
  if (failedUnlockAttempts >= 10) {
    return 15 * 60 * 1000;
  }

  if (failedUnlockAttempts >= 8) {
    return 5 * 60 * 1000;
  }

  if (failedUnlockAttempts >= 5) {
    return 30 * 1000;
  }

  return 0;
}

export function registerFailedUnlock(config: StoredSecurityConfig): StoredSecurityConfig {
  const failedUnlockAttempts = Math.max(0, config.failedUnlockAttempts) + 1;
  const cooldownMs = getUnlockCooldownMs(failedUnlockAttempts);

  return normalizeSecurityConfig({
    ...config,
    failedUnlockAttempts,
    unlockBlockedUntil: cooldownMs > 0 ? Date.now() + cooldownMs : null,
  });
}

export async function canUseBiometrics() {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateBiometrics() {
  try {
    return await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Pineapple',
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
  } catch {
    return {
      success: false,
      error: 'biometric_unavailable',
      warning: undefined,
    };
  }
}
