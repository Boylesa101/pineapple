import { startTransition, useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppScreen } from '@/components/AppScreen';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { canAdvancePinSetup, canConfirmPinSetup } from '@/utils/authFlow';
import { getPostUnlockRoute } from '@/utils/authRoutes';
import { canUseBiometrics } from '@/utils/security';
import { filterVisibleTrips } from '@/utils/tripVisibility';

const MAX_PIN_LENGTH = 12;

export default function SetupPinScreen() {
  const router = useRouter();
  const createPin = useAppStore((state) => state.createPin);
  const tripCount = useAppStore((state) => filterVisibleTrips(state.data.trips).length);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [saving, setSaving] = useState(false);

  const currentValue = step === 'create' ? pin : confirmation;
  const canEnter = useMemo(() => {
    if (step === 'create') {
      return canAdvancePinSetup(pin);
    }

    return canConfirmPinSetup(pin, confirmation);
  }, [confirmation, pin, step]);

  const handleCreateChange = useCallback((value: string) => {
    setPin(value);
  }, []);

  const handleConfirmationChange = useCallback((value: string) => {
    setConfirmation(value);
  }, []);

  const handleCancel = useCallback(() => {
    if (saving) {
      return;
    }

    if (currentValue.length > 0) {
      if (step === 'create') {
        setPin('');
      } else {
        setConfirmation('');
      }
      return;
    }

    if (step === 'confirm') {
      setConfirmation('');
      setStep('create');
      return;
    }

    setPin('');
    router.replace('/onboarding');
  }, [currentValue.length, router, saving, step]);

  const handleEnter = useCallback(async () => {
    if (saving || !canEnter) {
      return;
    }

    if (step === 'create') {
      startTransition(() => {
        setStep('confirm');
      });
      return;
    }

    if (confirmation !== pin) {
      Alert.alert('PINs do not match', 'Enter the same PIN again to finish setup.');
      setConfirmation('');
      setPin('');
      setStep('create');
      return;
    }

    setSaving(true);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await createPin(pin, pin.length);
      const biometricAvailable = await canUseBiometrics();
      router.replace(biometricAvailable ? '/biometric-opt-in' : getPostUnlockRoute(tripCount));
    } catch (error) {
      if (__DEV__) {
        console.error('PIN setup failed', error);
      }
      Alert.alert('PIN setup failed', 'Pineapple could not save that PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [canEnter, confirmation, createPin, pin, router, saving, step, tripCount]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor contentStyle={styles.content}>
      <View style={styles.screen}>
        <View style={styles.topRail}>
          <PineappleMark size={76} />
          <Text style={styles.title}>Let&apos;s get set up</Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? 'Create a PIN with at least 4 digits, then press Enter.'
              : 'Enter the same PIN again to confirm it.'}
          </Text>
        </View>

        <View style={styles.centerRail}>
          <Text style={styles.stepLabel}>{step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}</Text>
          <PinPad
            value={currentValue}
            pinLength={step === 'create' ? Math.max(4, pin.length) : Math.max(pin.length, 4)}
            maxLength={step === 'create' ? MAX_PIN_LENGTH : pin.length || MAX_PIN_LENGTH}
            onChange={step === 'create' ? handleCreateChange : handleConfirmationChange}
            onEnter={() => {
              void handleEnter();
            }}
            onCancel={handleCancel}
            canEnter={canEnter}
            disabled={saving}
            variant="auth"
          />
        </View>

        <View style={styles.bottomRail}>
          <Text style={styles.bottomHint}>Biometric unlock comes next if this device already has fingerprint or face unlock set up.</Text>
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
  bottomRail: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottomHint: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
    textAlign: 'center',
  },
});
