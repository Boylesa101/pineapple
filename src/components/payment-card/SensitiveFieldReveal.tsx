import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  revealed: boolean;
  onToggle: () => void;
};

export function SensitiveFieldReveal({ label, value, revealed, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || 'Not set'}</Text>
      </View>
      <Pressable onPress={onToggle} style={styles.button}>
        <MaterialIcons name={revealed ? 'visibility-off' : 'visibility'} size={18} color={colors.oceanBlue} />
        <Text style={styles.buttonText}>{revealed ? 'Hide' : 'Reveal'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E5D9C8',
    backgroundColor: '#FFF8EF',
  },
  copy: {
    flex: 1,
    gap: 2,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  buttonText: {
    color: colors.oceanBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
