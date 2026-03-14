import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { ChoiceChips } from '@/components/ChoiceChips';
import { FingerprintIcon } from '@/components/FingerprintIcon';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { canUseBiometrics } from '@/utils/security';

export default function SetupPinScreen() {
  const createPin = useAppStore((state) => state.createPin);
  const updateSecurityPreferences = useAppStore((state) => state.updateSecurityPreferences);
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [saving, setSaving] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsPreferred, setBiometricsPreferred] = useState(true);

  useEffect(() => {
    canUseBiometrics()
      .then(setBiometricsAvailable)
      .catch(() => setBiometricsAvailable(false));
  }, []);

  useEffect(() => {
    if (step === 'create' && pin.length === pinLength) {
      setStep('confirm');
    }
  }, [pin, pinLength, step]);

  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === pinLength) {
      if (confirmPin !== pin) {
        Alert.alert('PINs do not match', 'Please try again.');
        setPin('');
        setConfirmPin('');
        setStep('create');
        return;
      }

      setSaving(true);
      createPin(confirmPin, pinLength)
        .then(async () => {
          if (biometricsAvailable && biometricsPreferred) {
            await updateSecurityPreferences({ biometricEnabled: true });
          }
        })
        .catch(() => Alert.alert('PIN setup failed', 'Please try again.'))
        .finally(() => setSaving(false));
    }
  }, [biometricsAvailable, biometricsPreferred, confirmPin, createPin, pin, pinLength, step, updateSecurityPreferences]);

  return (
    <AppScreen scroll={false} backgroundColor={colors.authBlue} hideBackgroundDecor>
      <View style={styles.hero}>
        <PineappleMark size={96} />
        <Text style={styles.title}>Let&apos;s get set up</Text>
        <Text style={styles.subtitle}>
          Pineapple keeps everything on-device first. Create a PIN to protect documents, plans, and emergency info.
        </Text>
      </View>
      <ChoiceChips
        value={String(pinLength) as '4' | '6'}
        onChange={(value) => {
          setPin('');
          setConfirmPin('');
          setStep('create');
          setPinLength(Number(value) as 4 | 6);
        }}
        options={[
          { label: '4-digit PIN', value: '4' },
          { label: '6-digit PIN', value: '6' },
        ]}
      />
      {biometricsAvailable ? (
        <View style={styles.preferenceCard}>
          <View style={styles.preferenceHeader}>
            <View style={styles.fingerprintWrap}>
              <FingerprintIcon size={34} color={colors.authBlue} />
            </View>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>Biometric unlock</Text>
              <Text style={styles.preferenceSubtitle}>Use fingerprint or face unlock after your PIN is created.</Text>
            </View>
          </View>
          <ChoiceChips<'on' | 'off'>
            value={biometricsPreferred ? 'on' : 'off'}
            onChange={(value) => setBiometricsPreferred(value === 'on')}
            options={[
              { label: 'Enable', value: 'on' },
              { label: 'Skip', value: 'off' },
            ]}
          />
        </View>
      ) : null}
      <View style={styles.pinCard}>
        <Text style={styles.pinTitle}>{step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}</Text>
        <Text style={styles.pinSubtitle}>
          {step === 'create' ? 'Choose a clean, memorable code.' : 'Enter the same PIN again to finish setup.'}
        </Text>
        <PinPad value={step === 'create' ? pin : confirmPin} pinLength={pinLength} onChange={step === 'create' ? setPin : setConfirmPin} />
      </View>
      <Pressable
        onPress={() => {
          setPin('');
          setConfirmPin('');
          setStep('create');
        }}
        style={styles.resetButton}
      >
        <Text style={styles.resetButtonText}>{step === 'create' ? 'Reset entry' : 'Start again'}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  pinCard: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  preferenceCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fingerprintWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceCopy: {
    flex: 1,
    gap: 2,
  },
  preferenceTitle: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  preferenceSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  pinTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  pinSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  resetButton: {
    alignSelf: 'center',
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
