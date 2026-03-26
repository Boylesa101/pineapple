import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  rating: string | null;
  ranking: string | null;
  inverted?: boolean;
};

export function VibeRatingPill({ rating, ranking, inverted = false }: Props) {
  const textColor = inverted ? colors.white : colors.primaryBlueText;
  const mutedColor = inverted ? 'rgba(255,255,255,0.82)' : colors.textMuted;

  return (
    <View style={[styles.pill, inverted ? styles.pillInverted : null]}>
      <MaterialIcons name="star" size={15} color={colors.pineappleGold} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
          {rating ? `Tripadvisor ${rating}` : 'No rating yet'}
        </Text>
        {ranking ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: mutedColor }]}>
            {ranking}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillInverted: {
    backgroundColor: 'rgba(12, 28, 45, 0.28)',
  },
  copy: {
    maxWidth: 190,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 14,
  },
});
