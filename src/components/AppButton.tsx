import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
};

export function AppButton({ label, onPress, icon, tone = 'primary', disabled, loading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        toneStyles[tone],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color={tone === 'primary' ? colors.white : colors.nightNavy} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      {!loading ? <Text style={[styles.label, labelStyles[tone]]}>{label}</Text> : null}
    </Pressable>
  );
}

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.nightNavy,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: '#F8F5EE',
  },
  danger: {
    backgroundColor: '#FDECEC',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.white,
  },
  secondary: {
    color: colors.nightNavy,
  },
  ghost: {
    color: colors.nightNavy,
  },
  danger: {
    color: colors.danger,
  },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
