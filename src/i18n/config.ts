export type AppLanguage = 'en-GB' | 'en-US' | 'fr-FR' | 'es-ES' | 'de-DE' | 'it-IT';

export type SupportedLanguage = {
  value: AppLanguage;
  flag: string;
  englishLabel: string;
  nativeLabel: string;
  greeting: string;
};

export const defaultAppLanguage: AppLanguage = 'en-GB';

export const supportedLanguages: SupportedLanguage[] = [
  {
    value: 'en-GB',
    flag: '🇬🇧',
    englishLabel: 'English (UK)',
    nativeLabel: 'English',
    greeting: 'Hello',
  },
  {
    value: 'en-US',
    flag: '🇺🇸',
    englishLabel: 'English (US)',
    nativeLabel: 'English',
    greeting: 'Howdy',
  },
  {
    value: 'fr-FR',
    flag: '🇫🇷',
    englishLabel: 'French',
    nativeLabel: 'Français',
    greeting: 'Bonjour',
  },
  {
    value: 'es-ES',
    flag: '🇪🇸',
    englishLabel: 'Spanish',
    nativeLabel: 'Español',
    greeting: 'Hola',
  },
  {
    value: 'de-DE',
    flag: '🇩🇪',
    englishLabel: 'German',
    nativeLabel: 'Deutsch',
    greeting: 'Hallo',
  },
  {
    value: 'it-IT',
    flag: '🇮🇹',
    englishLabel: 'Italian',
    nativeLabel: 'Italiano',
    greeting: 'Ciao',
  },
];

const supportedLanguageMap = new Map(supportedLanguages.map((item) => [item.value, item]));

export function getLanguageMeta(language: AppLanguage) {
  return supportedLanguageMap.get(language) ?? supportedLanguageMap.get(defaultAppLanguage)!;
}

export function resolveAppLanguage(input: string | null | undefined): AppLanguage {
  if (!input) {
    return defaultAppLanguage;
  }

  if (supportedLanguageMap.has(input as AppLanguage)) {
    return input as AppLanguage;
  }

  const normalized = input.toLowerCase();

  if (normalized.startsWith('en-us')) return 'en-US';
  if (normalized.startsWith('en')) return 'en-GB';
  if (normalized.startsWith('fr')) return 'fr-FR';
  if (normalized.startsWith('es')) return 'es-ES';
  if (normalized.startsWith('de')) return 'de-DE';
  if (normalized.startsWith('it')) return 'it-IT';

  return defaultAppLanguage;
}

export function detectAppLanguage() {
  try {
    return resolveAppLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return defaultAppLanguage;
  }
}
