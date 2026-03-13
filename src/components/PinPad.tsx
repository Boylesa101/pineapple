import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  value: string;
  pinLength: number;
  onChange: (value: string) => void;
};

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

export function PinPad({ value, pinLength, onChange }: Props) {
  const dots = useMemo(() => Array.from({ length: pinLength }), [pinLength]);

  function handlePress(key: string) {
    if (!key) return;
    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= pinLength) return;
    onChange(`${value}${key}`);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.dotsRow}>
        {dots.map((_, index) => (
          <View key={index} style={[styles.dot, value[index] ? styles.dotFilled : null]} />
        ))}
      </View>
      <View style={styles.grid}>
        {digits.map((digit, index) => (
          <Pressable key={`${digit}-${index}`} onPress={() => handlePress(digit)} style={styles.key}>
            {digit === 'delete' ? (
              <MaterialIcons name="backspace" size={24} color={colors.nightNavy} />
            ) : (
              <Text style={styles.keyLabel}>{digit}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 14,
    width: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dotFilled: {
    backgroundColor: colors.nightNavy,
    borderColor: colors.nightNavy,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  key: {
    width: 88,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyLabel: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
  },
});
