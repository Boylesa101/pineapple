import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function LockScreen() {
  const router = useRouter();
  const security = useAppStore((state) => state.security);
  const tripCount = useAppStore((state) => state.data.trips.length);
  const unlockWithPin = useAppStore((state) => state.unlockWithPin);
  const unlockWithBiometrics = useAppStore((state) => state.unlockWithBiometrics);
  const unlockBlockedUntil = useAppStore((state) => state.unlockBlockedUntil);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const blockedSeconds = unlockBlockedUntil ? Math.max(0, Math.ceil((unlockBlockedUntil - Date.now()) / 1000)) : 0;
  const canEnter = useMemo(
    () => pin.length === security.pinLength && blockedSeconds === 0,
    [blockedSeconds, pin.length, security.pinLength]
  );

  const nextRoute = tripCount === 0 ? '/create-first-trip' : '/home';

  async function handleEnter() {
    if (!canEnter || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const valid = await unlockWithPin(pin);
      if (valid) {
        router.replace(nextRoute);
        return;
      }

      const latestBlockedUntil = useAppStore.getState().unlockBlockedUntil;
      const latestBlockedSeconds = latestBlockedUntil ? Math.max(0, Math.ceil((latestBlockedUntil - Date.now()) / 1000)) : 0;
      Alert.alert(
        latestBlockedSeconds > 0 ? 'Too many attempts' : 'Incorrect PIN',
        latestBlockedSeconds > 0 ? `Wait ${latestBlockedSeconds} seconds before trying again.` : 'Please try again.'
      );
      setPin('');
    } catch {
      Alert.alert('Unlock failed', 'Pineapple could not complete unlock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBiometricUnlock() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const unlocked = await unlockWithBiometrics('app');
      if (unlocked) {
        router.replace(nextRoute);
      }
    } catch {
      Alert.alert('Biometric unlock unavailable', 'Use your PIN to unlock Pineapple on this device.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor>
      <View style={styles.screen}>
        <View style={styles.top}>
          <PineappleMark size={76} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Enter your PIN, or use biometrics if it is enabled on this device.</Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.stepLabel}>Enter your PIN</Text>
          {blockedSeconds > 0 ? <Text style={styles.blockedText}>Locked for {blockedSeconds}s after repeated failed attempts.</Text> : null}
          <PinPad
            value={pin}
            pinLength={security.pinLength}
            maxLength={security.pinLength}
            onChange={setPin}
            disabled={submitting || blockedSeconds > 0}
          />
        </View>

        <View style={styles.footer}>
          {security.biometricEnabled ? (
            <Pressable onPress={handleBiometricUnlock} style={styles.biometricButton} disabled={submitting}>
              <View style={styles.biometricIconWrap}>
                <FingerprintIcon size={34} color={colors.authBlue} />
              </View>
              <Text style={styles.biometricText}>Use biometrics</Text>
            </Pressable>
          ) : (
            <View style={styles.biometricSpacer} />
          )}

          <View style={styles.actions}>
            <AppButton
              label="Cancel"
              tone="secondary"
              size="large"
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={() => {
                setPin('');
                router.replace('/');
              }}
              disabled={submitting}
            />
            <AppButton
              label="Enter"
              tone="secondary"
              size="large"
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={handleEnter}
              disabled={!canEnter}
              loading={submitting}
            />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stepLabel: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    textAlign: 'center',
  },
  blockedText: {
    color: '#FFF1A8',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  biometricButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  biometricIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  biometricText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  biometricSpacer: {
    height: 92,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderColor: colors.white,
  },
  actionLabel: {
    color: colors.authBlue,
    fontSize: 17,
  },
});
