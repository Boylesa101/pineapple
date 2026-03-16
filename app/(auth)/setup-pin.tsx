import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { canAdvancePinSetup, canConfirmPinSetup } from '@/utils/authFlow';
import { canUseBiometrics } from '@/utils/security';

const MAX_PIN_LENGTH = 12;

export default function SetupPinScreen() {
  const router = useRouter();
  const createPin = useAppStore((state) => state.createPin);
  const updateSecurityPreferences = useAppStore((state) => state.updateSecurityPreferences);
  const tripCount = useAppStore((state) => state.data.trips.length);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [saving, setSaving] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsPreferred, setBiometricsPreferred] = useState(true);

  useEffect(() => {
    canUseBiometrics()
      .then(setBiometricsAvailable)
      .catch(() => setBiometricsAvailable(false));
  }, []);

  const currentValue = step === 'create' ? pin : confirmation;
  const canEnter = useMemo(() => {
    if (step === 'create') {
      return canAdvancePinSetup(pin);
    }

    return canConfirmPinSetup(pin, confirmation);
  }, [confirmation, pin, step]);

  function handleCancel() {
    if (saving) {
      return;
    }

    if (step === 'confirm') {
      setConfirmation('');
      setStep('create');
      return;
    }

    setPin('');
    router.replace('/');
  }

  async function handleEnter() {
    if (saving || !canEnter) {
      return;
    }

    if (step === 'create') {
      setStep('confirm');
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
      await createPin(pin, pin.length);
      await updateSecurityPreferences({ biometricEnabled: biometricsAvailable && biometricsPreferred });
      router.replace(tripCount === 0 ? '/create-first-trip' : '/home');
    } catch {
      Alert.alert('PIN setup failed', 'Pineapple could not save that PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
            onChange={step === 'create' ? setPin : setConfirmation}
            disabled={saving}
          />
        </View>

        <View style={styles.bottomRail}>
          {biometricsAvailable ? (
            <Pressable
              onPress={() => setBiometricsPreferred((value) => !value)}
              style={styles.biometricButton}
              disabled={saving}
            >
              <View style={[styles.biometricIconWrap, biometricsPreferred ? styles.biometricIconWrapActive : null]}>
                <FingerprintIcon size={34} color={colors.authBlue} />
              </View>
              <Text style={styles.biometricText}>{biometricsPreferred ? 'Biometric unlock on' : 'Biometric unlock off'}</Text>
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
              onPress={handleCancel}
              disabled={saving}
            />
            <AppButton
              label="Enter"
              tone="secondary"
              size="large"
              style={styles.actionButton}
              labelStyle={styles.actionLabel}
              onPress={handleEnter}
              disabled={!canEnter}
              loading={saving}
            />
          </View>
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
  biometricIconWrapActive: {
    borderColor: colors.pineappleGold,
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
