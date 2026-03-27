import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { VibeCategoryBadge } from '@/components/vibes/VibeCategoryBadge';
import { VibeRatingPill } from '@/components/vibes/VibeRatingPill';
import { VibeSocialLinksRow } from '@/components/vibes/VibeSocialLinksRow';
import type { SavedVibe } from '@/types/models';

type Props = {
  item: SavedVibe;
  onOpen: (url: string) => void;
  onAddToItinerary: () => void;
  onRemove: () => void;
};

export function MoodSavedCard({ item, onOpen, onAddToItinerary, onRemove }: Props) {
  const imageUri = item.imageUrl;

  return (
    <View style={styles.card}>
      <View style={styles.imageShell}>
        {imageUri ? (
          <ManagedFileImage uri={imageUri} style={styles.image} />
        ) : (
          <LinearGradient colors={['#0D6EFD', '#2BA6CB', '#F4B400']} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient colors={['rgba(18,34,54,0.02)', 'rgba(18,34,54,0.68)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.imageTop}>
          <VibeCategoryBadge category={item.category} label={item.displayCategory} />
          <Pressable accessibilityLabel={`Remove ${item.name} from Mood`} onPress={onRemove} style={styles.removeButton}>
            <MaterialIcons name="favorite" size={18} color={colors.sunsetCoral} />
          </Pressable>
        </View>
        <View style={styles.imageBottom}>
          <Text numberOfLines={2} style={styles.name}>
            {item.name}
          </Text>
          <Text numberOfLines={2} style={styles.address}>
            {item.address}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <VibeRatingPill rating={item.rating} ranking={item.ranking} />
        <View style={styles.footerRow}>
          <VibeSocialLinksRow
            tripadvisorUrl={item.tripadvisorUrl}
            websiteUrl={item.websiteUrl}
            onOpen={onOpen}
          />
          <Pressable onPress={onAddToItinerary} style={styles.itineraryButton}>
            <MaterialIcons name="event-available" size={16} color={colors.white} />
            <Text style={styles.itineraryLabel}>Add to itinerary</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageShell: {
    height: 194,
    backgroundColor: colors.primaryBlueSurface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 4,
  },
  name: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
  },
  address: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itineraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  itineraryLabel: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
