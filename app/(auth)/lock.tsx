import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function LockScreen() {
  const { security, unlockWithPin, unlockWithBiometrics, unlockBlockedUntil } = useAppStore();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const blockedSeconds = unlockBlockedUntil ? Math.max(0, Math.ceil((unlockBlockedUntil - Date.now()) / 1000)) : 0;

  useEffect(() => {
    if (pin.length !== security.pinLength) {
      return;
    }

    setSubmitting(true);
    unlockWithPin(pin)
      .then((valid) => {
        if (!valid) {
          Alert.alert(
            blockedSeconds > 0 ? 'Too many attempts' : 'Incorrect PIN',
            blockedSeconds > 0 ? `Wait ${blockedSeconds} seconds before trying again.` : 'Try again.'
          );
          setPin('');
        }
      })
      .finally(() => setSubmitting(false));
  }, [blockedSeconds, pin, security.pinLength, unlockWithPin]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor>
      <View style={styles.hero}>
        <PineappleMark size={92} />
        <Text style={styles.title}>Welcome back</Text>
      </View>
      <View style={styles.pinCard}>
        <Text style={styles.pinTitle}>Enter your PIN</Text>
        {blockedSeconds > 0 ? <Text style={styles.blockedText}>Locked for {blockedSeconds}s after repeated failed attempts.</Text> : null}
        <PinPad value={pin} pinLength={security.pinLength} onChange={setPin} />
      </View>
      {security.biometricEnabled ? (
        <Pressable onPress={() => unlockWithBiometrics('app')} style={styles.biometricButton} disabled={submitting}>
          <View style={styles.biometricIconWrap}>
            <FingerprintIcon size={32} color={colors.authBlue} />
          </View>
          <Text style={styles.biometricButtonText}>Use biometrics</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  pinCard: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  pinTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  blockedText: {
    color: '#FFF1A8',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  biometricButton: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  biometricIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricButtonText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
