import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { LanguagePicker } from '@/components/LanguagePicker';
import { colors, spacing } from '@/constants/theme';
import { translate } from '@/i18n/strings';
import { useAppStore } from '@/store/useAppStore';
import type { AppLanguage } from '@/types/models';

type LocalStep = 'language' | 'name';

export default function OnboardingScreen() {
  const router = useRouter();
  const saveAppPreferences = useAppStore((state) => state.saveAppPreferences);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const appPreferences = useAppStore((state) => state.data.appPreferences);
  const [step, setStep] = useState<LocalStep>('language');
  const [submitting, setSubmitting] = useState(false);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(appPreferences.appLanguage);
  const [profileName, setProfileName] = useState(appPreferences.profileName);

  const trimmedName = useMemo(() => profileName.trim(), [profileName]);

  async function saveLanguageAndContinue() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await saveAppPreferences({ appLanguage });
      setStep('name');
    } catch (error) {
      if (__DEV__) {
        console.error('Language setup failed', error);
      }
      Alert.alert('Setup could not continue', 'Pineapple could not save your language just now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveNameAndContinue() {
    if (submitting || !trimmedName) {
      return;
    }

    setSubmitting(true);
    try {
      await saveAppPreferences({ appLanguage, profileName: trimmedName });
      await setOnboardingStep('pin');
      router.replace('/setup-pin');
    } catch (error) {
      if (__DEV__) {
        console.error('Name setup failed', error);
      }
      Alert.alert('Setup could not continue', 'Pineapple could not save your name just now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen backgroundColor={colors.authBlue} hideBackgroundDecor footer={
      <View style={styles.footer}>
        {step === 'language' ? (
          <AppButton
            label={translate(appLanguage, 'common.continue')}
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              void saveLanguageAndContinue();
            }}
            loading={submitting}
          />
        ) : (
          <>
            <AppButton
              label={translate(appLanguage, 'common.continue')}
              tone="secondary"
              size="large"
              style={styles.footerButton}
              labelStyle={styles.footerButtonLabel}
              onPress={() => {
                void saveNameAndContinue();
              }}
              loading={submitting}
              disabled={!trimmedName}
            />
            <AppButton
              label={translate(appLanguage, 'common.back')}
              tone="secondary"
              size="large"
              style={styles.footerButton}
              labelStyle={styles.footerButtonLabel}
              onPress={() => setStep('language')}
              disabled={submitting}
            />
          </>
        )}
      </View>
    }>
      <View style={styles.hero}>
        <PineappleMark size={84} />
        <Text style={styles.brand}>Pineapple</Text>
      </View>

      {step === 'language' ? (
        <AppCard>
          <LanguagePicker
            title={translate(appLanguage, 'onboarding.languageTitle')}
            description={translate(appLanguage, 'onboarding.languageBody')}
            value={appLanguage}
            onChange={setAppLanguage}
            showGreetingCycle
          />
        </AppCard>
      ) : null}

      {step === 'name' ? (
        <AppCard>
          <Text style={styles.heading}>{translate(appLanguage, 'onboarding.nameTitle')}</Text>
          <Text style={styles.body}>{translate(appLanguage, 'onboarding.nameBody')}</Text>
          <AppTextField
            label={translate(appLanguage, 'onboarding.nameLabel')}
            value={profileName}
            onChangeText={setProfileName}
            placeholder={translate(appLanguage, 'onboarding.namePlaceholder')}
          />
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
  },
  heading: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
  footerButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  footerButtonLabel: {
    color: colors.white,
  },
});
