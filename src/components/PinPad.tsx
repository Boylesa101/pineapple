import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  value: string;
  pinLength: number;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
};

const rows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
] as const;

export function PinPad({ value, pinLength, onChange, maxLength, disabled = false }: Props) {
  const dots = useMemo(() => Array.from({ length: Math.max(pinLength, value.length, 4) }), [pinLength, value.length]);

  function handlePress(key: string) {
    if (!key || disabled) return;
    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }
    if (maxLength && value.length >= maxLength) return;
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
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((digit, index) => {
              const cellKey = `${digit || 'empty'}-${rowIndex}-${index}`;

              if (!digit) {
                return <View key={cellKey} style={styles.keySpacer} />;
              }

              return (
                <Pressable key={cellKey} onPress={() => handlePress(digit)} style={[styles.key, disabled ? styles.keyDisabled : null]}>
                  {digit === 'delete' ? (
                    <MaterialIcons name="backspace" size={22} color={disabled ? '#87CFF7' : colors.authBlue} />
                  ) : (
                    <Text style={[styles.keyLabel, disabled ? styles.keyLabelDisabled : null]}>{digit}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.md,
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
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  dotFilled: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  grid: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  key: {
    width: 66,
    height: 66,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keySpacer: {
    width: 66,
    height: 66,
  },
  keyDisabled: {
    opacity: 0.55,
  },
  keyLabel: {
    color: colors.authBlue,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 21,
  },
  keyLabelDisabled: {
    color: '#87CFF7',
  },
});
