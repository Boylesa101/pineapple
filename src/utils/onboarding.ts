import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { isOnboardingStep, type OnboardingStep } from './onboardingState';

const ONBOARDING_STATE_KEY = 'pineapple.onboarding.state';
const LEGACY_ONBOARDING_KEY = 'pineapple.onboarding.completed';

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

async function getStoredValue(key: string) {
  if (canUseLocalStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function loadOnboardingState() {
  const raw = await getStoredValue(ONBOARDING_STATE_KEY);
  return isOnboardingStep(raw) ? raw : null;
}

export async function persistOnboardingStep(step: OnboardingStep) {
  await Promise.all([
    setStoredValue(ONBOARDING_STATE_KEY, step),
    setStoredValue(LEGACY_ONBOARDING_KEY, String(step === 'complete')),
  ]);
}

export async function loadLegacyOnboardingComplete() {
  const raw = await getStoredValue(LEGACY_ONBOARDING_KEY);
  if (raw === null) {
    return null;
  }

  return raw === 'true';
}
