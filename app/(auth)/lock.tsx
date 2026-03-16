import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function LockScreen() {
  const router = useRouter();
  const security = useAppStore((state) => state.security);
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

  async function handleEnter() {
    if (!canEnter || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const valid = await unlockWithPin(pin);
      if (valid) {
        return;
      }

      const latestBlockedUntil = useAppStore.getState().unlockBlockedUntil;
      const latestBlockedSeconds = latestBlockedUntil ? Math.max(0, Math.ceil((latestBlockedUntil - Date.now()) / 1000)) : 0;
      Alert.alert(
        latestBlockedSeconds > 0 ? 'Too many attempts' : 'Incorrect PIN',
        latestBlockedSeconds > 0 ? `Wait ${latestBlockedSeconds} seconds before trying again.` : 'Please try again.'
      );
      setPin('');
    } catch (error) {
      if (__DEV__) {
        console.error('PIN unlock failed', error);
      }
      Alert.alert('Unlock failed', 'Pineapple could not complete unlock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (submitting) {
      return;
    }

    if (pin.length > 0) {
      setPin('');
      return;
    }

    router.replace('/');
  }

  async function handleBiometricUnlock() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const unlocked = await unlockWithBiometrics('app');
      if (!unlocked) {
        return;
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Biometric unlock failed', error);
      }
      Alert.alert('Biometric unlock unavailable', 'Use your PIN to unlock Pineapple on this device.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor contentStyle={styles.content}>
      <View style={styles.screen}>
        <View style={styles.topRail}>
          <PineappleMark size={76} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Enter your PIN, or use biometrics if it is enabled on this device.</Text>
        </View>

        <View style={styles.centerRail}>
          <Text style={styles.stepLabel}>Enter your PIN</Text>
          {blockedSeconds > 0 ? <Text style={styles.blockedText}>Locked for {blockedSeconds}s after repeated failed attempts.</Text> : null}
          <PinPad
            value={pin}
            pinLength={security.pinLength}
            maxLength={security.pinLength}
            onChange={setPin}
            onEnter={handleEnter}
            onCancel={handleCancel}
            canEnter={canEnter}
            disabled={submitting || blockedSeconds > 0}
            variant="auth"
          />
        </View>

        <View style={styles.bottomRail}>
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
    width: '100%',
  },
  topRail: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
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
  centerRail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
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
  bottomRail: {
    minHeight: 180,
    gap: spacing.lg,
    justifyContent: 'center',
    width: '100%',
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
});
