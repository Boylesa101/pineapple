import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppScreen } from '@/components/AppScreen';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { canAdvancePinSetup, canConfirmPinSetup } from '@/utils/authFlow';
import { canUseBiometrics } from '@/utils/security';

const MAX_PIN_LENGTH = 12;

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export default function SetupPinScreen() {
  const router = useRouter();
  const createPin = useAppStore((state) => state.createPin);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const { t } = useTranslation();
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
      setStep('confirm');
      return;
    }

    if (confirmation !== pin) {
      Alert.alert(t('setupPin.mismatchTitle'), t('setupPin.mismatchBody'));
      setConfirmation('');
      setPin('');
      setStep('create');
      return;
    }

    setSaving(true);

    try {
      await nextFrame();
      await nextFrame();
      await createPin(pin, pin.length);
      const biometricAvailable = await canUseBiometrics();
      await setOnboardingStep(biometricAvailable ? 'biometrics' : 'traveller_setup');
      router.replace(biometricAvailable ? '/biometric-opt-in' : '/traveller-setup');
    } catch (error) {
      if (__DEV__) {
        console.error('PIN setup failed', error);
      }
      Alert.alert(t('setupPin.errorTitle'), t('setupPin.errorBody'));
    } finally {
      setSaving(false);
    }
  }, [canEnter, confirmation, createPin, pin, router, saving, setOnboardingStep, step, t]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor contentStyle={styles.content}>
      <View style={styles.screen}>
        <View style={styles.topRail}>
          <PineappleMark size={76} />
          <Text style={styles.title}>{t('setupPin.title')}</Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? t('setupPin.createBody')
              : t('setupPin.confirmBody')}
          </Text>
        </View>

        <View style={styles.centerRail}>
          <Text style={styles.stepLabel}>
            {saving ? t('setupPin.savingLabel') : step === 'create' ? t('setupPin.createLabel') : t('setupPin.confirmLabel')}
          </Text>
          {saving ? <ActivityIndicator size="small" color={colors.white} /> : null}
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
          <Text style={styles.bottomHint}>{t('setupPin.hint')}</Text>
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
