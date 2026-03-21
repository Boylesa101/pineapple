import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { getPostUnlockRoute } from '@/utils/authRoutes';
import { authenticateBiometrics, canUseBiometrics } from '@/utils/security';
import { filterVisibleTrips } from '@/utils/tripVisibility';

export default function BiometricOptInScreen() {
  const router = useRouter();
  const tripCount = useAppStore((state) => filterVisibleTrips(state.data.trips).length);
  const updateSecurityPreferences = useAppStore((state) => state.updateSecurityPreferences);
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
        router.replace(getPostUnlockRoute(tripCount));
        return;
      }

      setAvailabilityChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router, tripCount, updateSecurityPreferences]);

  async function finishSetup(enableBiometrics: boolean) {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      if (enableBiometrics) {
        const result = await authenticateBiometrics();
        if (!result.success) {
          Alert.alert('Biometrics unavailable', 'Pineapple kept your PIN as the unlock method for now.');
          await updateSecurityPreferences({ biometricEnabled: false });
          router.replace(getPostUnlockRoute(tripCount));
          return;
        }
      }

      await updateSecurityPreferences({ biometricEnabled: enableBiometrics });
      router.replace(getPostUnlockRoute(tripCount));
    } catch (error) {
      if (__DEV__) {
        console.error('Biometric setup failed', error);
      }
      Alert.alert('Setup could not continue', 'Pineapple could not finish biometric setup. Your PIN is still ready to use.');
      await updateSecurityPreferences({ biometricEnabled: false });
      router.replace(getPostUnlockRoute(tripCount));
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
          <Text style={styles.title}>Use fingerprint or face unlock on this device?</Text>
          <Text style={styles.body}>
            {availabilityChecked
              ? 'Your PIN stays as the fallback. Turn on biometrics now, or keep going and enable it later in Settings.'
              : 'Checking biometric support on this device.'}
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Enable biometrics"
            size="large"
            onPress={() => {
              void finishSetup(true);
            }}
            loading={submitting}
            disabled={!availabilityChecked || submitting}
          />
          <AppButton
            label="Not now"
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
