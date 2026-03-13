import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { ChoiceChips } from '@/components/ChoiceChips';
import { PinPad } from '@/components/PinPad';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function SetupPinScreen() {
  const createPin = useAppStore((state) => state.createPin);
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [saving, setSaving] = useState(false);

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
        .catch(() => Alert.alert('PIN setup failed', 'Please try again.'))
        .finally(() => setSaving(false));
    }
  }, [confirmPin, createPin, pin, pinLength, step]);

  return (
    <AppScreen scroll={false}>
      <View style={styles.hero}>
        <PineappleMark size={96} />
        <Text style={styles.title}>Secure your holiday details</Text>
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
      <View style={styles.pinCard}>
        <Text style={styles.pinTitle}>{step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}</Text>
        <Text style={styles.pinSubtitle}>
          {step === 'create' ? 'Choose a clean, memorable code.' : 'Enter the same PIN again to finish setup.'}
        </Text>
        <PinPad value={step === 'create' ? pin : confirmPin} pinLength={pinLength} onChange={step === 'create' ? setPin : setConfirmPin} />
      </View>
      <AppButton
        label={step === 'create' ? 'Reset entry' : 'Start again'}
        tone="secondary"
        onPress={() => {
          setPin('');
          setConfirmPin('');
          setStep('create');
        }}
        loading={saving}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
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
  pinSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
});
