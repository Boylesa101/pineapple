import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { authenticateBiometrics, canUseBiometrics } from '@/utils/security';

export default function BiometricOptInScreen() {
  const router = useRouter();
  const updateSecurityPreferences = useAppStore((state) => state.updateSecurityPreferences);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void canUseBiometrics().then((available) => {
      if (cancelled) {
        return;
      }

      if (!available && !cancelled) {
        void updateSecurityPreferences({ biometricEnabled: false });
        void setOnboardingStep('traveller_setup');
        router.replace('/traveller-setup');
        return;
      }

      setAvailabilityChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router, setOnboardingStep, updateSecurityPreferences]);

  async function finishSetup(enableBiometrics: boolean) {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      if (enableBiometrics) {
        const result = await authenticateBiometrics();
        if (!result.success) {
          Alert.alert(t('biometrics.unavailableTitle'), t('biometrics.unavailableBody'));
          await updateSecurityPreferences({ biometricEnabled: false });
          await setOnboardingStep('traveller_setup');
          router.replace('/traveller-setup');
          return;
        }
      }

      await updateSecurityPreferences({ biometricEnabled: enableBiometrics });
      await setOnboardingStep('traveller_setup');
      router.replace('/traveller-setup');
    } catch (error) {
      if (__DEV__) {
        console.error('Biometric setup failed', error);
      }
      Alert.alert(t('biometrics.errorTitle'), t('biometrics.errorBody'));
      await updateSecurityPreferences({ biometricEnabled: false });
      await setOnboardingStep('traveller_setup');
      router.replace('/traveller-setup');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor contentStyle={styles.content}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <PineappleMark size={72} />
          <View style={styles.iconWrap}>
          <FingerprintIcon size={42} color={colors.authBlue} />
          </View>
          <Text style={styles.title}>{t('biometrics.title')}</Text>
          <Text style={styles.body}>
            {availabilityChecked
              ? t('biometrics.body')
              : t('biometrics.checking')}
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            label={t('biometrics.enable')}
            size="large"
            onPress={() => {
              void finishSetup(true);
            }}
            loading={submitting}
            disabled={!availabilityChecked || submitting}
          />
          <AppButton
            label={t('biometrics.notNow')}
            tone="secondary"
            size="large"
            onPress={() => {
              void finishSetup(false);
            }}
            disabled={!availabilityChecked || submitting}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.68)',
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
