import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  borderColor?: string;
};

export function DocumentMetaRow({ label, value, borderColor = '#E8DAC1' }: Props) {
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
    borderBottomWidth: 1,
    paddingBottom: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
