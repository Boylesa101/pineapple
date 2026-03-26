import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
};

export function VibesEmptyState({ icon, title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={24} color={colors.primaryBlue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
