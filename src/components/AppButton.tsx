import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'default' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  label,
  onPress,
  icon,
  tone = 'primary',
  size = 'default',
  disabled,
  loading,
  style,
  labelStyle,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        toneStyles[tone],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={tone === 'primary' || tone === 'danger' ? colors.white : colors.primaryBlue} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      {!loading ? <Text style={[styles.label, labelStyles[tone], labelStyle]}>{label}</Text> : null}
    </Pressable>
  );
}

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primaryBlue,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CFE2FF',
  },
  ghost: {
    backgroundColor: colors.primaryBlueSurface,
  },
  danger: {
    backgroundColor: colors.dangerRed,
  },
  outline: {
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#CFE2FF',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.white,
  },
  secondary: {
    color: colors.primaryBlue,
  },
  ghost: {
    color: colors.primaryBlue,
  },
  danger: {
    color: colors.white,
  },
  outline: {
    color: colors.primaryBlue,
  },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.mdSm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const sizeStyles = StyleSheet.create({
  default: {},
  large: {
    minHeight: 58,
    paddingHorizontal: spacing.xl,
  },
});
