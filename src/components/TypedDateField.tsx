import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { isValid } from 'date-fns';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

function formatDisplay(value: string | null) {
  if (!value) {
    return '';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return '';
  }

  return `${match[3]} / ${match[2]} / ${match[1]}`;
}

function formatInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
}

function parseTypedDate(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    !isValid(candidate) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate.toISOString();
}

export function TypedDateField({ label, value, onChange, placeholder = 'DD / MM / YYYY' }: Props) {
  const [inputValue, setInputValue] = useState(formatDisplay(value));
  const [error, setError] = useState<string | null>(null);
  const displayValue = useMemo(() => formatDisplay(value), [value]);

  useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  function handleChangeText(next: string) {
    const formatted = formatInput(next);
    setInputValue(formatted);

    const digits = formatted.replace(/\D/g, '');
    if (!digits.length) {
      setError(null);
      onChange(null);
      return;
    }

    if (digits.length < 8) {
      setError(null);
      return;
    }

    const parsed = parseTypedDate(formatted);
    if (!parsed) {
      setError('Use DD / MM / YYYY');
      onChange(null);
      return;
    }

    setError(null);
    onChange(parsed);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={inputValue}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType="number-pad"
        maxLength={14}
      />
      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.helper}>Type the date directly for faster entry.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.nightNavy,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.dangerRed,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  error: {
    color: colors.dangerRed,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});
