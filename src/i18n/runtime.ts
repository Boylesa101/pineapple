import { defaultAppLanguage, resolveAppLanguage, type AppLanguage } from '@/i18n/config';

let currentAppLanguage: AppLanguage = defaultAppLanguage;

export function setCurrentAppLanguage(language: string | null | undefined) {
  currentAppLanguage = resolveAppLanguage(language);
}

export function getCurrentAppLanguage() {
  return currentAppLanguage;
}
