import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  tone?: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger';
};

export function InfoChip({ label, tone = 'default' }: Props) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={[styles.label, labelStyles[tone]]}>{label}</Text>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  default: { backgroundColor: '#FFF9F0', borderColor: colors.border },
  blue: { backgroundColor: '#E7F7FB', borderColor: '#B4E6F2' },
  gold: { backgroundColor: '#FFF2CC', borderColor: '#F1CF74' },
  coral: { backgroundColor: '#FFE9E3', borderColor: '#FFC2B3' },
  success: { backgroundColor: '#E8F5EF', borderColor: '#B6DFC9' },
  danger: { backgroundColor: '#FDECEC', borderColor: '#F3B7B7' },
});

const labelStyles = StyleSheet.create({
  default: { color: colors.nightNavy },
  blue: { color: colors.oceanBlue },
  gold: { color: '#A26B00' },
  coral: { color: colors.sunsetCoral },
  success: { color: colors.success },
  danger: { color: colors.danger },
});

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
