import { StyleSheet, Text, View } from 'react-native';

import type { VibeCategory } from '@/types/models';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  category: VibeCategory;
  label: string;
};

function palette(category: VibeCategory) {
  switch (category) {
    case 'eat':
      return { backgroundColor: 'rgba(255, 255, 255, 0.2)', textColor: colors.white };
    case 'drink':
      return { backgroundColor: 'rgba(244, 180, 0, 0.22)', textColor: colors.white };
    case 'visit':
      return { backgroundColor: 'rgba(43, 166, 203, 0.22)', textColor: colors.white };
    case 'do':
      return { backgroundColor: 'rgba(255, 122, 89, 0.24)', textColor: colors.white };
    default:
      return { backgroundColor: 'rgba(255, 255, 255, 0.18)', textColor: colors.white };
  }
}

export function VibeCategoryBadge({ category, label }: Props) {
  const tone = palette(category);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text numberOfLines={1} style={[styles.label, { color: tone.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: 132,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
