import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  accent?: string;
};

export function OnboardingIllustration({ icon, accent = colors.pineappleGold }: Props) {
  return (
    <View style={styles.shell}>
      <View style={[styles.blobOne, { backgroundColor: accent }]} />
      <View style={styles.blobTwo} />
      <View style={styles.card}>
        <View style={styles.badge}>
          <MaterialIcons name={icon} size={28} color={colors.nightNavy} />
        </View>
        <View style={styles.lineShort} />
        <View style={styles.lineLong} />
        <Text style={styles.caption}>Pineapple</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.24,
  },
  blobTwo: {
    position: 'absolute',
    right: 32,
    bottom: 34,
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: colors.mistBlue,
    opacity: 0.9,
  },
  card: {
    width: 220,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8B5',
  },
  lineShort: {
    width: '48%',
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: '#FCE8B4',
  },
  lineLong: {
    width: '74%',
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: '#E7EEF5',
  },
  caption: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
