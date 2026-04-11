import { getLanguageMeta } from '@/i18n/config';
import { translate, type TranslationKey } from '@/i18n/strings';
import { useAppStore } from '@/store/useAppStore';

export function useTranslation() {
  const language = useAppStore((state) => state.data.appPreferences.appLanguage);

  return {
    language,
    languageMeta: getLanguageMeta(language),
    t: (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values),
  };
}
