import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
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
    <AppScreen scroll={false}>
      <View style={styles.hero}>
        <PineappleMark size={92} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Unlock your trips, documents, and quick-access travel mode.</Text>
      </View>
      <View style={styles.pinCard}>
        <Text style={styles.pinTitle}>Enter your PIN</Text>
        {blockedSeconds > 0 ? <Text style={styles.blockedText}>Locked for {blockedSeconds}s after repeated failed attempts.</Text> : null}
        <PinPad value={pin} pinLength={security.pinLength} onChange={setPin} />
      </View>
      {security.biometricEnabled ? (
        <AppButton
          label="Use biometrics"
          tone="secondary"
          onPress={() => unlockWithBiometrics('app')}
          loading={submitting}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  pinCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pinTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    textAlign: 'center',
  },
  blockedText: {
    color: colors.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
});
