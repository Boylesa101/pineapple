import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  value: string;
  pinLength: number;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onCancel?: () => void;
  canEnter?: boolean;
  maxLength?: number;
  disabled?: boolean;
  variant?: 'default' | 'auth';
};

const defaultRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
] as const;

const authRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['enter', '0', 'cancel'],
] as const;

type PinKeyProps = {
  label: string;
  isAction?: boolean;
  disabled?: boolean;
  onPress: (key: string) => void;
};

const PinKey = memo(function PinKey({ label, isAction = false, disabled = false, onPress }: PinKeyProps) {
  return (
    <Pressable
      onPressIn={() => onPress(label)}
      style={[styles.key, isAction ? styles.actionKey : null, disabled ? styles.keyDisabled : null]}
      disabled={disabled}
      hitSlop={6}
    >
      <Text style={[styles.keyLabel, isAction ? styles.actionKeyLabel : null, disabled ? styles.keyLabelDisabled : null]}>
        {label === 'enter' ? 'Enter' : label === 'cancel' ? 'Cancel' : label}
      </Text>
    </Pressable>
  );
});

function PinPadComponent({
  value,
  pinLength,
  onChange,
  onEnter,
  onCancel,
  canEnter = false,
  maxLength,
  disabled = false,
  variant = 'default',
}: Props) {
  const dots = useMemo(() => Array.from({ length: Math.max(pinLength, value.length, 4) }), [pinLength, value.length]);
  const rows = variant === 'auth' ? authRows : defaultRows;

  const handlePress = useCallback((key: string) => {
    if (!key || disabled) return;
    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === 'enter') {
      if (canEnter) {
        onEnter?.();
      }
      return;
    }
    if (key === 'cancel') {
      onCancel?.();
      return;
    }
    if (maxLength && value.length >= maxLength) return;
    onChange(`${value}${key}`);
  }, [canEnter, disabled, maxLength, onCancel, onChange, onEnter, value]);

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
              const isAction = digit === 'enter' || digit === 'cancel';
              const actionDisabled = digit === 'enter' ? !canEnter || disabled : disabled;

              if (!digit) {
                return <View key={cellKey} style={styles.keySpacer} />;
              }

              return (
                <PinKey
                  key={cellKey}
                  label={digit}
                  isAction={isAction}
                  disabled={actionDisabled}
                  onPress={handlePress}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const PinPad = memo(PinPadComponent);

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
    width: 82,
    height: 66,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionKey: {
    paddingHorizontal: spacing.sm,
  },
  keySpacer: {
    width: 82,
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
  actionKeyLabel: {
    fontSize: 14,
  },
  keyLabelDisabled: {
    color: '#87CFF7',
  },
});
