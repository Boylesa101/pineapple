import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'pineapple.onboarding.completed';

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'localStorage' in window;
}

export async function loadOnboardingComplete() {
  if (canUseLocalStorage()) {
    const value = window.localStorage.getItem(ONBOARDING_KEY);
    if (value === null) {
      return null;
    }
    return value === 'true';
  }

  const raw = await SecureStore.getItemAsync(ONBOARDING_KEY);
  if (raw === null) {
    return null;
  }
  return raw === 'true';
}

export async function persistOnboardingComplete(value: boolean) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ONBOARDING_KEY, String(value));
    return;
  }

  await SecureStore.setItemAsync(ONBOARDING_KEY, String(value));
}
